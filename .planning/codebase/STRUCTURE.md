# Codebase Structure

**Analysis Date:** 2026-07-16

## Directory Layout

```
[project-root]/
├── infra/              # Infrastructure settings
│   └── nginx/          # Nginx proxy profiles
├── load-tests/         # k6 performance test configurations
├── prisma/             # Schema definitions and database migrations
│   └── migrations/     # PostgreSQL schema version histories
├── scripts/            # Operational automation scripts (background task worker)
├── src/                # Primary source code directory
│   ├── app/            # Next.js App Router (pages and API handlers)
│   │   ├── admin/      # Gated dashboard portals
│   │   ├── api/        # REST endpoints (public, admin, internal)
│   │   ├── f/          # Public form view pages
│   │   └── success/    # Confirmation screen pages
│   ├── components/     # React presentation components
│   └── lib/            # Shared modules, engines, and validators
├── package.json        # Node dependency configurations
└── tsconfig.json       # TypeScript options
```

## Directory Purposes

**infra/**
- Purpose: Operational environments configurations.
- Contains: Nginx configuration files.
- Key files: `infra/nginx/benchmark.conf` - load-balancer configuration for benchmark profiles.

**load-tests/**
- Purpose: Automated performance validation.
- Contains: k6 scripts.
- Key files: `load-tests/public-form-journey.k6.js` - benchmark script for load checking form operations.

**prisma/**
- Purpose: Database configuration and migrations.
- Contains: SQL scripts and ORM models.
- Key files: `prisma/schema.prisma` - DB structure specifications.

**scripts/**
- Purpose: Operational runtime scripts.
- Contains: Node.js background tasks.
- Key files: `scripts/submission-worker.mjs` - worker polling process.

**src/app/**
- Purpose: Application router defining paths.
- Contains: Pages, layouts, and route handlers.
- Key files:
  - `src/app/page.tsx` - Root redirect page.
  - `src/app/f/[slug]/page.tsx` - Entry route for form submissions.

**src/components/**
- Purpose: UI Components.
- Contains: Client and server React modules.
- Key files:
  - `src/components/AttendanceForm.tsx` - Form layout engine component.
  - `src/components/AdminFormEditor.tsx` - Form creation builder interface component.

**src/lib/**
- Purpose: System business logic libraries.
- Contains: Modules, database configurations, and test files.
- Key files:
  - `src/lib/forms.ts` - Forms engine logic.
  - `src/lib/ai-analysis.ts` - LLM analysis helper.
  - `src/lib/rate-limit.ts` - IP throttling utility.

## Key File Locations

**Entry Points:**
- `src/app/page.tsx` - Home redirect handler.
- `scripts/submission-worker.mjs` - Operational queue worker.

**Configuration:**
- `tsconfig.json` - TypeScript settings.
- `next.config.ts` - Next.js compiler settings.
- `eslint.config.mjs` - Linter config.
- `vitest.config.ts` - Test framework settings.
- `prisma.config.ts` - Database layout mappings.

**Core Logic:**
- `src/lib/forms.ts` - System core controller.
- `src/lib/ai-analysis.ts` - LLM generator handler.

**Testing:**
- `src/lib/*.test.ts` - Unit and integration tests alongside source files.
- `load-tests/` - k6 benchmark configs.

## Naming Conventions

**Files:**
- `PascalCase.tsx` - React UI components (e.g., `SignaturePad.tsx`).
- `kebab-case.ts` - Typescript modules (e.g., `rate-limit.ts`).
- `*.test.ts` - Unit tests located directly alongside source files (e.g., `rate-limit.test.ts`).
- `page.tsx` / `route.ts` / `layout.tsx` - App router structure files.

**Directories:**
- `kebab-case` - Standard folder names (e.g., `submission-jobs`).
- `[param]` / `[...param]` - Dynamic route paths (e.g., `[slug]`, `[id]`).

## Where to Add New Code

**New Form Settings/Logic:**
- Implementation: Add to `src/lib/forms.ts`.
- Tests: Add to `src/lib/forms.test.ts`.

**New UI Components:**
- Implementation: Add to `src/components/`.
- Usage: Import component from `@/components/ComponentName`.

**New Admin API Endpoints:**
- Implementation: Add new route file `src/app/api/admin/[endpoint]/route.ts`.

**New Background Jobs / Workflows:**
- Implementation: Register handlers in `src/lib/forms.ts` under `processQueuedSubmissionJobs()`.

---

*Structure analysis: 2026-07-16*
*Update when directory structure changes*
