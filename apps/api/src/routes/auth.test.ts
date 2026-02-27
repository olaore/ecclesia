import { expect, test, describe, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import app from "../index";
import { resetRateLimitStore } from "../middleware/rate-limit";

describe("Auth Registration & Login", () => {
  beforeEach(async () => {
    // Reset rate limiter between tests
    resetRateLimitStore();

    // Re-create users table fresh for each test
    await (env as any).DB.prepare(`DROP TABLE IF EXISTS users`).run();
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

  test("POST /api/v1/auth/register - Success (first user becomes sysadmin)", async () => {
    const res = await app.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "first@example.com",
        password: "password123",
      }),
      headers: { "Content-Type": "application/json" },
    }, env);

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.user.email).toBe("first@example.com");
    expect(data.data.user.role).toBe("sysadmin"); // First user auto-promoted
    expect(data.data.token).toBeDefined();
  });

  test("POST /api/v1/auth/register - Second user defaults to 'user' role", async () => {
    // Register first user (becomes sysadmin)
    await app.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "first@example.com",
        password: "password123",
      }),
      headers: { "Content-Type": "application/json" },
    }, env);

    // Register second user
    const res = await app.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "second@example.com",
        password: "password123",
      }),
      headers: { "Content-Type": "application/json" },
    }, env);

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.user.role).toBe("user"); // Not sysadmin, not admin
  });

  test("POST /api/v1/auth/register - Role in payload is ignored", async () => {
    // Register first user (becomes sysadmin)
    await app.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "first@example.com",
        password: "password123",
      }),
      headers: { "Content-Type": "application/json" },
    }, env);

    // Attempt privilege escalation
    const res = await app.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "sneaky@example.com",
        password: "password123",
        role: "sysadmin", // Should be ignored
      }),
      headers: { "Content-Type": "application/json" },
    }, env);

    expect(res.status).toBe(201);
    const data = await res.json() as any;
    expect(data.data.user.role).toBe("user"); // Ignored, still 'user'
  });

  test("POST /api/v1/auth/register - Duplicate Email", async () => {
    // First registration
    await app.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "dual@example.com",
        password: "password123",
      }),
      headers: { "Content-Type": "application/json" },
    }, env);

    // Second registration with same email
    const res = await app.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "dual@example.com",
        password: "password123",
      }),
      headers: { "Content-Type": "application/json" },
    }, env);

    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toMatch(/email already exists/i);
  });

  test("POST /api/v1/auth/login - Success", async () => {
    // Register first
    await app.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "login@example.com",
        password: "password123",
      }),
      headers: { "Content-Type": "application/json" },
    }, env);

    const res = await app.request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "login@example.com",
        password: "password123",
      }),
      headers: { "Content-Type": "application/json" },
    }, env);

    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
    expect(data.data.token).toBeDefined();
  });

  test("POST /api/v1/auth/login - Invalid Credentials", async () => {
    const res = await app.request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "nonexistent@example.com",
        password: "password123",
      }),
      headers: { "Content-Type": "application/json" },
    }, env);

    expect(res.status).toBe(401);
  });

  test("POST /api/v1/auth/register - Validation error for short password", async () => {
    const res = await app.request("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({
        email: "valid@example.com",
        password: "short",
      }),
      headers: { "Content-Type": "application/json" },
    }, env);

    expect(res.status).toBe(400);
    const data = await res.json() as any;
    expect(data.success).toBe(false);
  });
});
