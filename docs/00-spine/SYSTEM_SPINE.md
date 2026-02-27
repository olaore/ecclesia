# System Spine & PRD (Nehemiah)

## 1. Product Vision
The Nehemiah Church Management System (CMS) is a multi-tenant, locally-deployable administrative suite designed to automate the work of church ICT departments and secretaries. It prioritizes near-zero ongoing hosting costs and extreme portability.

## 2. Core Entities & Features

### Phase 1: Core Automation (Current Focus)
1. **Members (Core Database)**: Full contact information, demographic details (gender, age group, marital status), department assignments, and lifecycle tracking (isActive, dateJoined).
2. **Guests & Visitors**: Separate tracking for first-time and returning visitors. Guests are promotable to full members when they commit.
3. **Attendance Tracking**: Weekly and event-specific participation records. Designed to work offline to survive WiFi drops mid-service.
4. **Birthdays & Celebrants**: Identifying known constituents (including legacy imports via `known_people` table) for automated monthly recognition.
5. **Private Admin Notes**: Per-member notes tracked by `adminId` for pastoral context.
6. **Audit Trail**: Universal change log tracking who did what, when, and the JSON diff of changes.

### Phase 2: Growth & Operations (Future)
7. **Departments**: Strict enum table (~12 departments) with many-to-many member assignments.
8. **Families**: Family unit groupings linking members together.
9. **Calendar & Year Activities**: Executive committee (exco) planning dashboard for annual events.
10. **Secretary Notes & Minutes**: Module for capturing and distributing meeting minutes securely to excos.
11. **Financials/Reporting**: Basic ledger and health reporting capabilities.

## 3. Technical Architecture (The Spine)
A single Monorepo (pnpm workspaces) connecting a React Vite PWA (Frontend) to a Cloudflare Workers API (Backend) backed by D1 (SQLite).

### Hosting & Deployment
- **Frontend**: Cloudflare Pages (Static PWA built by Vite).
- **Backend API**: Cloudflare Workers (Hono + TypeScript).
- **Database**: Cloudflare D1 (SQLite-based, horizontally scalable per tenant).

### Key Architectural Decisions
- **Multi-tenant isolation**: 1 Church = 1 D1 Database instance. No Row-Level Security complexity.
- **Backend Portability (No Lock-in)**: Hono.js + Drizzle ORM. Moving to Node + SQLite requires modifying only the bootstrap entry file.
- **Offline Scope (Limited)**: The frontend caches the application shell and critical read-only data locally using Service Workers. Offline mutations are *only* for logging weekly attendance and capturing secretary meeting notes. Core CRUD operations require an active internet connection.
- **Dependency Injection**: Hono injects the DB context into handlers. React uses Zustand for state and TanStack Query for server-state caching.

## 4. Design Aesthetics
- Dark modes, curated HSL color palettes, and glassmorphism.
- Micro-animations and high perceived performance.

## 5. Security Model
- Standard JWT or Cloudflare Access-based authentication.
- Member PII is securely segmented per tenant database instance.
- All data mutations are logged in the `audit_logs` table with admin attribution.
