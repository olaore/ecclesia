import { expect, test, describe, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { sign } from "hono/jwt";
import app from "../index";

const JWT_SECRET = "test-secret-for-vitest";

async function getToken(overrides: Record<string, unknown> = {}) {
  return sign(
    {
      userId: "test-admin-1",
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    },
    JWT_SECRET
  );
}

// Helper to seed a fake member
async function seedMember(id: string = crypto.randomUUID()) {
  await (env as any).DB.prepare(
    "INSERT INTO members (id, full_name, created_at, updated_at) VALUES (?, ?, ?, ?)"
  ).bind(id, "Test Member", Date.now(), Date.now()).run();
  return id;
}

// Helper to post a note
async function createNote(
  token: string,
  memberId: string,
  noteText: string = "Follow up required"
) {
  return app.request("/api/v1/notes", {
    method: "POST",
    body: JSON.stringify({
      memberId,
      note: noteText,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }, env);
}

describe("Member Notes API", () => {
  beforeEach(async () => {
    const tables = [
      "audit_logs", "church_events", "attendance_events",
      "member_notes", "guests", "known_people", "members", "users"
    ];
    for (const table of tables) {
      await (env as any).DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
    }

    // Creating members table for FK checks & joining
    await (env as any).DB.prepare(`
      CREATE TABLE members (
        id text PRIMARY KEY NOT NULL,
        full_name text NOT NULL,
        email text, phone text, home_address text, gender text, age_group text,
        marital_status text, occupation text, department text, dob_month integer,
        dob_day integer, anniversary_month integer, anniversary_day integer,
        is_active integer DEFAULT 1 NOT NULL, date_joined integer,
        created_at integer NOT NULL, updated_at integer NOT NULL
      )
    `).run();

    await (env as any).DB.prepare(`
      CREATE TABLE member_notes (
        id text PRIMARY KEY NOT NULL,
        member_id text NOT NULL,
        admin_id text NOT NULL,
        note text NOT NULL,
        created_at integer NOT NULL
      )
    `).run();

    await (env as any).DB.prepare(`
      CREATE TABLE audit_logs (
        id text PRIMARY KEY NOT NULL,
        entity_type text NOT NULL,
        entity_id text NOT NULL,
        action text NOT NULL,
        admin_id text NOT NULL,
        changes text,
        created_at integer NOT NULL
      )
    `).run();
  });

  // -- CREATE -----------------------------------------------------------

  test("POST /api/v1/notes - creates note + audit log", async () => {
    const token = await getToken();
    const memberId = await seedMember();

    const res = await createNote(token, memberId, "Requires pastoral care");

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.note).toBe("Requires pastoral care");
    expect(json.data.memberId).toBe(memberId);
    expect(json.data.adminId).toBe("test-admin-1"); // Filled from JWT

    // Verify audit log
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ?"
    ).bind(json.data.id).all();
    expect(logs.results.length).toBe(1);
    expect(logs.results[0].action).toBe("CREATE");
  });

  test("POST /api/v1/notes - 404 if member does not exist", async () => {
    const token = await getToken();
    const res = await createNote(token, crypto.randomUUID());

    expect(res.status).toBe(404);
    const json = (await res.json()) as any;
    expect(json.error).toMatch(/Member not found/i);
  });

  // -- LIST -------------------------------------------------------------

  test("GET /api/v1/notes/members/:memberId - returns notes for member", async () => {
    const token = await getToken();
    const memberId = await seedMember();

    await createNote(token, memberId, "First note");
    await createNote(token, memberId, "Second note");

    const res = await app.request(`/api/v1/notes/members/${memberId}`, {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.length).toBe(2);
    // ordered by desc createdAt => "Second note" should be first (if timestamps differ, but they might be same ms)
  });

  // -- UPDATE -----------------------------------------------------------

  test("PATCH /api/v1/notes/:id - updates note + writes audit diff", async () => {
    const token = await getToken();
    const memberId = await seedMember();
    const createRes = await createNote(token, memberId, "Original text");
    const { data: note } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/notes/${note.id}`, {
      method: "PATCH",
      body: JSON.stringify({ note: "Updated text" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.note).toBe("Updated text");

    // Verify diff
    const logs = await (env as any).DB.prepare("SELECT * FROM audit_logs WHERE action = 'UPDATE'").all();
    expect(logs.results.length).toBe(1);
    const changes = JSON.parse(logs.results[0].changes);
    expect(changes.note.old).toBe("Original text");
    expect(changes.note.new).toBe("Updated text");
  });

  test("PATCH /api/v1/notes/:id - rejects update from a different standard admin", async () => {
    // Admin 1 creates
    const token1 = await getToken({ userId: "admin-1" });
    const memberId = await seedMember();
    const createRes = await createNote(token1, memberId, "My note");
    const { data: note } = (await createRes.json()) as any;

    // Admin 2 attempts edit
    const token2 = await getToken({ userId: "admin-2", role: "admin" });

    const res = await app.request(`/api/v1/notes/${note.id}`, {
      method: "PATCH",
      body: JSON.stringify({ note: "Hacked text" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token2}`,
      },
    }, env);

    expect(res.status).toBe(403);
    const json = (await res.json()) as any;
    expect(json.error).toMatch(/only edit your own/i);
  });

  test("PATCH /api/v1/notes/:id - allows superadmin to overrule and edit another admin's note", async () => {
    const token1 = await getToken({ userId: "admin-1" });
    const memberId = await seedMember();
    const createRes = await createNote(token1, memberId);
    const { data: note } = (await createRes.json()) as any;

    // SuperAdmin attempts edit
    const superToken = await getToken({ userId: "super-1", role: "superadmin" });

    const res = await app.request(`/api/v1/notes/${note.id}`, {
      method: "PATCH",
      body: JSON.stringify({ note: "SuperAdmin overruled text" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${superToken}`,
      },
    }, env);

    expect(res.status).toBe(200);
    expect(((await res.json()) as any).data.note).toBe("SuperAdmin overruled text");
  });

  // -- DELETE -----------------------------------------------------------

  test("DELETE /api/v1/notes/:id - hard deletes + records audit", async () => {
    const token = await getToken();
    const memberId = await seedMember();
    const createRes = await createNote(token, memberId);
    const { data: note } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/notes/${note.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);

    const check = await (env as any).DB.prepare("SELECT * FROM member_notes").all();
    expect(check.results.length).toBe(0);

    // Audit log
    const logs = await (env as any).DB.prepare("SELECT * FROM audit_logs WHERE action = 'DELETE'").all();
    expect(logs.results.length).toBe(1);
    const preserved = JSON.parse(logs.results[0].changes);
    expect(preserved.note).toBe("Follow up required");
  });
});
