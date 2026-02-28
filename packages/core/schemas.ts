import { z } from "zod";
import { AGE_GROUPS, GENDERS, MARITAL_STATUSES } from "./constants";

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
  dateJoined: z.date().optional().nullable(),
});

export type Member = z.infer<typeof memberSchema>;

export const knownPersonSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(1, "Full name is required"),
  dobMonth: z.number().int().min(1).max(12).optional().nullable(),
  dobDay: z.number().int().min(1).max(31).optional().nullable(),
});

export type KnownPerson = z.infer<typeof knownPersonSchema>;

export const memberNoteSchema = z.object({
  id: z.string().uuid().optional(),
  memberId: z.string().uuid(),
  adminId: z.string().min(1, "Admin ID is required"),
  note: z.string().min(1),
  createdAt: z.date().optional(),
});

export type MemberNote = z.infer<typeof memberNoteSchema>;

export const guestSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  visitDate: z.date().optional().nullable(),
  status: z.enum(['first_time', 'joined']).default('first_time'),
});

export type Guest = z.infer<typeof guestSchema>;

export const auditLogSchema = z.object({
  id: z.string().uuid().optional(),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  action: z.enum(['CREATE', 'UPDATE', 'DELETE', 'MERGE']),
  adminId: z.string().min(1),
  changes: z.string().optional().nullable(), // JSON string
  createdAt: z.date().optional(),
});

export type AuditLog = z.infer<typeof auditLogSchema>;

// Auth & Users
export const userRoleSchema = z.enum(['sysadmin', 'superadmin', 'admin', 'user']);
export type UserRole = z.infer<typeof userRoleSchema>;

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: userRoleSchema,
  unitId: z.string().optional().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
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
