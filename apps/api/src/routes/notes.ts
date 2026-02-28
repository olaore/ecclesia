import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, desc } from "drizzle-orm";
import { memberNotesTable, auditLogsTable, membersTable } from "@nehemiah/db/schema";
import { createNoteSchema, updateNoteSchema } from "@nehemiah/core/schemas";
import { verifyJWT, hasRole } from "../middleware/auth";
import { buildAuditDiff } from "../utils/audit";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  jwtPayload: { userId: string; role: string; unitId?: string };
};

const notes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// All routes require authentication + admin-level role
notes.use("/*", (c, next) => verifyJWT(c.env.JWT_SECRET)(c, next));
notes.use("/*", hasRole(["sysadmin", "superadmin", "admin"]));

/**
 * GET /members/:memberId — List all notes for a specific member
 */
notes.get("/members/:memberId", async (c) => {
  const db = drizzle(c.env.DB);
  const memberId = c.req.param("memberId");

  // Optional: verify the member exists first
  const member = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(eq(membersTable.id, memberId))
    .get();

  if (!member) {
    return c.json({ success: false, error: "Member not found" }, 404);
  }

  const rows = await db
    .select()
    .from(memberNotesTable)
    .where(eq(memberNotesTable.memberId, memberId))
    .orderBy(desc(memberNotesTable.createdAt));

  return c.json({
    success: true,
    data: rows,
  });
});

/**
 * POST / — Create a new note
 */
notes.post("/", async (c) => {
  const body = await c.req.json();
  const result = createNoteSchema.safeParse(body);

  if (!result.success) {
    return c.json({ success: false, error: result.error.message }, 400);
  }

  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");

  // Verify member exists
  const member = await db
    .select({ id: membersTable.id })
    .from(membersTable)
    .where(eq(membersTable.id, result.data.memberId))
    .get();

  if (!member) {
    return c.json({ success: false, error: "Member not found" }, 404);
  }

  const newNoteId = crypto.randomUUID();

  const batchResults = await db.batch([
    db.insert(memberNotesTable)
      .values({
        id: newNoteId,
        memberId: result.data.memberId,
        note: result.data.note,
        adminId: payload.userId,
      })
      .returning(),
    db.insert(auditLogsTable).values({
      entityType: "member_note",
      entityId: newNoteId,
      action: "CREATE",
      adminId: payload.userId,
      changes: JSON.stringify({
        memberId: result.data.memberId,
        note: result.data.note,
      }),
    }),
  ]);

  return c.json({ success: true, data: batchResults[0][0] }, 201);
});

/**
 * PATCH /:id — Update a note
 */
notes.patch("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json();
  const result = updateNoteSchema.safeParse(body);

  if (!result.success) {
    return c.json({ success: false, error: result.error.message }, 400);
  }

  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");

  const existing = await db
    .select()
    .from(memberNotesTable)
    .where(eq(memberNotesTable.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: "Note not found" }, 404);
  }

  // Ensure only the author (or a sysadmin/superadmin) can edit the note
  if (existing.adminId !== payload.userId && !["sysadmin", "superadmin"].includes(payload.role)) {
    return c.json({ success: false, error: "You can only edit your own notes" }, 403);
  }

  const updates = result.data;
  const diff = buildAuditDiff(existing as Record<string, unknown>, updates as Record<string, unknown>);

  // Only run if there are actual changes
  if (Object.keys(diff).length === 0) {
    return c.json({ success: true, data: existing });
  }

  const batchResults = await db.batch([
    db.update(memberNotesTable)
      .set({ note: updates.note })
      .where(eq(memberNotesTable.id, id))
      .returning(),
    db.insert(auditLogsTable).values({
      entityType: "member_note",
      entityId: id,
      action: "UPDATE",
      adminId: payload.userId,
      changes: JSON.stringify(diff),
    }),
  ]);

  return c.json({ success: true, data: batchResults[0][0] });
});

/**
 * DELETE /:id — Hard-delete note
 */
notes.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const db = drizzle(c.env.DB);
  const payload = c.get("jwtPayload");

  const existing = await db
    .select()
    .from(memberNotesTable)
    .where(eq(memberNotesTable.id, id))
    .get();

  if (!existing) {
    return c.json({ success: false, error: "Note not found" }, 404);
  }

  // Ensure only the author (or a sysadmin/superadmin) can delete the note
  if (existing.adminId !== payload.userId && !["sysadmin", "superadmin"].includes(payload.role)) {
    return c.json({ success: false, error: "You can only delete your own notes" }, 403);
  }

  await db.batch([
    db.delete(memberNotesTable)
      .where(eq(memberNotesTable.id, id)),
    db.insert(auditLogsTable).values({
      entityType: "member_note",
      entityId: id,
      action: "DELETE",
      adminId: payload.userId,
      changes: JSON.stringify(existing),
    }),
  ]);

  return c.json({ success: true, data: { id, deleted: true } });
});

export default notes;
