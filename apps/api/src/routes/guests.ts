import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, like, and, count, desc } from "drizzle-orm";
import { guestsTable, membersTable, auditLogsTable } from "@nehemiah/db/schema";
import { createGuestSchema, updateGuestSchema } from "@nehemiah/core/schemas";
import { verifyJWT, hasRole } from "../middleware/auth";
import { buildAuditDiff } from "../utils/audit";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  jwtPayload: { userId: string; role: string; unitId?: string };
};

const guests = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All guest routes require authentication + admin-level role
guests.use("/*", (c, next) => verifyJWT(c.env.JWT_SECRET)(c, next));
guests.use("/*", hasRole(["sysadmin", "superadmin", "admin"]));

/**
 * GET / — List guests (paginated + filterable)
 *
 * Query params:
 *   page     (default 1)
 *   perPage  (default 20, max 100)
 *   name     (fuzzy match on full_name)
 *   status   ("first_time" | "joined")
 */
guests.get("/", async (c) => {
  const db = drizzle(c.env.DB);

  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(c.req.query("perPage")) || 20));
  const offset = (page - 1) * perPage;

  const conditions = [];

  const name = c.req.query("name");
  if (name) conditions.push(like(guestsTable.fullName, `%${name}%`));

  const status = c.req.query("status");
  if (status === "first_time" || status === "joined") {
    conditions.push(eq(guestsTable.status, status));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ total }] = await db
    .select({ total: count() })
    .from(guestsTable)
    .where(where);

  const rows = await db
    .select()
    .from(guestsTable)
    .where(where)
    .orderBy(desc(guestsTable.createdAt))
    .limit(perPage)
    .offset(offset);

  return c.json({
    success: true,
    data: rows,
    meta: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
});

/**
 * GET /:id — Get single guest
 */
guests.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param("id");

  const guest = await db
    .select()
    .from(guestsTable)
    .where(eq(guestsTable.id, id))
    .get();

  if (!guest) {
    return c.json({ success: false, error: "Guest not found" }, 404);
  }

  return c.json({ success: true, data: guest });
});

/**
 * POST / — Log a new visitor
 */
guests.post("/", async (c) => {
  const body = await c.req.json();
  const result = createGuestSchema.safeParse(body);

  if (!result.success) {
    return c.json({ success: false, error: result.error.message }, 400);
  }

  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");
  const newGuestId = crypto.randomUUID();

  const batchResults = await db.batch([
    db.insert(guestsTable)
      .values({
        id: newGuestId,
        ...result.data,
        visitDate: result.data.visitDate ?? undefined,
        status: "first_time",
      })
      .returning(),
    db.insert(auditLogsTable).values({
      entityType: "guest",
      entityId: newGuestId,
      action: "CREATE",
      adminId: payload.userId,
      changes: JSON.stringify(result.data),
    }),
  ]);

  return c.json({ success: true, data: batchResults[0][0] }, 201);
});

/**
 * PATCH /:id — Update guest details (cannot change status)
 */
guests.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const result = updateGuestSchema.safeParse(body);

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
    .from(guestsTable)
    .where(eq(guestsTable.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: "Guest not found" }, 404);
  }

  // Build JSON diff
  const diff = buildAuditDiff(existing as Record<string, unknown>, updates as Record<string, unknown>);

  const batchResults = await db.batch([
    db.update(guestsTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(guestsTable.id, id))
      .returning(),
    db.insert(auditLogsTable).values({
      entityType: "guest",
      entityId: id,
      action: "UPDATE",
      adminId: payload.userId,
      changes: JSON.stringify(diff),
    }),
  ]);

  return c.json({ success: true, data: batchResults[0][0] });
});

/**
 * POST /:id/promote — Promote guest to member
 *
 * Atomically:
 *  1. Insert new member from guest data
 *  2. Update guest status to "joined"
 *  3. Write audit logs for both entities
 */
guests.post("/:id/promote", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");

  const guest = await db
    .select()
    .from(guestsTable)
    .where(eq(guestsTable.id, id))
    .get();

  if (!guest) {
    return c.json({ success: false, error: "Guest not found" }, 404);
  }

  if (guest.status === "joined") {
    return c.json({ success: false, error: "Guest has already been promoted" }, 400);
  }

  const newMemberId = crypto.randomUUID();

  const batchResults = await db.batch([
    // 1. Create member from guest data
    db.insert(membersTable)
      .values({
        id: newMemberId,
        fullName: guest.fullName,
        email: guest.email,
        phone: guest.phone,
        dateJoined: new Date(),
      })
      .returning(),
    // 2. Update guest status to "joined"
    db.update(guestsTable)
      .set({ status: "joined", updatedAt: new Date() })
      .where(eq(guestsTable.id, id)),
    // 3. Audit log for the new member
    db.insert(auditLogsTable).values({
      entityType: "member",
      entityId: newMemberId,
      action: "CREATE",
      adminId: payload.userId,
      changes: JSON.stringify({
        source: "guest_promotion",
        guestId: id,
        fullName: guest.fullName,
        email: guest.email,
        phone: guest.phone,
      }),
    }),
    // 4. Audit log for the guest status change
    db.insert(auditLogsTable).values({
      entityType: "guest",
      entityId: id,
      action: "UPDATE",
      adminId: payload.userId,
      changes: JSON.stringify({
        status: { old: "first_time", new: "joined" },
        promotedToMemberId: newMemberId,
      }),
    }),
  ]);

  return c.json({
    success: true,
    data: {
      member: batchResults[0][0],
      guest: { id, status: "joined" },
    },
  });
});

export default guests;
