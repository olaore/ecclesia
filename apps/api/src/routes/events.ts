import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, count, gte, lte, asc, or } from "drizzle-orm";
import { churchEventsTable, auditLogsTable } from "@nehemiah/db/schema";
import {
  createChurchEventSchema,
  updateChurchEventSchema,
  bulkCreateChurchEventsSchema,
} from "@nehemiah/core/schemas";
import { verifyJWT, hasRole } from "../middleware/auth";
import { buildAuditDiff } from "../utils/audit";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  jwtPayload: { userId: string; role: string; unitId?: string };
};

const events = new Hono<{ Bindings: Bindings; Variables: Variables }>();

events.use("/*", (c, next) => verifyJWT(c.env.JWT_SECRET)(c, next));

/**
 * GET / — List church events
 *
 * Query params:
 *   month (1-12)
 *   year  (e.g., 2026)
 *   visibility ("public" | "private" — defaults to both for admins)
 */
events.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");

  const month = c.req.query("month");
  const year = c.req.query("year");
  const visibility = c.req.query("visibility");

  const conditions = [];

  // Filter by visibility if requested (and authorized)
  if (visibility === "public" || visibility === "private") {
    conditions.push(eq(churchEventsTable.visibility, visibility));
  } else if (payload.role === "user") {
    // Note: 'user' role is post-MVP, but enforcing it now for safety
    conditions.push(eq(churchEventsTable.visibility, "public"));
  }

  // Filter by month/year if both are provided
  if (month && year) {
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!isNaN(monthNum) && !isNaN(yearNum)) {
      // Start of the month
      const startOfMth = new Date(yearNum, monthNum - 1, 1);
      // End of the month (start of next month minus 1ms)
      const endOfMth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

      // Event overlaps with this month if it starts before the end of the month
      // AND ends after the start of the month
      conditions.push(
        and(
          lte(churchEventsTable.startDate, endOfMth),
          gte(churchEventsTable.endDate, startOfMth)
        )
      );
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(churchEventsTable)
    .where(where);

  const rows = await db
    .select()
    .from(churchEventsTable)
    .where(where)
    .orderBy(asc(churchEventsTable.startDate));

  return c.json({
    success: true,
    data: rows,
    meta: { total },
  });
});

/**
 * GET /:id — Get single event
 */
events.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param("id");
  const payload = c.get("jwtPayload");

  const event = await db
    .select()
    .from(churchEventsTable)
    .where(eq(churchEventsTable.id, id))
    .get();

  if (!event) {
    return c.json({ success: false, error: "Event not found" }, 404);
  }

  if (event.visibility === "private" && payload.role === "user") {
    return c.json({ success: false, error: "Unauthorized" }, 403);
  }

  return c.json({ success: true, data: event });
});

// Admin-only mutation routes
events.use("/*", hasRole(["sysadmin", "superadmin", "admin"]));

/**
 * POST / — Create a single church event
 */
events.post("/", async (c) => {
  const body = await c.req.json();
  const result = createChurchEventSchema.safeParse(body);

  if (!result.success) {
    return c.json({ success: false, error: result.error.message }, 400);
  }

  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");
  const newEventId = crypto.randomUUID();

  const batchResults = await db.batch([
    db.insert(churchEventsTable)
      .values({
        id: newEventId,
        ...result.data,
        createdBy: payload.userId,
      })
      .returning(),
    db.insert(auditLogsTable).values({
      entityType: "church_event",
      entityId: newEventId,
      action: "CREATE",
      adminId: payload.userId,
      changes: JSON.stringify(result.data),
    }),
  ]);

  return c.json({ success: true, data: batchResults[0][0] }, 201);
});

/**
 * POST /bulk — Bulk create multiple church events
 */
events.post("/bulk", async (c) => {
  const body = await c.req.json();
  const result = bulkCreateChurchEventsSchema.safeParse(body);

  if (!result.success) {
    return c.json({ success: false, error: result.error.message }, 400);
  }

  if (result.data.length === 0) {
    return c.json({ success: false, error: "Empty array provided" }, 400);
  }

  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");

  // Prepare batch statements
  const statements = [];
  const insertedEvents = [];

  for (const eventData of result.data) {
    const newEventId = crypto.randomUUID();
    const eventToInsert = {
      id: newEventId,
      ...eventData,
      createdBy: payload.userId,
    };
    insertedEvents.push(eventToInsert);

    statements.push(
      db.insert(churchEventsTable).values(eventToInsert),
      db.insert(auditLogsTable).values({
        entityType: "church_event",
        entityId: newEventId,
        action: "CREATE",
        adminId: payload.userId,
        changes: JSON.stringify(eventData),
      })
    );
  }

  await db.batch(statements as any);

  // Return the count of inserted rows
  return c.json({
    success: true,
    data: { inserted: insertedEvents.length },
    meta: { insertedCount: insertedEvents.length }
  }, 201);
});

/**
 * PATCH /:id — Update an event
 */
events.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const result = updateChurchEventSchema.safeParse(body);

  if (!result.success) {
    return c.json({ success: false, error: result.error.message }, 400);
  }

  const updates = result.data;
  if (Object.keys(updates).length === 0) {
    return c.json({ success: false, error: "No fields to update" }, 400);
  }

  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");

  const existing = await db
    .select()
    .from(churchEventsTable)
    .where(eq(churchEventsTable.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: "Event not found" }, 404);
  }

  // Build JSON diff using the date-safe helper
  const diff = buildAuditDiff(existing as Record<string, unknown>, updates as Record<string, unknown>);

  const batchResults = await db.batch([
    db.update(churchEventsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(churchEventsTable.id, id))
      .returning(),
    db.insert(auditLogsTable).values({
      entityType: "church_event",
      entityId: id,
      action: "UPDATE",
      adminId: payload.userId,
      changes: JSON.stringify(diff),
    }),
  ]);

  return c.json({ success: true, data: batchResults[0][0] });
});

/**
 * DELETE /:id — Hard-delete event
 */
events.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");

  const existing = await db
    .select()
    .from(churchEventsTable)
    .where(eq(churchEventsTable.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: "Event not found" }, 404);
  }

  await db.batch([
    db.delete(churchEventsTable)
      .where(eq(churchEventsTable.id, id)),
    db.insert(auditLogsTable).values({
      entityType: "church_event",
      entityId: id,
      action: "DELETE",
      adminId: payload.userId,
      changes: JSON.stringify(existing),
    }),
  ]);

  return c.json({ success: true, data: { id, deleted: true } });
});

export default events;
