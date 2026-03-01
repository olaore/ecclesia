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

function escapeSql(str: string | null | undefined): string {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return 'NULL';
  return Math.floor(date.getTime()).toString();
}

function generateSql() {
  const users = generateUsers();
  const members = generateMembers(50);
  const guests = generateGuests(20);
  const knownPeople = generateKnownPeople(30);

  let sql = `-- Nehemiah Seed Script\n-- Generated on ${new Date().toISOString()}\n\n`;

  sql += `DELETE FROM audit_logs;\n`;
  sql += `DELETE FROM member_notes;\n`;
  sql += `DELETE FROM guests;\n`;
  sql += `DELETE FROM known_people;\n`;
  sql += `DELETE FROM members;\n`;
  sql += `DELETE FROM users;\n\n`;

  sql += `-- Users\n`;
  users.forEach((u) => {
    sql += `INSERT INTO users (id, email, password_hash, role, created_at, updated_at) VALUES (${escapeSql(u.id)}, ${escapeSql(u.email)}, ${escapeSql(u.passwordHash)}, ${escapeSql(u.role)}, ${Date.now()}, ${Date.now()});\n`;
  });

  sql += `\n-- Known People\n`;
  knownPeople.forEach((p) => {
    sql += `INSERT INTO known_people (id, full_name, dob_month, dob_day, created_at) VALUES (${escapeSql(p.id)}, ${escapeSql(p.fullName)}, ${p.dobMonth}, ${p.dobDay}, ${Date.now()});\n`;
  });

  sql += `\n-- Guests\n`;
  guests.forEach((g) => {
    sql += `INSERT INTO guests (id, full_name, email, phone, visit_date, status, created_at, updated_at) VALUES (${escapeSql(g.id)}, ${escapeSql(g.fullName)}, ${escapeSql(g.email)}, ${escapeSql(g.phone)}, ${formatDate(g.visitDate)}, ${escapeSql(g.status)}, ${Date.now()}, ${Date.now()});\n`;
  });

  sql += `\n-- Members\n`;
  members.forEach((m) => {
    sql += `INSERT INTO members (id, full_name, email, phone, home_address, gender, age_group, marital_status, occupation, department, dob_month, dob_day, anniversary_month, anniversary_day, is_active, date_joined, created_at, updated_at) VALUES (${escapeSql(m.id)}, ${escapeSql(m.fullName)}, ${escapeSql(m.email)}, ${escapeSql(m.phone)}, ${escapeSql(m.homeAddress)}, ${escapeSql(m.gender)}, ${escapeSql(m.ageGroup)}, ${escapeSql(m.maritalStatus)}, ${escapeSql(m.occupation)}, ${escapeSql(m.department)}, ${m.dobMonth || 'NULL'}, ${m.dobDay || 'NULL'}, ${m.anniversaryMonth || 'NULL'}, ${m.anniversaryDay || 'NULL'}, ${m.isActive ? 1 : 0}, ${formatDate(m.dateJoined)}, ${Date.now()}, ${Date.now()});\n`;
  });

  return sql;
}

const sqlOutput = generateSql();
const outputPath = path.join(__dirname, 'seed.sql');

fs.writeFileSync(outputPath, sqlOutput);
console.log(`\n✅ Seed SQL successfully written to ${outputPath}`);
console.log(`\n🚀 Run the following command to apply the mock data:`);
console.log(`pnpm --filter nehemiah-api exec wrangler d1 execute nehemiah-db --local --file=../packages/db/seed.sql\n`);
