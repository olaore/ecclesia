import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, count, desc, gte, lte } from "drizzle-orm";
import { attendanceEventsTable, auditLogsTable } from "@nehemiah/db/schema";
import { createAttendanceSchema, updateAttendanceSchema } from "@nehemiah/core/schemas";
import { verifyJWT, hasRole } from "../middleware/auth";
import { buildAuditDiff } from "../utils/audit";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  jwtPayload: { userId: string; role: string; unitId?: string };
};

const attendance = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All routes require authentication + admin-level role
attendance.use("/*", (c, next) => verifyJWT(c.env.JWT_SECRET)(c, next));
attendance.use("/*", hasRole(["sysadmin", "superadmin", "admin"]));

/**
 * GET / — List attendance events (paginated + filterable)
 *
 * Query params:
 *   page       (default 1)
 *   perPage    (default 20, max 100)
 *   eventType  ("sunday_service" | "midweek_service" | "special_event")
 *   from       (ISO date string — inclusive start)
 *   to         (ISO date string — inclusive end)
 */
attendance.get("/", async (c) => {
  const db = drizzle(c.env.DB);

  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(c.req.query("perPage")) || 20));
  const offset = (page - 1) * perPage;

  const conditions = [];

  const eventType = c.req.query("eventType");
  if (eventType) conditions.push(eq(attendanceEventsTable.eventType, eventType));

  const from = c.req.query("from");
  if (from) {
    const fromDate = new Date(from);
    if (!isNaN(fromDate.getTime())) {
      conditions.push(gte(attendanceEventsTable.eventDate, fromDate));
    }
  }

  const to = c.req.query("to");
  if (to) {
    const toDate = new Date(to);
    if (!isNaN(toDate.getTime())) {
      conditions.push(lte(attendanceEventsTable.eventDate, toDate));
    }
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(attendanceEventsTable)
    .where(where);

  const rows = await db
    .select()
    .from(attendanceEventsTable)
    .where(where)
    .orderBy(desc(attendanceEventsTable.eventDate))
    .limit(perPage)
    .offset(offset);

  return c.json({
    success: true,
    data: rows,
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
});

/**
 * GET /:id — Get single attendance event
 */
attendance.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param("id");

  const event = await db
    .select()
    .from(attendanceEventsTable)
    .where(eq(attendanceEventsTable.id, id))
    .get();

  if (!event) {
    return c.json({ success: false, error: "Attendance event not found" }, 404);
  }

  return c.json({ success: true, data: event });
});

/**
 * POST / — Record an attendance event
 *
 * Designed for offline-sync: accepts eventDate from client, not server time.
 */
attendance.post("/", async (c) => {
  const body = await c.req.json();
  const result = createAttendanceSchema.safeParse(body);

  if (!result.success) {
    return c.json({ success: false, error: result.error.message }, 400);
  }

  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");
  const newEventId = crypto.randomUUID();

  const batchResults = await db.batch([
    db.insert(attendanceEventsTable)
      .values({
        id: newEventId,
        ...result.data,
        recordedBy: payload.userId,
      })
      .returning(),
    db.insert(auditLogsTable).values({
      entityType: "attendance_event",
      entityId: newEventId,
      action: "CREATE",
      adminId: payload.userId,
      changes: JSON.stringify(result.data),
    }),
  ]);

  return c.json({ success: true, data: batchResults[0][0] }, 201);
});

/**
 * PATCH /:id — Update attendance event
 */
attendance.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const result = updateAttendanceSchema.safeParse(body);

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
    .from(attendanceEventsTable)
    .where(eq(attendanceEventsTable.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: "Attendance event not found" }, 404);
  }

  // Build JSON diff
  const diff = buildAuditDiff(existing as Record<string, unknown>, updates as Record<string, unknown>);

  const batchResults = await db.batch([
    db.update(attendanceEventsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(attendanceEventsTable.id, id))
      .returning(),
    db.insert(auditLogsTable).values({
      entityType: "attendance_event",
      entityId: id,
      action: "UPDATE",
      adminId: payload.userId,
      changes: JSON.stringify(diff),
    }),
  ]);

  return c.json({ success: true, data: batchResults[0][0] });
});

/**
 * DELETE /:id — Hard-delete attendance event
 *
 * Unlike members (soft-delete), attendance events are operational records.
 * The audit log preserves the deletion trail.
 */
attendance.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");

  const existing = await db
    .select()
    .from(attendanceEventsTable)
    .where(eq(attendanceEventsTable.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: "Attendance event not found" }, 404);
  }

  await db.batch([
    db.delete(attendanceEventsTable)
      .where(eq(attendanceEventsTable.id, id)),
    db.insert(auditLogsTable).values({
      entityType: "attendance_event",
      entityId: id,
      action: "DELETE",
      adminId: payload.userId,
      changes: JSON.stringify(existing),
    }),
  ]);

  return c.json({ success: true, data: { id, deleted: true } });
});

export default attendance;
