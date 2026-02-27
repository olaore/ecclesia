import { z } from "zod";

// Example shared schema
export const memberSchema = z.object({
  id: z.string().uuid().optional(),
  fullName: z.string().min(1, "Full name is required"),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  homeAddress: z.string().optional().nullable(),
  gender: z.enum(['Male', 'Female']).optional().nullable(),
  ageGroup: z.enum([
    '0-10',
    '11-18',
    '19-25',
    '26-30',
    '31-40',
    '41-50',
    '51-70',
    '71-upwards'
  ]).optional().nullable(),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widower']).optional().nullable(),
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
  status: z.enum(['first_time', 'returning', 'joined']).default('first_time'),
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
