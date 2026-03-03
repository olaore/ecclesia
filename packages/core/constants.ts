export const AGE_GROUPS = [
  '0-10',
  '11-18',
  '19-25',
  '26-30',
  '31-40',
  '41-50',
  '51-70',
  '71-upwards'
] as const;

export type AgeGroup = (typeof AGE_GROUPS)[number];

export const GENDERS = ['Male', 'Female'] as const;
export type Gender = (typeof GENDERS)[number];

export const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widower'] as const;
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];

export const ATTENDANCE_EVENT_TYPES = ['sunday_service', 'midweek_service', 'special_event'] as const;
export type AttendanceEventType = (typeof ATTENDANCE_EVENT_TYPES)[number];

export const CHURCH_EVENT_TYPES = ['conference', 'retreat', 'special_service', 'other'] as const;
export type ChurchEventType = (typeof CHURCH_EVENT_TYPES)[number];

export const EVENT_VISIBILITY = ['public', 'private'] as const;
export type EventVisibility = (typeof EVENT_VISIBILITY)[number];

export const USER_ROLES = ['sysadmin', 'superadmin', 'admin', 'user'] as const;
export type UserRoleValue = (typeof USER_ROLES)[number];

export const MEMBER_PROFILE_EDITOR_ROLES = ['sysadmin', 'superadmin'] as const;
