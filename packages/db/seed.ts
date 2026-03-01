import { faker } from '@faker-js/faker';
import * as fs from 'fs';
import * as path from 'path';
import { AGE_GROUPS, GENDERS, MARITAL_STATUSES } from '@nehemiah/core';
import { getNigerianFullName, getNigerianPhone, getNigerianAddress, getNigerianOccupation } from './nigerian-data';

const DEPARTMENTS = [
  'Choir',
  'Ushering',
  'Media',
  'Protocol',
  'Children',
  'Prayer',
  'Evangelism',
  'Welfare',
];

export function generateMembers(count: number) {
  return Array.from({ length: count }).map(() => {
    const isMarried = faker.datatype.boolean() && faker.number.int({ min: 1, max: 100 }) > 30;
    const gender = faker.helpers.arrayElement(GENDERS);
    return {
      id: faker.string.uuid(),
      fullName: getNigerianFullName(),
      email: faker.internet.email(),
      phone: getNigerianPhone(),
      homeAddress: getNigerianAddress(),
      gender,
      ageGroup: faker.helpers.arrayElement(AGE_GROUPS),
      maritalStatus: isMarried ? 'Married' : faker.helpers.arrayElement(MARITAL_STATUSES.filter(s => s !== 'Married')),
      occupation: getNigerianOccupation(),
      department: faker.helpers.arrayElement([...DEPARTMENTS, null]),
      dobMonth: faker.date.birthdate().getMonth() + 1,
      dobDay: faker.date.birthdate().getDate(),
      anniversaryMonth: isMarried ? faker.date.past().getMonth() + 1 : null,
      anniversaryDay: isMarried ? faker.date.past().getDate() : null,
      isActive: faker.datatype.boolean({ probability: 0.9 }),
      dateJoined: faker.date.past({ years: 5 }),
    };
  });
}

export function generateGuests(count: number) {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    fullName: getNigerianFullName(),
    email: faker.internet.email(),
    phone: getNigerianPhone(),
    visitDate: faker.date.recent({ days: 60 }),
    status: faker.helpers.arrayElement(['first_time', 'joined']),
  }));
}

export function generateKnownPeople(count: number) {
  return Array.from({ length: count }).map(() => ({
    id: faker.string.uuid(),
    fullName: getNigerianFullName(),
    dobMonth: faker.date.birthdate().getMonth() + 1,
    dobDay: faker.date.birthdate().getDate(),
  }));
}

export function generateUsers() {
  return [
    {
      id: faker.string.uuid(),
      email: 'sysadmin@eombc.com',
      passwordHash: '$pbkdf2-sha256$i=100000$c2c3ebc1f8d0d58280af6f8b6d74018f$1f48ea23300321533e745ef85474175b869b9d9fe5a1e582dcb14b073f7504c4',
      role: 'sysadmin',
    },
    {
      id: faker.string.uuid(),
      email: 'admin@eombc.com',
      passwordHash: '$pbkdf2-sha256$i=100000$c2c3ebc1f8d0d58280af6f8b6d74018f$1f48ea23300321533e745ef85474175b869b9d9fe5a1e582dcb14b073f7504c4',
      role: 'admin',
    }
  ];
}

export function generateAttendanceEvents(count: number, recordedBy: string) {
  return Array.from({ length: count }).map((_, index) => {
    const weeksAgo = Math.floor(index / 2);
    const isSundayService = index % 2 === 0;
    const serviceDate = faker.date.recent({ days: 7 * (weeksAgo + 1) });

    if (isSundayService) {
      serviceDate.setDate(serviceDate.getDate() - serviceDate.getDay());
      serviceDate.setHours(9, 0, 0, 0);
    } else {
      const daysUntilWednesday = (3 - serviceDate.getDay() + 7) % 7;
      serviceDate.setDate(serviceDate.getDate() + daysUntilWednesday);
      serviceDate.setHours(18, 0, 0, 0);
    }

    const adultsCount = faker.number.int(isSundayService ? { min: 70, max: 140 } : { min: 35, max: 90 });
    const childrenCount = isSundayService ? faker.number.int({ min: 10, max: 45 }) : faker.number.int({ min: 0, max: 20 });

    return {
      id: faker.string.uuid(),
      eventType: isSundayService ? 'sunday_service' : 'midweek_service',
      eventDate: serviceDate,
      headcount: adultsCount + childrenCount,
      adultsCount,
      childrenCount,
      notes: faker.helpers.maybe(() => faker.helpers.arrayElement([
        'Usher lead submitted count after closing prayer.',
        'Combined youth and adult attendance.',
        'Overflow section opened during service.',
        'Rain affected second service turnout.',
      ]), { probability: 0.45 }) ?? null,
      recordedBy,
    };
  }).sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
}

export function generateChurchEvents(count: number, createdBy: string) {
  const eventTypes = ['special_service', 'conference', 'retreat', 'other'] as const;

  return Array.from({ length: count }).map((_, index) => {
    const startDate = faker.date.soon({ days: 90 });
    startDate.setDate(startDate.getDate() + index * 2);
    startDate.setHours(faker.helpers.arrayElement([9, 10, 17, 18]), 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + faker.helpers.arrayElement([2, 3, 4, 6]));

    return {
      id: faker.string.uuid(),
      title: faker.helpers.arrayElement([
        'Workers Prayer Meeting',
        'Midyear Thanksgiving Service',
        'Leadership Retreat',
        'Evangelism Outreach',
        'Choir Rehearsal Bootcamp',
        'Youth Revival Night',
      ]),
      description: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.75 }) ?? null,
      eventType: faker.helpers.arrayElement(eventTypes),
      startDate,
      endDate,
      visibility: faker.helpers.arrayElement(['public', 'private']),
      createdBy,
    };
  }).sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return 'NULL';
  return Math.floor(date.getTime() / 1000).toString();
}

function currentTimestamp(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function generateSql() {
  const users = generateUsers();
  const members = generateMembers(50);
  const guests = generateGuests(20);
  const knownPeople = generateKnownPeople(30);
  const attendanceEvents = generateAttendanceEvents(16, users[1].id);
  const churchEvents = generateChurchEvents(8, users[1].id);

  let sql = `-- Nehemiah Seed Script\n-- Generated on ${new Date().toISOString()}\n\n`;

  sql += `DELETE FROM audit_logs;\n`;
  sql += `DELETE FROM attendance_events;\n`;
  sql += `DELETE FROM church_events;\n`;
  sql += `DELETE FROM member_notes;\n`;
  sql += `DELETE FROM guests;\n`;
  sql += `DELETE FROM known_people;\n`;
  sql += `DELETE FROM members;\n`;
  sql += `DELETE FROM users;\n\n`;

  sql += `-- Users\n`;
  users.forEach((u) => {
    sql += `INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (${escapeSql(u.id)}, ${escapeSql(u.email)}, ${escapeSql(u.passwordHash)}, ${escapeSql(u.role)}, ${currentTimestamp()}, ${currentTimestamp()});\n`;
  });

  sql += `\n-- Known People\n`;
  knownPeople.forEach((p) => {
    sql += `INSERT INTO known_people (id, full_name, dob_month, dob_day, created_at) VALUES (${escapeSql(p.id)}, ${escapeSql(p.fullName)}, ${p.dobMonth}, ${p.dobDay}, ${currentTimestamp()});\n`;
  });

  sql += `\n-- Guests\n`;
  guests.forEach((g) => {
    sql += `INSERT INTO guests (id, full_name, email, phone, visit_date, status, created_at, updated_at) VALUES (${escapeSql(g.id)}, ${escapeSql(g.fullName)}, ${escapeSql(g.email)}, ${escapeSql(g.phone)}, ${formatDate(g.visitDate)}, ${escapeSql(g.status)}, ${currentTimestamp()}, ${currentTimestamp()});\n`;
  });

  sql += `\n-- Members\n`;
  members.forEach((m) => {
    sql += `INSERT INTO members (id, full_name, email, phone, home_address, gender, age_group, marital_status, occupation, department, dob_month, dob_day, anniversary_month, anniversary_day, is_active, date_joined, created_at, updated_at) VALUES (${escapeSql(m.id)}, ${escapeSql(m.fullName)}, ${escapeSql(m.email)}, ${escapeSql(m.phone)}, ${escapeSql(m.homeAddress)}, ${escapeSql(m.gender)}, ${escapeSql(m.ageGroup)}, ${escapeSql(m.maritalStatus)}, ${escapeSql(m.occupation)}, ${escapeSql(m.department)}, ${m.dobMonth || 'NULL'}, ${m.dobDay || 'NULL'}, ${m.anniversaryMonth || 'NULL'}, ${m.anniversaryDay || 'NULL'}, ${m.isActive ? 1 : 0}, ${formatDate(m.dateJoined)}, ${currentTimestamp()}, ${currentTimestamp()});\n`;
  });

  sql += `\n-- Attendance Events\n`;
  attendanceEvents.forEach((event) => {
    sql += `INSERT INTO attendance_events (id, event_type, event_date, headcount, adults_count, children_count, notes, recorded_by, created_at, updated_at) VALUES (${escapeSql(event.id)}, ${escapeSql(event.eventType)}, ${formatDate(event.eventDate)}, ${event.headcount}, ${event.adultsCount}, ${event.childrenCount}, ${escapeSql(event.notes)}, ${escapeSql(event.recordedBy)}, ${currentTimestamp()}, ${currentTimestamp()});\n`;
  });

  sql += `\n-- Church Events\n`;
  churchEvents.forEach((event) => {
    sql += `INSERT INTO church_events (id, title, description, event_type, start_date, end_date, visibility, created_by, created_at, updated_at) VALUES (${escapeSql(event.id)}, ${escapeSql(event.title)}, ${escapeSql(event.description)}, ${escapeSql(event.eventType)}, ${formatDate(event.startDate)}, ${formatDate(event.endDate)}, ${escapeSql(event.visibility)}, ${escapeSql(event.createdBy)}, ${currentTimestamp()}, ${currentTimestamp()});\n`;
  });

  return sql;
}

const sqlOutput = generateSql();
const outputPath = path.join(__dirname, 'seed.sql');

fs.writeFileSync(outputPath, sqlOutput);
console.log(`\n✅ Seed SQL successfully written to ${outputPath}`);
console.log(`\n🚀 Run the following command to apply the mock data:`);
console.log(`pnpm --filter nehemiah-api exec wrangler d1 execute nehemiah-db --local --file=../packages/db/seed.sql\n`);
