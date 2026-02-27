# Nehemiah Church Management System

A multi-tenant, loosely-coupled, offline-first PWA for automating church administrative operations.

> **Note**: This system was recently migrated to a modern pnpm monorepo architecture focusing on the Cloudflare ecosystem (Vite PWA + Cloudflare Workers + D1 Database).

## Architecture

This project is a monorepo consisting of:

- **`apps/web`**: Frontend Single Page Application (React + Vite + Tailwind), designed offline-first using `vite-plugin-pwa`.
- **`apps/api`**: Backend API serving as an edge function on Cloudflare Workers (Hono.js).
- **`packages/db`**: Database schema, Drizzle ORM setup, and migrations.
- **`packages/core`**: Shared Zod schemas, TypeScript interfaces, and domain models.
- **`tools/data-importer`**: Python utility scripts (e.g., legacy CSV data harmonization).

## Getting Started

### Prerequisites
- Node.js >= 20.0
- pnpm >= 9.0
- Python 3.10+ (only for `tools/data-importer`)

### Setup the Monorepo

```sh
# Clone the repository
git clone <repo-url>
cd nehemiah

# Install all dependencies across apps and packages
pnpm install

# Initialize local D1 database (Run migrations)
pnpm --filter nehemiah-api exec wrangler d1 migrations apply nehemiah-db --local

# Setup local secrets
cp apps/api/.dev.vars.example apps/api/.dev.vars
# Edit apps/api/.dev.vars to set your JWT_SECRET

# Start both the frontend and backend in parallel
pnpm dev
```

### Deployment

- The frontend (`apps/web`) is built as a static site and deployed to Cloudflare Pages.
- The backend (`apps/api`) is deployed to Cloudflare Workers via Wrangler.
- Shared logic lives strictly in the packages layer to allow for maximal portability if deploying outside of Cloudflare.

For deeper architectural context, read `docs/00-spine/SYSTEM_SPINE.md` and `AGENTS.md`.
