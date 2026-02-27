import { expect, test, describe, beforeAll } from "vitest";
import { Hono } from "hono";
import { sign } from "hono/jwt";
import { hasRole, hasUnitAccess } from "./auth";

const SECRET = "test_secret";

describe("Authorization Guards", () => {
  const app = new Hono();

  app.use("/admin/*", async (c, next) => {
    // Mock JWT payload
    const authHeader = c.req.header("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      if (token === "sysadmin") c.set("jwtPayload", { role: "sysadmin" });
      if (token === "admin-unit-1") c.set("jwtPayload", { role: "admin", unitId: "unit-1" });
      if (token === "user") c.set("jwtPayload", { role: "user" });
    }
    await next();
  });

  app.get("/admin/sys", hasRole(["sysadmin"]), (c) => c.json({ ok: true }));
  app.get("/admin/any", hasRole(["sysadmin", "admin"]), (c) => c.json({ ok: true }));
  app.get("/admin/unit/:unitId", hasUnitAccess(), (c) => c.json({ ok: true }));

  test("hasRole - Allow correct role", async () => {
    const res = await app.request("/admin/sys", {
      headers: { Authorization: "Bearer sysadmin" },
    });
    expect(res.status).toBe(200);
  });

  test("hasRole - Deny incorrect role", async () => {
    const res = await app.request("/admin/sys", {
      headers: { Authorization: "Bearer user" },
    });
    expect(res.status).toBe(403);
  });

  test("hasUnitAccess - Allow same unit for admin", async () => {
    const res = await app.request("/admin/unit/unit-1", {
      headers: { Authorization: "Bearer admin-unit-1" },
    });
    expect(res.status).toBe(200);
  });

  test("hasUnitAccess - Deny different unit for admin", async () => {
    const res = await app.request("/admin/unit/unit-2", {
      headers: { Authorization: "Bearer admin-unit-1" },
    });
    expect(res.status).toBe(403);
  });

  test("hasUnitAccess - Allow any unit for sysadmin", async () => {
    const res = await app.request("/admin/unit/unit-2", {
      headers: { Authorization: "Bearer sysadmin" },
    });
    expect(res.status).toBe(200);
  });
});
