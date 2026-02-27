# Engineering Standards & Implementation Directives

> This document defines the engineering conventions all code in this monorepo must follow. AI agents and human contributors should read this before writing any feature code.

---

## 1. API Design

### Versioning
All routes live under `/api/v1/`. When breaking changes are needed, a `/api/v2/` namespace is introduced while `/v1/` is maintained for backward compatibility.

### Request / Response Shape
```ts
// Success
{ "success": true, "data": T }

// Error
{ "success": false, "error": "Human-readable message" }

// Paginated lists
{ "success": true, "data": T[], "meta": { "page": 1, "perPage": 20, "total": 142, "totalPages": 8 } }
```

### Naming Conventions
- Routes: kebab-case plural nouns (`/api/v1/members`, `/api/v1/church-events`).
- Query params: camelCase (`?ageGroup=19-25&isActive=true`).
- Request/response bodies: camelCase JSON keys.

### HTTP Methods
| Action | Method | Example |
|---|---|---|
| List | `GET` | `GET /api/v1/members` |
| Detail | `GET` | `GET /api/v1/members/:id` |
| Create | `POST` | `POST /api/v1/members` |
| Update | `PATCH` | `PATCH /api/v1/members/:id` |
| Soft-delete | `DELETE` | `DELETE /api/v1/members/:id` |
| Bulk create | `POST` | `POST /api/v1/events/bulk` |
| Custom action | `POST` | `POST /api/v1/guests/:id/promote` |

### Validation
Every `POST` and `PATCH` body is validated with the corresponding Zod schema from `@nehemiah/core` before touching the database. Invalid payloads return `400` with structured error messages.

### Audit Logging
Every mutation (CREATE, UPDATE, DELETE, PROMOTE) writes a row to `audit_logs` with `adminId`, `entityType`, `entityId`, `action`, and a JSON diff of `changes`. This is non-negotiable.

---

## 2. Database Conventions

### Schema
- Table names: snake_case plural (`members`, `audit_logs`, `church_events`).
- Column names: snake_case (`full_name`, `dob_month`, `is_active`).
- Primary keys: UUID text, auto-generated via `crypto.randomUUID()`.
- Timestamps: Integer mode (`{ mode: 'timestamp' }`), not text ISO strings.
- Soft-delete: Use `isActive` boolean. Never hard-delete member-related data.

### Migrations
- All schema changes go through Drizzle's migration system (`drizzle-kit generate` → `drizzle-kit push`).
- Never manually edit D1 SQL outside of Drizzle.

---

## 3. Frontend Conventions

### State Management
- **Server state**: TanStack Query (fetching, caching, mutations, optimistic updates).
- **Client state**: Zustand stores. One store per feature domain (e.g., `useAuthStore`, `useAttendanceStore`).
- **Form validation**: Zod schemas imported from `@nehemiah/core`. The same schema that validates on the backend validates on the frontend.

### File Organization
Feature-based, not type-based:
```
src/features/members/
  ├── api/           # TanStack Query hooks (useMembers, useMember)
  ├── components/    # MembersTable, MemberForm, MemberDetail
  ├── pages/         # MembersPage, MemberDetailPage
  └── store.ts       # Zustand store (if needed)
```

### Components
- Prefer composition over inheritance.
- All interactive elements must have unique `id` attributes for testing.
- Use `lucide-react` for icons.

### Offline Support
- Only attendance forms and meeting notes use IndexedDB + background sync.
- All other features require an active internet connection.
- Use Workbox (via `vite-plugin-pwa`) for service worker and cache management.

---

## 4. TypeScript Conventions

- Strict mode enabled everywhere (`"strict": true`).
- No `any` types. Use `unknown` + type guards if the type is truly dynamic.
- Shared types and schemas live in `packages/core`. Never duplicate type definitions.
- Infer types from Zod schemas:
  ```ts
  export type Member = z.infer<typeof memberSchema>;
  ```

---

## 5. Error Handling

### Backend
- Use Hono's `HTTPException` for expected errors (400, 401, 403, 404).
- Unexpected errors bubble up to a global error handler that returns a generic `500` and logs the error.
- Never expose stack traces or internal details in production responses.

### Frontend
- TanStack Query `onError` callbacks handle API errors.
- Show user-friendly toast notifications, never raw error messages.

---

## 6. Security Rules

- All API routes (except `/api/v1/auth/login`) require a valid JWT.
- JWT payload includes `userId`, `role`, and `unitId` (for admins).
- Permission checks happen in middleware, not in individual handlers.
- PII (phone, email, address) is never logged or exposed in error messages.
- All audit log entries are immutable (append-only, no UPDATE or DELETE on `audit_logs`).

---

## 7. Git & Code Quality

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`).
- Format with Prettier before committing.
- No direct pushes to `main`. Use feature branches.
