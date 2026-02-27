# Nehemiah CMS — Product Requirements Document (PRD)

> **Source**: Combined from `intro.md` (preplanning), iterative schema design, and user-defined MVP scope.

---

## 1. Problem Statement
The church runs on "Data Spaghetti"—disconnected Google Forms, Sheets, and Docs. This causes data silos, no relational integrity, manual birthday lists, fragile visitor tracking, and connectivity barriers for ushers.

---

## 2. MVP Scope (8 Features)

### 2.1 Auth & Permissions
Four role tiers, where capabilities are shaped by both role level and **unit assignment**:

| Role | Description |
|---|---|
| **Sysadmin** | IT administrator. Full system access including user management, system reset, and database operations. Cannot be demoted by anyone. |
| **SuperAdmin** | Minister / Pastor. Full data access. Can update the role of any user except Sysadmin. |
| **Admin** | Every Unit Head and Assistant. Can perform mutations *relevant to their unit* (e.g., Usher Lead records attendance, Visitation Lead manages guests). All Admins are typically exco members. |
| **User** | Basic logged-in member. Read-only access to public pages. Cannot perform mutations. (Future iteration.) |

**Unit-based capabilities for Admins:**
- **Ushering unit** → Can create/edit attendance records.
- **Visitation unit** → Can create guests, update guest status, promote guests to members.
- **Other units** → Can view members in their department, manage unit-specific data.

> [!NOTE]
> The `User` role (read-only basic members) is planned for a subsequent iteration. The MVP focuses on Sysadmin, SuperAdmin, and Admin roles.

- Login via Email + Password (OTP deferred to post-MVP).
- JWT tokens issued by Cloudflare Workers.
- All API routes are versioned under `/api/v1/`.

### 2.2 Data Seeding
- **Early MVP**: Use a TypeScript mock seed script to populate D1 with realistic fake data for development and testing.
- **Late MVP (M8)**: Finalize the Python harmonize script and seed from the real `master_members.csv` and `birthday.csv`.

### 2.3 Members Management
- Full CRUD with Zod validation and audit logging on every mutation.
- Soft-delete via `isActive` flag (never hard-delete).
- Fields: fullName, email, phone, homeAddress, gender, ageGroup, maritalStatus, occupation, department, dobMonth/Day, anniversaryMonth/Day, dateJoined.

### 2.4 Visitor / Guest Input
**UX Flow:**
1. Admin fills in guest details on a mobile-friendly form.
2. Tags guest as `first_time` or `joined`.
3. If `joined` → auto-promote to `members` table. Secretary dashboard and visitation lead and sysadmin highlights new members for profile completion.(have a newly joined members page for sys|superadmin and visitation lead)

### 2.5 Attendance Tracking (Offline-Capable)
- **Local-first**: Data saved to IndexedDB immediately.
- **Background sync**: Pushed to D1 if there's internet connection or when device reconnects.
- **Event types**: Sunday Service, Midweek Service, Special Event.
- Records per-event headcount + optional per-ageGroup(children/adults only) breakdown.

### 2.6 Celebrant Generation & Dashboard
- Auto-filter members by current month's birthdays and anniversaries.
- Secretary dashboard widgets: "This Week's Birthdays", "Next Month's Celebrants".
- DOB edits immediately refresh groupings.

### 2.7 Annual Church Events Calendar
- Calendar view of planned church activities for the year.
- SuperAdmin/Admin (Secretary-type) can create, edit, and delete events.
- **Bulk upload endpoint**: Events are typically planned in January for the entire year.
- **Visibility**: Events are either `public` (default) or `private`.
  - All logged-in users see public events.
  - **Exco members** (Admins who are unit heads/assistants) see all events, including private ones.
- Event types: Conference, Retreat, Special Service, etc.

### 2.8 Attendance Analytics
- Trend charts: Sunday vs. Midweek attendance over time.
- Growth/decline indicators.
- Dashboard view for SuperAdmins.

---

## 3. Database Tables (MVP)

| Table | Status | Purpose |
|---|---|---|
| `members` | ✅ Done | Core church members |
| `guests` | ✅ Done | Visitor tracking & promotion pipeline |
| `known_people` | ✅ Done | Legacy birthday imports |
| `member_notes` | ✅ Done | Private admin notes (with `adminId`) |
| `audit_logs` | ✅ Done | Universal change log |
| `users` | 🔲 Needed | Auth, roles, sessions |
| `attendance_events` | 🔲 Needed | Event-level attendance records |
| `attendance_records` | 🔲 Needed | Per-member check-ins |
| `church_events` | 🔲 Needed | Annual calendar events |

---

## 4. Post-MVP (Deferred)
- Departments table with many-to-many member assignments and roles.
- Family units table and member linking.
- Secretary meeting notes module.
- R2 media storage for member photos.
- Financials / reporting.
- OTP-based login.
