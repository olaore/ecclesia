import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const membersTable = sqliteTable('members', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  homeAddress: text('home_address'),
  gender: text('gender'),
  ageGroup: text('age_group'),
  maritalStatus: text('marital_status'),
  occupation: text('occupation'),
  // We keep the raw department text for now.
  // In the future this can migrate to a foreign key linking to a strict `departments` table.
  department: text('department'),
  dobMonth: integer('dob_month'),
  dobDay: integer('dob_day'),

  anniversaryMonth: integer('anniversary_month'),
  anniversaryDay: integer('anniversary_day'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  dateJoined: integer('date_joined', { mode: 'timestamp' }),

  // Future: familyId: text('family_id').references(() => familiesTable.id)

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const memberNotesTable = sqliteTable('member_notes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  memberId: text('member_id').notNull().references(() => membersTable.id),
  adminId: text('admin_id').notNull(), // Tracks which admin wrote this note
  note: text('note').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const guestsTable = sqliteTable('guests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fullName: text('full_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  visitDate: integer('visit_date', { mode: 'timestamp' }),
  status: text('status').default('first_time').notNull(), // 'first_time' or 'joined'
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// For legacy birthday entries that haven't filled out the core form yet.
export const knownPeopleTable = sqliteTable('known_people', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  fullName: text('full_name').notNull(),
  dobMonth: integer('dob_month'),
  dobDay: integer('dob_day'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Generic Audit Trail for tracking 'who did what' across the system
export const auditLogsTable = sqliteTable('audit_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  entityType: text('entity_type').notNull(), // e.g., 'member', 'guest', 'note'
  entityId: text('entity_id').notNull(), // ID of the specific record altered
  action: text('action').notNull(), // e.g., 'CREATE', 'UPDATE', 'DELETE', 'MERGE'
  adminId: text('admin_id').notNull(), // Tracks who performed the action
  changes: text('changes'), // JSON string representing what changed (e.g., {"phone": {"old": "123", "new": "456"}})
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'), // 'sysadmin', 'superadmin', 'admin', 'user'
  unitId: text('unit_id'), // Scoped access for admins
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});
