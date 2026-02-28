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

// Ensure stable time for dates
const now = new Date();
const currentMonth = now.getMonth();
const currentYear = now.getFullYear();

describe("Attendance Analytics API", () => {
  beforeEach(async () => {
    const tables = [
      "audit_logs", "church_events", "attendance_events",
      "member_notes", "guests", "known_people", "members", "users"
    ];
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
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )
    `).run();

    // Data Setup:
    // This Month - Sunday Service
    const thisMonth = Math.floor(new Date(currentYear, currentMonth, 15).getTime() / 1000);
    const lastMonth = Math.floor(new Date(currentYear, currentMonth - 1, 15).getTime() / 1000);

    // Seed 2 Sunday Services this month (headcount: 100, 150) -> average: 125
    await (env as any).DB.prepare(
      `INSERT INTO attendance_events (id, event_type, event_date, headcount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind("ev1", "sunday_service", thisMonth, 100, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)).run();
    await (env as any).DB.prepare(
      `INSERT INTO attendance_events (id, event_type, event_date, headcount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind("ev2", "sunday_service", thisMonth + 86400, 150, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)).run();

    // Seed 1 Midweek Service this month (headcount: 50) -> average: 50
    await (env as any).DB.prepare(
      `INSERT INTO attendance_events (id, event_type, event_date, headcount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind("ev3", "midweek_service", thisMonth, 50, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)).run();

    // Seed 1 Sunday Service last month (headcount: 200) -> average: 200
    await (env as any).DB.prepare(
      `INSERT INTO attendance_events (id, event_type, event_date, headcount, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`
    ).bind("ev4", "sunday_service", lastMonth, 200, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)).run();
  });

  describe("GET /api/v1/analytics/attendance/trends", () => {
    test("aggregates and averages attendance by month and event type", async () => {
      const token = await getToken();
      const res = await app.request("/api/v1/analytics/attendance/trends?months=3", {
        headers: { Authorization: `Bearer ${token}` },
      }, env);

      expect(res.status).toBe(200);
      const { data } = (await res.json()) as any;

      // We expect 2 months in the result
      expect(data).toHaveLength(2);

      // Data is sorted. lastMonth is before thisMonth
      const lastMData = data[0];
      const thisMData = data[1];

      // Verify averages
      expect(lastMData.sundayService).toBe(200); // (200) / 1
      expect(lastMData.midweekService).toBe(0); // None

      expect(thisMData.sundayService).toBe(125); // (100 + 150) / 2
      expect(thisMData.midweekService).toBe(50); // (50) / 1
    });

    test("defaults to 6 months if query param omitted", async () => {
      const token = await getToken();
      const res = await app.request("/api/v1/analytics/attendance/trends", {
        headers: { Authorization: `Bearer ${token}` },
      }, env);

      expect(res.status).toBe(200);
      const { data } = (await res.json()) as any;
      expect(data).toHaveLength(2); // Still 2 seeded months within 6 month window
      expect(data[1].sundayService).toBe(125);
    });
  });
});
