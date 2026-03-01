import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, asc, sql, isNotNull, and, or, gte, lte } from "drizzle-orm";
import { unionAll } from "drizzle-orm/sqlite-core";
import { membersTable, knownPeopleTable } from "@nehemiah/db/schema";
import { verifyJWT, hasRole } from "../middleware/auth";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

const celebrants = new Hono<{ Bindings: Bindings }>();

// All routes require authentication + admin-level role
celebrants.use("/*", (c, next) => verifyJWT(c.env.JWT_SECRET)(c, next));
celebrants.use("/*", hasRole(["sysadmin", "superadmin", "admin"]));

/**
 * Helper to get the start and end days for the current week (Sunday to Saturday)
 * relative to the current month, to filter out upcoming birthdays in the same month.
 */
function getCurrentWeekRange() {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
  const diffToSunday = dayOfWeek;
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - diffToSunday);

  const saturday = new Date(sunday);
  saturday.setDate(sunday.getDate() + 6);

  return {
    startMonth: sunday.getMonth() + 1,
    startDay: sunday.getDate(),
    endMonth: saturday.getMonth() + 1,
    endDay: saturday.getDate(),
  };
}

/**
 * GET /birthdays — List upcoming birthdays
 * 
 * Query params:
 *   month (1-12)
 *   week (if present, filters for the current week)
 * 
 * Unions members and known_people tables.
 */
celebrants.get("/birthdays", async (c) => {
  const db = drizzle(c.env.DB);
  const qMonth = c.req.query("month");
  const qWeek = c.req.query("week");

  // Predicates for Member query
  let memberPredicates = [eq(membersTable.isActive, true)];

  // Predicates for KnownPerson query
  let knownPersonPredicates: any[] = [];

  if (qWeek === "true") {
    const { startMonth, startDay, endMonth, endDay } = getCurrentWeekRange();

    // Support weeks that overlap two months
    if (startMonth === endMonth) {
      memberPredicates.push(
        eq(membersTable.dobMonth, startMonth),
        gte(membersTable.dobDay, startDay),
        lte(membersTable.dobDay, endDay)
      );
      knownPersonPredicates.push(
        eq(knownPeopleTable.dobMonth, startMonth),
        gte(knownPeopleTable.dobDay, startDay),
        lte(knownPeopleTable.dobDay, endDay)
      );
    } else {
      memberPredicates.push(
        or(
          and(eq(membersTable.dobMonth, startMonth), gte(membersTable.dobDay, startDay)),
          and(eq(membersTable.dobMonth, endMonth), lte(membersTable.dobDay, endDay))
        )!
      );
      knownPersonPredicates.push(
        or(
          and(eq(knownPeopleTable.dobMonth, startMonth), gte(knownPeopleTable.dobDay, startDay)),
          and(eq(knownPeopleTable.dobMonth, endMonth), lte(knownPeopleTable.dobDay, endDay))
        )!
      );
    }
  } else if (qMonth) {
    const m = parseInt(qMonth, 10);
    memberPredicates.push(eq(membersTable.dobMonth, m));
    knownPersonPredicates.push(eq(knownPeopleTable.dobMonth, m));
  }

  // Build builders without initial where
  const membersQueryBuilder = db
    .select({
      id: membersTable.id,
      fullName: membersTable.fullName,
      month: membersTable.dobMonth,
      day: membersTable.dobDay,
      source: sql<string>`'member'`.as("source"),
    })
    .from(membersTable);

  const knownPeopleQueryBuilder = db
    .select({
      id: knownPeopleTable.id,
      fullName: knownPeopleTable.fullName,
      month: knownPeopleTable.dobMonth,
      day: knownPeopleTable.dobDay,
      source: sql<string>`'known_person'`.as("source"),
    })
    .from(knownPeopleTable);

  // Apply where exactly once
  const membersQuery = membersQueryBuilder.where(and(...memberPredicates));
  const knownPeopleQuery = knownPersonPredicates.length > 0
    ? knownPeopleQueryBuilder.where(and(...knownPersonPredicates))
    : knownPeopleQueryBuilder;

  const unionQuery = unionAll(membersQuery as any, knownPeopleQuery as any)
    .orderBy(asc(sql`dob_month`), asc(sql`dob_day`));

  const results = await unionQuery;

  return c.json({
    success: true,
    data: results,
  });
});

/**
 * GET /anniversaries — List wedding anniversaries
 * 
 * Query params:
 *   month (1-12)
 * 
 * Only active members have anniversaries tracked currently.
 */
celebrants.get("/anniversaries", async (c) => {
  const db = drizzle(c.env.DB);
  const qMonth = c.req.query("month");

  let predicates = [
    eq(membersTable.isActive, true),
    isNotNull(membersTable.anniversaryMonth)
  ];

  if (qMonth) {
    const m = parseInt(qMonth, 10);
    predicates.push(eq(membersTable.anniversaryMonth, m));
  }

  // Use native orderBy and await
  const results = await db
    .select({
      id: membersTable.id,
      fullName: membersTable.fullName,
      month: membersTable.anniversaryMonth,
      day: membersTable.anniversaryDay,
    })
    .from(membersTable)
    .where(and(...predicates))
    .orderBy(
      asc(membersTable.anniversaryMonth),
      asc(membersTable.anniversaryDay)
    );

  return c.json({
    success: true,
    data: results,
  });
});

/**
 * GET / — Unified list of Birthdays & Anniversaries
 * 
 * Query params:
 *   month (1-12)
 */
celebrants.get("/", async (c) => {
  const db = drizzle(c.env.DB);
  const qMonth = c.req.query("month");

  // Predicates for Member birthdays
  let memberBdayPredicates = [eq(membersTable.isActive, true)];
  let knownPersonBdayPredicates: any[] = [];

  // Predicates for Anniversaries
  let memberAnniversaryPredicates = [
    eq(membersTable.isActive, true),
    isNotNull(membersTable.anniversaryMonth)
  ];

  if (qMonth) {
    const m = parseInt(qMonth, 10);
    memberBdayPredicates.push(eq(membersTable.dobMonth, m));
    knownPersonBdayPredicates.push(eq(knownPeopleTable.dobMonth, m));
    memberAnniversaryPredicates.push(eq(membersTable.anniversaryMonth, m));
  } else {
    // If no month provided, use current month
    const m = new Date().getMonth() + 1;
    memberBdayPredicates.push(eq(membersTable.dobMonth, m));
    knownPersonBdayPredicates.push(eq(knownPeopleTable.dobMonth, m));
    memberAnniversaryPredicates.push(eq(membersTable.anniversaryMonth, m));
  }

  // Fetch birthdays
  const membersBdayQuery = db
    .select({
      id: membersTable.id,
      fullName: membersTable.fullName,
      month: membersTable.dobMonth,
      day: membersTable.dobDay,
      source: sql<string>`'member'`.as("source"),
    })
    .from(membersTable)
    .where(and(...memberBdayPredicates));

  let knownPeopleBdayQuery;
  if (knownPersonBdayPredicates.length > 0) {
    knownPeopleBdayQuery = db
      .select({
        id: knownPeopleTable.id,
        fullName: knownPeopleTable.fullName,
        month: knownPeopleTable.dobMonth,
        day: knownPeopleTable.dobDay,
        source: sql<string>`'known_person'`.as("source"),
      })
      .from(knownPeopleTable)
      .where(and(...knownPersonBdayPredicates));
  } else {
    knownPeopleBdayQuery = db
      .select({
        id: knownPeopleTable.id,
        fullName: knownPeopleTable.fullName,
        month: knownPeopleTable.dobMonth,
        day: knownPeopleTable.dobDay,
        source: sql<string>`'known_person'`.as("source"),
      })
      .from(knownPeopleTable);
  }

  const birthdays = await unionAll(membersBdayQuery as any, knownPeopleBdayQuery as any);

  // Fetch anniversaries
  const anniversaries = await db
    .select({
      id: membersTable.id,
      fullName: membersTable.fullName,
      month: membersTable.anniversaryMonth,
      day: membersTable.anniversaryDay,
      source: sql<string>`'member'`.as("source"),
    })
    .from(membersTable)
    .where(and(...memberAnniversaryPredicates));

  // Map to unified Celebrant interface
  const unified = [
    ...birthdays.map((b: any) => ({
      id: b.id,
      fullName: b.fullName,
      type: b.source,
      celebrationType: "birthday" as const,
      day: b.day,
      month: b.month,
    })),
    ...anniversaries.map((a: any) => ({
      id: a.id,
      fullName: a.fullName,
      type: a.source,
      celebrationType: "anniversary" as const,
      day: a.day,
      month: a.month,
    }))
  ];

  // Sort by day inside the month
  unified.sort((a, b) => (a.day || 0) - (b.day || 0));

  return c.json({
    success: true,
    data: unified,
  });
});

export default celebrants;
