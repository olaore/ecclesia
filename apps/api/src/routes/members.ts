import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, like, and, sql, count, desc } from "drizzle-orm";
import { membersTable, auditLogsTable } from "@nehemiah/db/schema";
import { createMemberSchema, updateMemberSchema } from "@nehemiah/core/schemas";
import { verifyJWT, hasRole } from "../middleware/auth";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  jwtPayload: { userId: string; role: string; unitId?: string };
};

const members = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All member routes require authentication + admin-level role
members.use("/*", (c, next) => verifyJWT(c.env.JWT_SECRET)(c, next));
members.use("/*", hasRole(["sysadmin", "superadmin", "admin"]));

/**
 * GET / — List members (paginated + filterable)
 *
 * Query params:
 *   page     (default 1)
 *   perPage  (default 20, max 100)
 *   name     (fuzzy match on full_name)
 *   department
 *   ageGroup
 *   isActive ("true" | "false", default: all)
 */
members.get("/", async (c) => {
  const db = drizzle(c.env.DB);

  const page = Math.max(1, Number(c.req.query("page")) || 1);
  const perPage = Math.min(100, Math.max(1, Number(c.req.query("perPage")) || 20));
  const offset = (page - 1) * perPage;

  // Build filter conditions
  const conditions = [];

  const name = c.req.query("name");
  if (name) conditions.push(like(membersTable.fullName, `%${name}%`));

  const department = c.req.query("department");
  if (department) conditions.push(eq(membersTable.department, department));

  const ageGroup = c.req.query("ageGroup");
  if (ageGroup) conditions.push(eq(membersTable.ageGroup, ageGroup));

  const isActive = c.req.query("isActive");
  if (isActive === "true") conditions.push(eq(membersTable.isActive, true));
  if (isActive === "false") conditions.push(eq(membersTable.isActive, false));

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Get total count
  const [{ total }] = await db
    .select({ total: count() })
    .from(membersTable)
    .where(where);

  // Get paginated results
  const rows = await db
    .select()
    .from(membersTable)
    .where(where)
    .orderBy(desc(membersTable.createdAt))
    .limit(perPage)
    .offset(offset);

  return c.json({
    success: true,
    data: rows,
    meta: {
      page,
      perPage,
      total,
      totalPages: Math.ceil(total / perPage),
    },
  });
});

/**
 * GET /:id — Get single member
 */
members.get("/:id", async (c) => {
  const db = drizzle(c.env.DB);
  const id = c.req.param("id");

  const member = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, id))
    .get();

  if (!member) {
    return c.json({ success: false, error: "Member not found" }, 404);
  }

  return c.json({ success: true, data: member });
});

/**
 * POST / — Create a member
 */
members.post("/", async (c) => {
  const body = await c.req.json();
  const result = createMemberSchema.safeParse(body);

  if (!result.success) {
    return c.json({ success: false, error: result.error.message }, 400);
  }

  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");
  const newMemberId = crypto.randomUUID();

  const batchResults = await db.batch([
    db.insert(membersTable)
      .values({
        id: newMemberId,
        ...result.data,
        dateJoined: result.data.dateJoined ?? undefined,
      })
      .returning(),
    db.insert(auditLogsTable).values({
      entityType: "member",
      entityId: newMemberId,
      action: "CREATE",
      adminId: payload.userId,
      changes: JSON.stringify(result.data),
    })
  ]);

  return c.json({ success: true, data: batchResults[0][0] }, 201);
});

/**
 * PATCH /:id — Update a member
 */
members.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const result = updateMemberSchema.safeParse(body);

  if (!result.success) {
    return c.json({ success: false, error: result.error.message }, 400);
  }

  // Reject empty updates
  const updates = result.data;
  if (Object.keys(updates).length === 0) {
    return c.json({ success: false, error: "No fields to update" }, 400);
  }

  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");

  // Fetch current state for diff
  const existing = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: "Member not found" }, 404);
  }

  // Build a JSON diff of changed fields
  const diff: Record<string, { old: unknown; new: unknown }> = {};
  for (const [key, newVal] of Object.entries(updates)) {
    const oldVal = (existing as Record<string, unknown>)[key];
    if (oldVal !== newVal) {
      diff[key] = { old: oldVal, new: newVal };
    }
  }

  const batchResults = await db.batch([
    db.update(membersTable)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(membersTable.id, id))
      .returning(),
    db.insert(auditLogsTable).values({
      entityType: "member",
      entityId: id,
      action: "UPDATE",
      adminId: payload.userId,
      changes: JSON.stringify(diff),
    })
  ]);

  return c.json({ success: true, data: batchResults[0][0] });
});

/**
 * DELETE /:id — Soft-delete (set isActive = false)
 */
members.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");

  const existing = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: "Member not found" }, 404);
  }

  const batchResults = await db.batch([
    db.update(membersTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(membersTable.id, id))
      .returning(),
    db.insert(auditLogsTable).values({
      entityType: "member",
      entityId: id,
      action: "DELETE",
      adminId: payload.userId,
      changes: JSON.stringify({ isActive: { old: existing.isActive, new: false } }),
    })
  ]);

  return c.json({ success: true, data: batchResults[0][0] });
});

export default members;
