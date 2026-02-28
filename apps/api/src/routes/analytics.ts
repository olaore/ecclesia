import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { attendanceEventsTable } from "@nehemiah/db/schema";
import { verifyJWT, hasRole } from "../middleware/auth";
import { eq, gte, lte, and, asc, sql } from "drizzle-orm";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const analytics = new Hono<{ Bindings: Bindings }>();

// All routes require authentication + admin-level role
analytics.use("/*", (c, next) => verifyJWT(c.env.JWT_SECRET)(c, next));
analytics.use("/*", hasRole(["sysadmin", "superadmin", "admin"]));

/**
 * GET /attendance/trends
 * Aggregates attendance counts by month/year and event type.
 * 
 * Query params:
 *   months (optional, defaults to 6) — Number of past months to retrieve
 */
analytics.get("/attendance/trends", async (c) => {
  const db = drizzle(c.env.DB);
  const qMonths = c.req.query("months") ? parseInt(c.req.query("months")!, 10) : 6;

  // Calculate date range bounds
  const now = new Date();
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const startDate = new Date(now.getFullYear(), now.getMonth() - qMonths + 1, 1);

  // We explicitly extract the numeric ms timestamp for Drizzle SQLite bounds checking
  // as the D1 driver binding with JS Dates can sometimes have serialization mismatches.
  const records = await db
    .select({
      eventDate: attendanceEventsTable.eventDate,
      eventType: attendanceEventsTable.eventType,
      headcount: attendanceEventsTable.headcount,
    })
    .from(attendanceEventsTable)
    .where(
      and(
        sql`${attendanceEventsTable.eventDate} >= ${Math.floor(startDate.getTime() / 1000)}`,
        sql`${attendanceEventsTable.eventDate} <= ${Math.floor(endDate.getTime() / 1000)}`
      )
    )
    .orderBy(asc(attendanceEventsTable.eventDate));

  // Initialize data structure for fast grouping
  // Map format: "YYYY-MM" -> { label, sunday_service: average/total, midweek_service: average/total etc. }
  // To keep it simple, we'll calculate the *average* headcount per month for each event type.
  const monthlyData: Record<string, any> = {};

  records.forEach((record) => {
    // ensure record.eventDate is parsed correctly (SQLite timestamp can be JS Date or number)
    const d = new Date(record.eventDate);
    // JS Months are 0-indexed, pad with leading 0 if needed
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("default", { month: "short", year: "2-digit" });

    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = {
        label,
        sunday_service_total: 0,
        sunday_service_count: 0,
        midweek_service_total: 0,
        midweek_service_count: 0,
        special_event_total: 0,
        special_event_count: 0,
      };
    }

    const typeKey = `${record.eventType}_total`;
    const countKey = `${record.eventType}_count`;

    if (monthlyData[monthKey][typeKey] !== undefined) {
      monthlyData[monthKey][typeKey] += record.headcount;
      monthlyData[monthKey][countKey] += 1;
    }
  });

  // Calculate averages across the aggregated map, converting it to an array
  const responseData = Object.keys(monthlyData)
    .sort() // Sort YYYY-MM alphabetically
    .map((key) => {
      const ms = monthlyData[key];
      return {
        month: key,
        label: ms.label,
        sundayService: ms.sunday_service_count ? Math.round(ms.sunday_service_total / ms.sunday_service_count) : 0,
        midweekService: ms.midweek_service_count ? Math.round(ms.midweek_service_total / ms.midweek_service_count) : 0,
        specialEvent: ms.special_event_count ? Math.round(ms.special_event_total / ms.special_event_count) : 0,
      };
    });

  return c.json({
    success: true,
    data: responseData,
  });
});

export default analytics;
