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

async function createGuest(
  token: string,
  data: Record<string, unknown> = {}
) {
  return app.request("/api/v1/guests", {
    method: "POST",
    body: JSON.stringify({
      fullName: "Chidinma Eze",
      phone: "+2348099887766",
      ...data,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }, env);
}

describe("Guests CRUD + Promote API", () => {
  beforeEach(async () => {
    const tables = ["audit_logs", "member_notes", "guests", "known_people", "members", "users"];
    for (const table of tables) {
      await (env as any).DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
    }

    await (env as any).DB.prepare(`
      CREATE TABLE guests (
        id text PRIMARY KEY NOT NULL,
        full_name text NOT NULL,
        email text,
        phone text,
        visit_date integer,
        status text DEFAULT 'first_time' NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `).run();

    await (env as any).DB.prepare(`
      CREATE TABLE members (
        id text PRIMARY KEY NOT NULL,
        full_name text NOT NULL,
        email text,
        phone text,
        home_address text,
        gender text,
        age_group text,
        marital_status text,
        occupation text,
        department text,
        dob_month integer,
        dob_day integer,
        anniversary_month integer,
        anniversary_day integer,
        is_active integer DEFAULT 1 NOT NULL,
        date_joined integer,
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
  });

  // -- CREATE -----------------------------------------------------------

  test("POST /api/v1/guests - creates guest with default status first_time", async () => {
    const token = await adminToken();
    const res = await createGuest(token);

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.fullName).toBe("Chidinma Eze");
    expect(json.data.status).toBe("first_time");

    // Verify audit log
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ?"
    ).bind(json.data.id).all();
    expect(logs.results.length).toBe(1);
    expect(logs.results[0].action).toBe("CREATE");
    expect(logs.results[0].entity_type).toBe("guest");
  });

  test("POST /api/v1/guests - validation error for missing fullName", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/guests", {
      method: "POST",
      body: JSON.stringify({ phone: "+2348099887766" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
  });

  // -- LIST -------------------------------------------------------------

  test("GET /api/v1/guests - returns paginated list", async () => {
    const token = await adminToken();
    await createGuest(token, { fullName: "Guest One" });
    await createGuest(token, { fullName: "Guest Two" });
    await createGuest(token, { fullName: "Guest Three" });

    const res = await app.request("/api/v1/guests?page=1&perPage=2", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.length).toBe(2);
    expect(json.meta.total).toBe(3);
    expect(json.meta.totalPages).toBe(2);
  });

  test("GET /api/v1/guests - filters by status", async () => {
    const token = await adminToken();
    await createGuest(token, { fullName: "First Timer" });

    const res = await app.request("/api/v1/guests?status=first_time", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.length).toBe(1);
    expect(json.data[0].status).toBe("first_time");
  });

  // -- GET BY ID --------------------------------------------------------

  test("GET /api/v1/guests/:id - returns single guest", async () => {
    const token = await adminToken();
    const createRes = await createGuest(token);
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/guests/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.id).toBe(created.id);
  });

  test("GET /api/v1/guests/:id - returns 404 for non-existent", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/guests/non-existent-id", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(404);
  });

  // -- UPDATE -----------------------------------------------------------

  test("PATCH /api/v1/guests/:id - updates details + audit diff", async () => {
    const token = await adminToken();
    const createRes = await createGuest(token);
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/guests/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ phone: "+2341112223333", email: "new@email.com" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.phone).toBe("+2341112223333");
    expect(json.data.email).toBe("new@email.com");

    // Verify audit log
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ? AND action = 'UPDATE'"
    ).bind(created.id).all();
    expect(logs.results.length).toBe(1);
  });

  test("PATCH /api/v1/guests/:id - returns 404 for non-existent", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/guests/non-existent-id", {
      method: "PATCH",
      body: JSON.stringify({ phone: "+2341112223333" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);
    expect(res.status).toBe(404);
  });

  // -- PROMOTE ----------------------------------------------------------

  test("POST /api/v1/guests/:id/promote - promotes guest to member", async () => {
    const token = await adminToken();
    const createRes = await createGuest(token, {
      fullName: "Tolu Adeyemi",
      email: "tolu@example.com",
      phone: "+2348055443322",
    });
    const { data: guest } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/guests/${guest.id}/promote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);

    // New member created with guest data
    expect(json.data.member.fullName).toBe("Tolu Adeyemi");
    expect(json.data.member.email).toBe("tolu@example.com");
    expect(json.data.member.phone).toBe("+2348055443322");
    expect(json.data.member.id).toBeDefined();

    // Guest status updated
    expect(json.data.guest.status).toBe("joined");

    // Verify 2 audit logs were written (1 for member CREATE, 1 for guest UPDATE)
    const memberLogs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_type = 'member' AND action = 'CREATE' AND entity_id = ?"
    ).bind(json.data.member.id).all();
    expect(memberLogs.results.length).toBe(1);
    const memberChanges = JSON.parse(memberLogs.results[0].changes);
    expect(memberChanges.source).toBe("guest_promotion");
    expect(memberChanges.guestId).toBe(guest.id);

    const guestLogs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_type = 'guest' AND action = 'UPDATE' AND entity_id = ?"
    ).bind(guest.id).all();
    expect(guestLogs.results.length).toBe(1);
    const guestChanges = JSON.parse(guestLogs.results[0].changes);
    expect(guestChanges.status.old).toBe("first_time");
    expect(guestChanges.status.new).toBe("joined");
    expect(guestChanges.promotedToMemberId).toBe(json.data.member.id);
  });

  test("POST /api/v1/guests/:id/promote - rejects already promoted guest", async () => {
    const token = await adminToken();
    const createRes = await createGuest(token, { fullName: "Already Joined" });
    const { data: guest } = (await createRes.json()) as any;

    // First promote succeeds
    await app.request(`/api/v1/guests/${guest.id}/promote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    // Second promote should fail
    const res = await app.request(`/api/v1/guests/${guest.id}/promote`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.error).toMatch(/already been promoted/i);
  });

  test("POST /api/v1/guests/:id/promote - returns 404 for non-existent", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/guests/non-existent-id/promote", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(404);
  });

  // -- AUTH GUARD -------------------------------------------------------

  test("GET /api/v1/guests - rejects unauthenticated requests", async () => {
    const res = await app.request("/api/v1/guests", {}, env);
    expect(res.status).toBe(401);
  });
});
