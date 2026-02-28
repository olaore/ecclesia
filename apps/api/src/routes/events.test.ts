import { expect, test, describe, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { sign } from "hono/jwt";
import app from "../index";

const JWT_SECRET = "test-secret-for-vitest";

async function getToken(overrides: Record<string, unknown> = {}) {
  return sign(
    {
      userId: "test-user-id",
      role: "admin",
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    },
    JWT_SECRET
  );
}

async function createEvent(
  token: string,
  data: Record<string, unknown> = {}
) {
  return app.request("/api/v1/events", {
    method: "POST",
    body: JSON.stringify({
      title: "Annual Retreat",
      eventType: "retreat",
      startDate: "2026-05-15T09:00:00Z",
      endDate: "2026-05-17T17:00:00Z",
      visibility: "public",
      ...data,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }, env);
}

describe("Church Events API", () => {
  beforeEach(async () => {
    const tables = [
      "audit_logs", "church_events", "attendance_events",
      "member_notes", "guests", "known_people", "members", "users"
    ];
    for (const table of tables) {
      await (env as any).DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
    }

    await (env as any).DB.prepare(`
      CREATE TABLE church_events (
        id text PRIMARY KEY NOT NULL,
        title text NOT NULL,
        description text,
        event_type text NOT NULL,
        start_date integer NOT NULL,
        end_date integer NOT NULL,
        visibility text DEFAULT 'public' NOT NULL,
        created_by text NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
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

  test("POST /api/v1/events - creates event + audit log", async () => {
    const token = await getToken();
    const res = await createEvent(token);

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.title).toBe("Annual Retreat");
    expect(json.data.eventType).toBe("retreat");
    expect(json.data.createdBy).toBe("test-user-id");
    expect(json.data.visibility).toBe("public");

    // Verify audit log
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ?"
    ).bind(json.data.id).all();
    expect(logs.results.length).toBe(1);
    expect(logs.results[0].action).toBe("CREATE");
    expect(logs.results[0].entity_type).toBe("church_event");
  });

  test("POST /api/v1/events - validation error for missing title", async () => {
    const token = await getToken();
    const res = await app.request("/api/v1/events", {
      method: "POST",
      body: JSON.stringify({ eventType: "retreat", startDate: "2026-05-15T09:00:00Z" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(400);
  });

  // -- BULK CREATE ------------------------------------------------------

  test("POST /api/v1/events/bulk - creates multiple events + audit logs", async () => {
    const token = await getToken();
    const payload = [
      {
        title: "Event 1",
        eventType: "special_service",
        startDate: "2026-06-01T09:00:00Z",
        endDate: "2026-06-01T11:00:00Z",
      },
      {
        title: "Event 2",
        eventType: "conference",
        startDate: "2026-07-01T09:00:00Z",
        endDate: "2026-07-03T17:00:00Z",
        visibility: "private",
      }
    ];

    const res = await app.request("/api/v1/events/bulk", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.inserted).toBe(2);

    // Verify records in DB
    const check = await (env as any).DB.prepare("SELECT * FROM church_events").all();
    expect(check.results.length).toBe(2);

    // Verify audit logs were created
    const logs = await (env as any).DB.prepare("SELECT * FROM audit_logs WHERE entity_type = 'church_event'").all();
    expect(logs.results.length).toBe(2);
  });

  test("POST /api/v1/events/bulk - rejects empty array", async () => {
    const token = await getToken();
    const res = await app.request("/api/v1/events/bulk", {
      method: "POST",
      body: JSON.stringify([]),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(400);
  });

  // -- LIST -------------------------------------------------------------

  test("GET /api/v1/events - filters by month and year", async () => {
    const token = await getToken();
    // Feb event
    await createEvent(token, { startDate: "2026-02-15T09:00:00Z", endDate: "2026-02-15T12:00:00Z" });
    // Mar event
    await createEvent(token, { startDate: "2026-03-10T09:00:00Z", endDate: "2026-03-10T12:00:00Z" });
    // Multi-month event starting in Feb and ending in Mar
    await createEvent(token, { startDate: "2026-02-28T09:00:00Z", endDate: "2026-03-02T12:00:00Z" });

    // Look for March events. Should return the Mar event and the Multi-month event.
    const res = await app.request("/api/v1/events?month=3&year=2026", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.length).toBe(2);
  });

  test("GET /api/v1/events - filters visibility for user role", async () => {
    const adminTok = await getToken({ role: "admin" });
    const userTok = await getToken({ role: "user" });

    await createEvent(adminTok, { title: "Public", visibility: "public" });
    await createEvent(adminTok, { title: "Private", visibility: "private" });

    // Admin should see both
    const resAdmin = await app.request("/api/v1/events", {
      headers: { Authorization: `Bearer ${adminTok}` },
    }, env);
    expect(((await resAdmin.json()) as any).data.length).toBe(2);

    // User should only see public
    const resUser = await app.request("/api/v1/events", {
      headers: { Authorization: `Bearer ${userTok}` },
    }, env);
    const userData = ((await resUser.json()) as any).data;
    expect(userData.length).toBe(1);
    expect(userData[0].title).toBe("Public");
  });

  // -- GET BY ID --------------------------------------------------------

  test("GET /api/v1/events/:id - returns single event", async () => {
    const token = await getToken();
    const createRes = await createEvent(token);
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/events/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.id).toBe(created.id);
  });

  test("GET /api/v1/events/:id - blocks user from viewing private event", async () => {
    const adminTok = await getToken({ role: "admin" });
    const userTok = await getToken({ role: "user" });

    const createRes = await createEvent(adminTok, { visibility: "private" });
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/events/${created.id}`, {
      headers: { Authorization: `Bearer ${userTok}` },
    }, env);

    expect(res.status).toBe(403);
  });

  // -- UPDATE -----------------------------------------------------------

  test("PATCH /api/v1/events/:id - updates event + audit diff", async () => {
    const token = await getToken();
    const createRes = await createEvent(token);
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/events/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ title: "Updated Retreat Title" }), // date omitted
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.title).toBe("Updated Retreat Title");

    // Verify audit diff
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ? AND action = 'UPDATE'"
    ).bind(created.id).all();
    expect(logs.results.length).toBe(1);
    const changes = JSON.parse(logs.results[0].changes);
    expect(changes.title.old).toBe("Annual Retreat");
    expect(changes.title.new).toBe("Updated Retreat Title");
  });

  // -- DELETE -----------------------------------------------------------

  test("DELETE /api/v1/events/:id - hard-deletes + preserves audit trail", async () => {
    const token = await getToken();
    const createRes = await createEvent(token);
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/events/${created.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.deleted).toBe(true);

    // Verify record is gone
    const check = await (env as any).DB.prepare(
      "SELECT * FROM church_events WHERE id = ?"
    ).bind(created.id).all();
    expect(check.results.length).toBe(0);

    // Verify audit log preserves the deleted record
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ? AND action = 'DELETE'"
    ).bind(created.id).all();
    expect(logs.results.length).toBe(1);
    const preserved = JSON.parse(logs.results[0].changes);
    expect(preserved.title).toBe("Annual Retreat");
  });

});
