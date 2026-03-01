import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { attendanceEventsTable } from "@nehemiah/db/schema";
import { verifyJWT, hasRole } from "../middleware/auth";
import { gte, lte, and, asc } from "drizzle-orm";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const analytics = new Hono<{ Bindings: Bindings }>();

// All routes require authentication + admin-level role
analytics.use("/*", (c, next) => verifyJWT(c.env.JWT_SECRET)(c, next));
analytics.use("/*", hasRole(["sysadmin", "superadmin", "admin"]));

const normalizeTimestamp = (value: unknown) => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const timestamp = value < 1_000_000_000_000 ? value * 1000 : value;
    const date = new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value === "string") {
    const numericValue = Number(value);
    if (!Number.isNaN(numericValue)) {
      return normalizeTimestamp(numericValue);
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

export const buildAttendanceTrends = async (db: ReturnType<typeof drizzle>, months: number) => {
  const safeMonths = Number.isFinite(months) && months > 0 ? Math.floor(months) : 6;

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - safeMonths + 1, 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const records = await db
    .select({
      eventDate: attendanceEventsTable.eventDate,
      eventType: attendanceEventsTable.eventType,
      headcount: attendanceEventsTable.headcount,
    })
    .from(attendanceEventsTable)
    .where(
      and(
        gte(attendanceEventsTable.eventDate, startDate),
        lte(attendanceEventsTable.eventDate, endDate)
      )
    )
    .orderBy(asc(attendanceEventsTable.eventDate));

  const monthlyData: Record<string, {
    label: string;
    sunday_service_total: number;
    sunday_service_count: number;
    midweek_service_total: number;
    midweek_service_count: number;
    special_event_total: number;
    special_event_count: number;
  }> = {};

  records.forEach((record) => {
    const eventDate = normalizeTimestamp(record.eventDate);

    if (!eventDate) {
      return;
    }

    const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}`;
    const label = eventDate.toLocaleString("default", { month: "short", year: "2-digit" });

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

    const typeKey = `${record.eventType}_total` as keyof typeof monthlyData[string];
    const countKey = `${record.eventType}_count` as keyof typeof monthlyData[string];

    if (typeKey in monthlyData[monthKey] && countKey in monthlyData[monthKey]) {
      monthlyData[monthKey][typeKey] += record.headcount;
      monthlyData[monthKey][countKey] += 1;
    }
  });

  return Object.keys(monthlyData)
    .sort()
    .map((key) => {
      const month = monthlyData[key];

      return {
        month: key,
        label: month.label,
        sundayService: month.sunday_service_count ? Math.round(month.sunday_service_total / month.sunday_service_count) : 0,
        midweekService: month.midweek_service_count ? Math.round(month.midweek_service_total / month.midweek_service_count) : 0,
        specialEvent: month.special_event_count ? Math.round(month.special_event_total / month.special_event_count) : 0,
      };
    });
};

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
  const responseData = await buildAttendanceTrends(db, qMonths);

  return c.json({
    success: true,
    data: responseData,
  });
});

export default analytics;
