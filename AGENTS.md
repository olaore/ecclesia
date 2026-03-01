# Nehemiah AI Agent Guidelines (AGENTS.md)

This document contains rules, architecture boundaries, and preferred tools for AI coding agents working on the Nehemiah CMS Monorepo. **Always refer to these guidelines before making architectural decisions.**

## 1. Tech Stack Overview

| Domain | Technology | Notes |
|---|---|---|
| **Package Manager** | `pnpm` | Use `pnpm` workspaces for the monorepo structure. |
| **Backend API** | Hono.js (TypeScript) | Targeting Cloudflare Workers, entirely decoupled from the DB client via Context DI. |
| **Database ORM** | Drizzle ORM | Portable and type-safe. Tied to Cloudflare D1 by default. |
| **Frontend Web** | Vite + React SPA | PWA with limited offline support (No Next.js/SSR overhead). |
| **State Management** | Zustand + TanStack Query | Zustand for local UI state, TanStack Query for server state cache. |
| **Validation** | Zod | End-to-end schema validation (Shared in `packages/core`). |
| **Data Tools** | Python + `uv` | Used only for one-off CSV scripts in `tools/data-importer/`. |

## 2. Architecture & Design Principles

### Feature-Based Modularity
Code must be organized by feature, not by technical type. 
*   **Good**: `src/features/calendar/components/`, `src/features/calendar/api/`
*   **Bad**: `src/components/Calendar/`, `src/api/calendar.ts`

### Dependency Injection over Hardcoding
*   **Backend**: Pass database instances via Hono's Context (`c.get('db')`). Do not instantiate database connections globally inside route files.
*   **Frontend**: Use Zustand for lightweight global state management and TanStack Query for all server-state (fetching, caching, mutations).

### Multi-Tenancy & Portability
Always build with the assumption that the system will run multiple churches (one D1 Database per church) or be exported for a self-hosted user running on a generic Node.js VPS. Never lock business logic into Cloudflare-specific vendor SDKs beyond the edge initialization.

### Offline Scope (Limited)
Offline capabilities are **strictly limited** to:
- Logging weekly attendance during a service.
- Capturing secretary meeting notes.

All other operations (adding/editing members, managing guests, admin tasks) **require an active internet connection**. Do not design offline-first sync logic for CRUD operations.

### Audit Trail
Every data mutation (CREATE, UPDATE, DELETE, MERGE) across the system must be logged to the `audit_logs` table with `adminId`, `entityType`, `entityId`, and a JSON diff of changes.

## 3. Database Entity Overview

| Table | Purpose |
|---|---|
| `members` | Core verified church members with full demographic data. |
| `guests` | First-time/returning visitors. Promotable to `members` when they join. |
| `known_people` | Legacy birthday-only imports without contact info. |
| `member_notes` | Private admin notes attached to a member, tracked by `adminId`. |
| `audit_logs` | Universal change log for all entities. |

## 4. Workflow Rules (For AI Agents)

1. **Do not execute dangerous terminal commands blindly**: No `rm -rf` without explicit verification.
2. **Progressive Delivery**: Do not attempt to write 10 modules in one tool call. Scaffold -> Verify -> Implement -> Verify.
3. **NEVER USE `npm` or `npx` (STRICT WARNING)**: This is a `pnpm` monorepo. Using `npm` or `npx` can severely break dependencies and workspaces, resulting in dire consequences from the system. **Always use `pnpm`**, `pnpm dlx`, or `pnpm exec tsx` instead of `npm`, `npx`, or global installations.
4. **Types First**: Write `packages/core` schemas (Zod) and inferred TypeScript interfaces *before* writing the API endpoints or Frontend components that consume them.

### Security & Data Integrity Gotchas

5. **JSON Date Parsing**: Always use `z.coerce.date()` instead of `z.date()` when validating ISO date strings from JSON bodies. A standard `z.date()` will fail to parse the string during runtime requests.
6. **Mass Assignment & Soft-Deletes**: When creating `.partial()` schemas for update endpoints (e.g. `PATCH`), ensure you strictly `.omit()` protected fields like `id` and `isActive`. Do not allow users to perform soft-deletes via generic `PATCH` routes; force those actions through explicit `DELETE` routes so the audit log writes a `DELETE` action, not `UPDATE`.
7. **Atomic Operations for Audit Logs**: Every mutation must be audited. Do not write the main record and the audit log in separate `await db.insert()` statements. This creates a race condition (Audit Log Evaporation) where a network blip can cause the data change to succeed but the audit log to fail. Always wrap them in a `db.batch([])` or `db.transaction()` to ensure atomicity.
8. **Date-Safe Audit Diffs**: Never compare values with `!==` in audit diff builders — `new Date(x) !== new Date(x)` is always `true` in JavaScript (reference equality). Use the shared `buildAuditDiff()` utility from `apps/api/src/utils/audit.ts`, which compares Date objects by `.getTime()`. This prevents noisy phantom diffs when unchanged dates are sent back in PATCH payloads.
