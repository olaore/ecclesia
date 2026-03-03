import { expect, test, describe, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { sign } from "hono/jwt";
import app from "../index";

const JWT_SECRET = "test-secret-for-vitest";

/** Helper: generate a valid admin JWT */
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

/** Helper: create a member via the API and return its data */
async function createMember(
  token: string,
  data: Record<string, unknown> = {}
) {
  const res = await app.request("/api/v1/members", {
    method: "POST",
    body: JSON.stringify({
      fullName: "Adeola Johnson",
      email: "adeola@example.com",
      phone: "+2348012345678",
      ...data,
    }),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  }, env);
  return res;
}

describe("Members CRUD API", () => {
  beforeEach(async () => {
    // Re-create tables fresh for each test
    const tables = ["audit_logs", "member_notes", "guests", "known_people", "members", "users"];
    for (const table of tables) {
      await (env as any).DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
    }

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

  // ── CREATE ──────────────────────────────────────────────────────

  test("POST /api/v1/members - creates member + audit log", async () => {
    const token = await adminToken();
    const res = await createMember(token);

    expect(res.status).toBe(201);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.fullName).toBe("Adeola Johnson");
    expect(json.data.id).toBeDefined();

    // Verify audit log was written
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ?"
    ).bind(json.data.id).all();
    expect(logs.results.length).toBe(1);
    expect(logs.results[0].action).toBe("CREATE");
    expect(logs.results[0].admin_id).toBe("admin-user-id");
  });

  test("POST /api/v1/members - validation error for missing fullName", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/members", {
      method: "POST",
      body: JSON.stringify({ email: "test@example.com" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(400);
    const json = (await res.json()) as any;
    expect(json.success).toBe(false);
  });

  // ── LIST ────────────────────────────────────────────────────────

  test("GET /api/v1/members - returns paginated list", async () => {
    const token = await adminToken();

    // Create a few members
    await createMember(token, { fullName: "Member One" });
    await createMember(token, { fullName: "Member Two" });
    await createMember(token, { fullName: "Member Three" });

    const res = await app.request("/api/v1/members?page=1&perPage=2", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.success).toBe(true);
    expect(json.data.length).toBe(2);
    expect(json.meta.total).toBe(3);
    expect(json.meta.totalPages).toBe(2);
    expect(json.meta.page).toBe(1);
  });

  test("GET /api/v1/members - filters by name", async () => {
    const token = await adminToken();
    await createMember(token, { fullName: "Adeola Johnson" });
    await createMember(token, { fullName: "Blessing Okafor" });

    const res = await app.request("/api/v1/members?name=Adeola", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.length).toBe(1);
    expect(json.data[0].fullName).toBe("Adeola Johnson");
  });

  test("GET /api/v1/members - filters by department", async () => {
    const token = await adminToken();
    await createMember(token, { fullName: "A", department: "Choir" });
    await createMember(token, { fullName: "B", department: "Media" });

    const res = await app.request("/api/v1/members?department=Choir", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.length).toBe(1);
  });

  // ── GET BY ID ───────────────────────────────────────────────────

  test("GET /api/v1/members/:id - returns single member", async () => {
    const token = await adminToken();
    const createRes = await createMember(token);
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/members/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.id).toBe(created.id);
  });

  test("GET /api/v1/members/:id - returns 404 for non-existent", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/members/non-existent-id", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(404);
  });

  // ── UPDATE ──────────────────────────────────────────────────────

  test("PATCH /api/v1/members/:id - updates member + creates audit diff", async () => {
    const token = await adminToken();
    const createRes = await createMember(token);
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/members/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ phone: "+2349087654321", department: "Media" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.phone).toBe("+2349087654321");
    expect(json.data.department).toBe("Media");

    // Verify audit log has a diff
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ? AND action = 'UPDATE'"
    ).bind(created.id).all();
    expect(logs.results.length).toBe(1);
    const changes = JSON.parse(logs.results[0].changes);
    expect(changes.phone).toBeDefined();
    expect(changes.phone.new).toBe("+2349087654321");
  });

  test("PATCH /api/v1/members/:id - returns 404 for non-existent", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/members/non-existent-id", {
      method: "PATCH",
      body: JSON.stringify({ phone: "+2349087654321" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    }, env);

    expect(res.status).toBe(404);
  });

  test("PATCH /api/v1/members/:id - rejects standard admin role", async () => {
    const sysadminToken = await adminToken();
    const createRes = await createMember(sysadminToken);
    const { data: created } = (await createRes.json()) as any;
    const adminTokenValue = await adminToken({ role: "admin", userId: "regular-admin-id" });

    const res = await app.request(`/api/v1/members/${created.id}`, {
      method: "PATCH",
      body: JSON.stringify({ department: "Media" }),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminTokenValue}`,
      },
    }, env);

    expect(res.status).toBe(403);
    expect(((await res.json()) as any).error).toBe("You do not have permissions for this action");
  });

  // ── SOFT DELETE ─────────────────────────────────────────────────

  test("DELETE /api/v1/members/:id - soft deletes (isActive = false)", async () => {
    const token = await adminToken();
    const createRes = await createMember(token);
    const { data: created } = (await createRes.json()) as any;

    const res = await app.request(`/api/v1/members/${created.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.data.isActive).toBe(false);

    // Verify audit log
    const logs = await (env as any).DB.prepare(
      "SELECT * FROM audit_logs WHERE entity_id = ? AND action = 'DELETE'"
    ).bind(created.id).all();
    expect(logs.results.length).toBe(1);
  });

  test("DELETE /api/v1/members/:id - returns 404 for non-existent", async () => {
    const token = await adminToken();
    const res = await app.request("/api/v1/members/non-existent-id", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    }, env);

    expect(res.status).toBe(404);
  });

  // ── AUTH GUARD ──────────────────────────────────────────────────

  test("GET /api/v1/members - rejects unauthenticated requests", async () => {
    const res = await app.request("/api/v1/members", {}, env);
    expect(res.status).toBe(401);
  });

  test("GET /api/v1/members - rejects 'user' role", async () => {
    const token = await adminToken({ role: "user" });
    const res = await app.request("/api/v1/members", {
      headers: { Authorization: `Bearer ${token}` },
    }, env);
    expect(res.status).toBe(403);
  });
});
