import { expect, test, describe, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { sign } from "hono/jwt";
import app from "../index";

const JWT_SECRET = "test-secret-for-vitest";

async function getToken(role: string = "admin") {
  return sign(
    {
      userId: "test-admin",
      role,
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    JWT_SECRET
  );
}

describe("Celebrants API", () => {
  beforeEach(async () => {
    const tables = [
      "audit_logs", "church_events", "attendance_events",
      "member_notes", "guests", "known_people", "members", "users"
    ];
    for (const table of tables) {
      await (env as any).DB.prepare(`DROP TABLE IF EXISTS ${table}`).run();
    }

    await (env as any).DB.prepare(`
      CREATE TABLE members (
        id text PRIMARY KEY NOT NULL,
        full_name text NOT NULL,
        email text, phone text, home_address text, gender text, age_group text,
        marital_status text, occupation text, department text,
        dob_month integer, dob_day integer,
        anniversary_month integer, anniversary_day integer,
        is_active integer DEFAULT 1 NOT NULL, date_joined integer,
        created_at integer NOT NULL, updated_at integer NOT NULL
      )
    `).run();

    await (env as any).DB.prepare(`
      CREATE TABLE known_people (
        id text PRIMARY KEY NOT NULL,
        full_name text NOT NULL,
        dob_month integer,
        dob_day integer,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `).run();

    // Data Setup
    const testTime = Date.now();

    // Member 1: Jan 1st Birthday, Feb 14th Anniversary
    await (env as any).DB.prepare(
      `INSERT INTO members (id, full_name, dob_month, dob_day, anniversary_month, anniversary_day, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind("m1", "John Member", 1, 1, 2, 14, testTime, testTime).run();

    // Member 2: Feb 28th Birthday (No Anniversary)
    await (env as any).DB.prepare(
      `INSERT INTO members (id, full_name, dob_month, dob_day, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind("m2", "Jane Member", 2, 28, testTime, testTime).run();

    // Member 3: Inactive Member (Should be excluded) - Jan 1st Birthday
    await (env as any).DB.prepare(
      `INSERT INTO members (id, full_name, dob_month, dob_day, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind("m3", "Inactive Member", 1, 1, 0, testTime, testTime).run();

    // Known Person 1: Jan 15th Birthday
    await (env as any).DB.prepare(
      `INSERT INTO known_people (id, full_name, dob_month, dob_day, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind("kp1", "Old Friend", 1, 15, testTime, testTime).run();
  });

  describe("GET /api/v1/celebrants/birthdays", () => {
    test("fetches birthdays for a specific month combining members and known_people", async () => {
      const token = await getToken();
      const res = await app.request("/api/v1/celebrants/birthdays?month=1", {
        headers: { Authorization: `Bearer ${token}` },
      }, env);

      if(res.status!==200) console.log(await res.text()); expect(res.status).toBe(200);
      const { data } = (await res.json()) as any;
      expect(data).toHaveLength(2); // "John Member" and "Old Friend"

      // Order should be by day
      expect(data[0].fullName).toBe("John Member");
      expect(data[0].source).toBe("member");

      expect(data[1].fullName).toBe("Old Friend");
      expect(data[1].source).toBe("known_person");
    });

    test("fetches all birthdays if no month is provided", async () => {
      const token = await getToken();
      const res = await app.request("/api/v1/celebrants/birthdays", {
        headers: { Authorization: `Bearer ${token}` },
      }, env);

      const { data } = (await res.json()) as any;
      expect(data).toHaveLength(3); // m1, m2, kp1 (m3 is inactive)
    });
  });

  describe("GET /api/v1/celebrants/anniversaries", () => {
    test("fetches anniversaries for a specific month (only members)", async () => {
      const token = await getToken();
      const res = await app.request("/api/v1/celebrants/anniversaries?month=2", {
        headers: { Authorization: `Bearer ${token}` },
      }, env);

      if(res.status!==200) console.log(await res.text()); expect(res.status).toBe(200);
      const { data } = (await res.json()) as any;
      expect(data).toHaveLength(1);
      expect(data[0].fullName).toBe("John Member");
      expect(data[0].day).toBe(14);
    });

    test("fetches all anniversaries if no month is provided", async () => {
      const token = await getToken();
      const res = await app.request("/api/v1/celebrants/anniversaries", {
        headers: { Authorization: `Bearer ${token}` },
      }, env);

      const { data } = (await res.json()) as any;
      // Only one member in our setup has an anniversary
      expect(data).toHaveLength(1);
      expect(data[0].fullName).toBe("John Member");
    });
  });
});
