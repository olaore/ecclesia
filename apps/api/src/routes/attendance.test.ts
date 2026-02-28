import { expect, test, describe, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { sign } from "hono/jwt";
import app from "../index";

const JWT_SECRET = "test-secret-for-vitest";

async function adminToken(overrides: Record<string, unknown> = {}) {
  return sign(
    {
      userId: "admin-user-id",
      role: "sysadmin",
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...overrides,
    },
    JWT_SECRET
  );
}

async function createAttendanceEvent(
  token: string,
  data: Record<string, unknown> = {}
) {
  return app.request("/api/v1/attendance", {
    method: "POST",
    body: JSON.stringify({
      eventType: "sunday_service",
      eventDate: "2026-02-22T09:00:00Z",
      headcount: 150,
      adultsCount: 120,
      childrenCount: 30,
      ...data,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }, env);
}

describe("Attendance CRUD API", () => {
  beforeEach(async () => {
    const tables = ["audit_logs", "attendance_events", "member_notes", "guests", "known_people", "members", "users"];
    for (const table of tables) {
      await (env as any).DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
    }

    await (env as any).DB.prepare(`
      CREATE TABLE attendance_events (
        id text PRIMARY KEY NOT NULL,
        event_type text NOT NULL,
        event_date integer NOT NULL,
        headcount integer NOT NULL,
        adults_count integer,
        children_count integer,
        notes text,
        recorded_by text NOT NULL,
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

    await (env as any).DB.prepare(`
      CREATE TABLE users (
        id text PRIMARY KEY NOT NULL,
        email text NOT NULL UNIQUE,
        password_hash text NOT NULL,
        role text DEFAULT 'admin' NOT NULL,
        unit_id text,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `).run();

    // members table needed for index.ts import
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
      CREATE TABLE guests (
        id text PRIMARY KEY NOT NULL,
        full_name text NOT NULL, email text, phone text,
        visit_date integer, status text DEFAULT 'first_time' NOT NULL,
        created_at integer NOT NULL, updated_at integer NOT NULL
      )
    `).run();
  });

  // -- CREATE -----------------------------------------------------------

  test("POST /api/v1/attendance - records event + audit log", async () => {
    const token = await adminToken();
    const res = await createAttendanceEvent(token);

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.eventType).toBe("sunday_service");
    expect(json.data.headcount).toBe(150);
    expect(json.data.adultsCount).toBe(120);
    expect(json.data.childrenCount).toBe(30);
    expect(json.data.recordedBy).toBe("admin-user-id");

    // Verify audit log
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ?"
    ).bind(json.data.id).all();
    expect(logs.results.length).toBe(1);
    expect(logs.results[0].action).toBe("CREATE");
    expect(logs.results[0].entity_type).toBe("attendance_event");
  });

  test("POST /api/v1/attendance - validation error for missing headcount", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/attendance", {
      method: "POST",
      body: JSON.stringify({ eventType: "sunday_service", eventDate: "2026-02-22" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(400);
  });

  test("POST /api/v1/attendance - validation error for invalid eventType", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/attendance", {
      method: "POST",
      body: JSON.stringify({
        eventType: "invalid_type",
        eventDate: "2026-02-22",
        headcount: 50,
      }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(400);
  });

  // -- LIST -------------------------------------------------------------

  test("GET /api/v1/attendance - returns paginated list", async () => {
    const token = await adminToken();
    await createAttendanceEvent(token, { eventDate: "2026-02-01" });
    await createAttendanceEvent(token, { eventDate: "2026-02-08" });
    await createAttendanceEvent(token, { eventDate: "2026-02-15" });

    const res = await app.request("/api/v1/attendance?page=1&perPage=2", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.length).toBe(2);
    expect(json.meta.total).toBe(3);
    expect(json.meta.totalPages).toBe(2);
  });

  test("GET /api/v1/attendance - filters by eventType", async () => {
    const token = await adminToken();
    await createAttendanceEvent(token, { eventType: "sunday_service" });
    await createAttendanceEvent(token, { eventType: "midweek_service" });

    const res = await app.request("/api/v1/attendance?eventType=sunday_service", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.length).toBe(1);
    expect(json.data[0].eventType).toBe("sunday_service");
  });

  test("GET /api/v1/attendance - filters by date range", async () => {
    const token = await adminToken();
    await createAttendanceEvent(token, { eventDate: "2026-01-15T09:00:00Z" });
    await createAttendanceEvent(token, { eventDate: "2026-02-15T09:00:00Z" });
    await createAttendanceEvent(token, { eventDate: "2026-03-15T09:00:00Z" });

    const res = await app.request(
      "/api/v1/attendance?from=2026-02-01T00:00:00Z&to=2026-02-28T23:59:59Z",
      { headers: { Authorization: `Bearer ${token}` } },
      env
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.length).toBe(1);
  });

  // -- GET BY ID --------------------------------------------------------

  test("GET /api/v1/attendance/:id - returns single event", async () => {
    const token = await adminToken();
    const createRes = await createAttendanceEvent(token);
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/attendance/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.id).toBe(created.id);
    expect(json.data.headcount).toBe(150);
  });

  test("GET /api/v1/attendance/:id - returns 404 for non-existent", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/attendance/non-existent-id", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(404);
  });

  // -- UPDATE -----------------------------------------------------------

  test("PATCH /api/v1/attendance/:id - updates headcount + audit diff", async () => {
    const token = await adminToken();
    const createRes = await createAttendanceEvent(token);
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/attendance/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ headcount: 175, notes: "Corrected count" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.headcount).toBe(175);
    expect(json.data.notes).toBe("Corrected count");

    // Verify audit diff
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ? AND action = 'UPDATE'"
    ).bind(created.id).all();
    expect(logs.results.length).toBe(1);
    const changes = JSON.parse(logs.results[0].changes);
    expect(changes.headcount.old).toBe(150);
    expect(changes.headcount.new).toBe(175);
  });

  // -- DELETE -----------------------------------------------------------

  test("DELETE /api/v1/attendance/:id - hard-deletes + preserves audit trail", async () => {
    const token = await adminToken();
    const createRes = await createAttendanceEvent(token);
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/attendance/${created.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.deleted).toBe(true);

    // Verify record is gone
    const check = await (env as any).DB.prepare(
      "SELECT * FROM attendance_events WHERE id = ?"
    ).bind(created.id).all();
    expect(check.results.length).toBe(0);

    // Verify audit log preserves the deleted record
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ? AND action = 'DELETE'"
    ).bind(created.id).all();
    expect(logs.results.length).toBe(1);
    const preserved = JSON.parse(logs.results[0].changes);
    expect(preserved.headcount).toBe(150);
  });

  test("DELETE /api/v1/attendance/:id - returns 404 for non-existent", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/attendance/non-existent-id", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(404);
  });

  // -- AUTH GUARD -------------------------------------------------------

  test("GET /api/v1/attendance - rejects unauthenticated requests", async () => {
    const res = await app.request("/api/v1/attendance", {}, env);
    expect(res.status).toBe(401);
  });
});
