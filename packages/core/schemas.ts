import { z } from "zod";
import {
  AGE_GROUPS,
  GENDERS,
  MARITAL_STATUSES,
  ATTENDANCE_EVENT_TYPES,
  CHURCH_EVENT_TYPES,
  EVENT_VISIBILITY,
  USER_ROLES,
} from "./constants";

// Example shared schema
export const memberSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  homeAddress: z.string().optional().nullable(),
  gender: z.enum(GENDERS).optional().nullable(),
  ageGroup: z.enum(AGE_GROUPS).optional().nullable(),
  maritalStatus: z.enum(MARITAL_STATUSES).optional().nullable(),
  occupation: z.string().optional().nullable(),
  department: z.string().optional().nullable(), // Will become an enum or FK later
  dobMonth: z.number().int().min(1).max(12).optional().nullable(),
  dobDay: z.number().int().min(1).max(31).optional().nullable(),
  anniversaryMonth: z.number().int().min(1).max(12).optional().nullable(),
  anniversaryDay: z.number().int().min(1).max(31).optional().nullable(),
  isActive: z.boolean().default(true),
  dateJoined: z.coerce.date().optional().nullable(),
});

export type Member = z.infer<typeof memberSchema>;

/** Schema for creating a new member (POST /api/v1/members) */
export const createMemberSchema = memberSchema.omit({ id: true, isActive: true });
export type CreateMemberRequest = z.infer<typeof createMemberSchema>;

/** Schema for updating a member (PATCH /api/v1/members/:id) — all fields optional */
export const updateMemberSchema = memberSchema.omit({ id: true, isActive: true }).partial();
export type UpdateMemberRequest = z.infer<typeof updateMemberSchema>;

export const knownPersonSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(1, "Full name is required"),
  dobMonth: z.number().int().min(1).max(12).optional().nullable(),
  dobDay: z.number().int().min(1).max(31).optional().nullable(),
});

export type KnownPerson = z.infer<typeof knownPersonSchema>;



export const guestSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  visitDate: z.coerce.date().optional().nullable(),
  status: z.enum(['first_time', 'joined']).default('first_time'),
});

export type Guest = z.infer<typeof guestSchema>;

/** Schema for logging a new visitor (POST /api/v1/guests) — status defaults server-side */
export const createGuestSchema = guestSchema.omit({ id: true, status: true });
export type CreateGuestRequest = z.infer<typeof createGuestSchema>;

/** Schema for updating guest details (PATCH /api/v1/guests/:id) — status protected */
export const updateGuestSchema = guestSchema.omit({ id: true, status: true }).partial();
export type UpdateGuestRequest = z.infer<typeof updateGuestSchema>;

export const auditLogSchema = z.object({
  id: z.string().uuid().optional(),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'MERGE']),
  adminId: z.string().min(1),
  changes: z.string().optional().nullable(), // JSON string
  createdAt: z.coerce.date().optional(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

// Auth & Users
export const userRoleSchema = z.enum(USER_ROLES);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: userRoleSchema,
  unitId: z.string().optional().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type User = z.infer<typeof userSchema>;

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type LoginRequest = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterRequest = z.infer<typeof registerSchema>;

export const authResponseSchema = z.object({
  token: z.string(),
  user: userSchema,
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Attendance

export const attendanceEventSchema = z.object({
  id: z.string().uuid().optional(),
  eventType: z.enum(ATTENDANCE_EVENT_TYPES),
  eventDate: z.coerce.date(),
  headcount: z.number().int().min(0, "Headcount must be 0 or more"),
  adultsCount: z.number().int().min(0).optional().nullable(),
  childrenCount: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type AttendanceEvent = z.infer<typeof attendanceEventSchema>;

/** Schema for recording an attendance event (POST /api/v1/attendance) */
export const createAttendanceSchema = attendanceEventSchema.omit({ id: true });
export type CreateAttendanceRequest = z.infer<typeof createAttendanceSchema>;

/** Schema for updating attendance (PATCH /api/v1/attendance/:id) */
export const updateAttendanceSchema = attendanceEventSchema.omit({ id: true }).partial();
export type UpdateAttendanceRequest = z.infer<typeof updateAttendanceSchema>;

// Annual Church Events Calendar

export const churchEventSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  eventType: z.enum(CHURCH_EVENT_TYPES),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  visibility: z.enum(EVENT_VISIBILITY).default("public"),
});

export type ChurchEvent = z.infer<typeof churchEventSchema>;

/** Schema for creating a church event (POST /api/v1/events) */
export const createChurchEventSchema = churchEventSchema.omit({ id: true });
export type CreateChurchEventRequest = z.infer<typeof createChurchEventSchema>;

/** Schema for bulk uploading events (POST /api/v1/events/bulk) */
export const bulkCreateChurchEventsSchema = z.array(createChurchEventSchema);
export type BulkCreateChurchEventsRequest = z.infer<typeof bulkCreateChurchEventsSchema>;

/** Schema for updating a church event (PATCH /api/v1/events/:id) */
export const updateChurchEventSchema = churchEventSchema.omit({ id: true }).partial();
export type UpdateChurchEventRequest = z.infer<typeof updateChurchEventSchema>;

// Member Notes
export const memberNoteSchema = z.object({
  id: z.string().uuid().optional(),
  memberId: z.string().uuid(),
  note: z.string().min(1, "Note cannot be empty"),
  adminId: z.string().uuid().optional(), // Auto-filled from JWT on create
  createdAt: z.coerce.date().optional(),
});

export type MemberNote = z.infer<typeof memberNoteSchema>;

/** Schema for creating a note (POST /api/v1/notes) */
export const createNoteSchema = memberNoteSchema.omit({ id: true, adminId: true, createdAt: true });
export type CreateNoteRequest = z.infer<typeof createNoteSchema>;

/** Schema for updating a note (PATCH /api/v1/notes/:id) */
export const updateNoteSchema = z.object({
  note: z.string().min(1, "Note cannot be empty")
});
export type UpdateNoteRequest = z.infer<typeof updateNoteSchema>;
