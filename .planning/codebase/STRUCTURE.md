# Codebase Structure

**Analysis Date:** 2026-08-28

## Directory Layout

```
isian/
├── .agent/              # GSD agent definitions, core scripts, workflows, and skills
├── infra/               # Infrastructure configs
│   └── nginx/           # Nginx proxy configuration for benchmark load balancing
├── load-tests/          # k6 load and performance testing scripts
├── prisma/              # Database schema definitions and SQL migrations
│   └── migrations/      # Version-controlled PostgreSQL migration scripts
├── scripts/             # Operational runtime scripts (background submission worker)
├── src/                 # Main application source code
│   ├── app/             # Next.js 16 App Router (pages and API handlers)
│   │   ├── admin/       # Gated admin dashboard routes (forms list, editor, submissions)
│   │   ├── api/         # Next.js route handlers (admin, public, internal, health, auth)
│   │   ├── f/           # Public form submission journey routes (/f/[slug])
│   │   ├── success/     # Public post-submission success confirmation page
│   │   ├── globals.css  # Global styles and design system variables
│   │   └── layout.tsx   # Root application layout
│   ├── components/      # React client and server UI components
│   └── lib/             # Core business logic, auth, prisma, rate limiting, and helpers
├── Dockerfile           # Multi-stage production container build
├── docker-compose.yml   # Multi-service local/production runtime orchestration
├── package.json         # Project metadata, scripts, and dependencies
├── tsconfig.json        # TypeScript compiler options and path aliases (@/* -> src/*)
└── vitest.config.ts     # Unit testing configuration
```

## Directory Purposes

**`infra/`**
- Purpose: Infrastructure and reverse proxy configurations.
- Contains: Nginx configuration files.
- Key files: `infra/nginx/benchmark.conf` — Multi-upstream load balancer configuration.

**`load-tests/`**
- Purpose: Automated performance and stress testing.
- Contains: k6 scenario scripts.
- Key files: `load-tests/public-form-journey.k6.js` — Public form viewing and submission journey load test.

**`prisma/`**
- Purpose: Database modeling and migration tracking.
- Contains: Prisma schema and raw SQL migration files.
- Key files: `prisma/schema.prisma` — Database schema definitions.

**`scripts/`**
- Purpose: Operational background workers and maintenance tasks.
- Contains: Node.js worker scripts.
- Key files: `scripts/submission-worker.mjs` — Polling worker for asynchronous form submission jobs.

**`src/app/`**
- Purpose: Next.js App Router filesystem routes and REST APIs.
- Contains: `page.tsx`, `layout.tsx`, `route.ts`.
- Key files:
  - `src/app/page.tsx` — Root redirector to admin forms or login.
  - `src/app/f/[slug]/page.tsx` — Public form display page.
  - `src/app/admin/forms/page.tsx` — Admin forms list page.
  - `src/app/admin/forms/[id]/submissions/page.tsx` — Admin submissions viewer.

**`src/components/`**
- Purpose: Interactive React components and design elements.
- Contains: Client/server components.
- Key files:
  - `src/components/AttendanceForm.tsx` — Main interactive public form engine component.
  - `src/components/AdminFormEditor.tsx` — Form builder editor component.
  - `src/components/AdminFormSubmissions.tsx` — Submissions table, filters, and analytics viewer.
  - `src/components/SignaturePad.tsx` — Canvas signature drawing pad component.
  - `src/components/SearchableSelect.tsx` — Dropdown select with filtering.
  - `src/components/ThemeToggle.tsx` — Light/dark theme switcher.

**`src/lib/`**
- Purpose: Domain services, database access, validation, rate limiting, and helpers.
- Contains: TypeScript business logic modules and test files.
- Key files:
  - `src/lib/forms.ts` — Comprehensive form domain engine.
  - `src/lib/auth.ts` — NextAuth setup and admin email allowlist logic.
  - `src/lib/prisma.ts` — Prisma client initialization with connection pooling.
  - `src/lib/rate-limit.ts` — In-memory sliding-window rate limiter.
  - `src/lib/ai-analysis.ts` — LLM-driven qualitative analysis service.

## Key File Locations

**Entry Points:**
- `src/app/page.tsx` — Web entry point.
- `scripts/submission-worker.mjs` — Background queue daemon entry point.

**Configuration:**
- `tsconfig.json` — TypeScript path alias (`@/*`).
- `next.config.ts` — Next.js configuration.
- `eslint.config.mjs` — ESLint flat config.
- `vitest.config.ts` — Vitest configuration.
- `.env.example` — Environment variables template.

**Core Logic:**
- `src/lib/forms.ts` — Forms engine, validation, and submission processing.
- `src/lib/ai-analysis.ts` — AI qualitative insights generation.

**Testing:**
- `src/lib/*.test.ts` — Collocated unit and integration tests.
- `load-tests/public-form-journey.k6.js` — k6 performance testing.

## Naming Conventions

**Files:**
- `PascalCase.tsx` — React UI components (e.g. `AdminFormEditor.tsx`).
- `kebab-case.ts` — TypeScript utility and domain service modules (e.g. `rate-limit.ts`).
- `*.test.ts` — Collocated test files (e.g. `forms.test.ts`).
- `page.tsx` / `route.ts` / `layout.tsx` — Next.js App Router conventions.

**Directories:**
- `kebab-case` — General folders (e.g. `submission-jobs`).
- `[param]` — Dynamic route folders (e.g. `[slug]`, `[id]`).

## Where to Add New Code

**New Form Features / Field Types:**
- Domain logic & validation: `src/lib/forms.ts`
- Tests: `src/lib/forms.test.ts`
- Form UI rendering: `src/components/AttendanceForm.tsx`
- Admin Builder: `src/components/AdminFormEditor.tsx`

**New API Endpoints:**
- Admin routes: `src/app/api/admin/[feature]/route.ts`
- Public routes: `src/app/api/public/[feature]/route.ts`

**New Reusable UI Components:**
- Implementation: `src/components/[ComponentName].tsx`
- Import via `@/components/[ComponentName]`

**New Worker Jobs:**
- Job processing logic: `src/lib/forms.ts` inside `processQueuedSubmissionJobs()`
- Invocation handler: `src/app/api/internal/submission-jobs/process/route.ts`

---

*Structure analysis: 2026-08-28*
