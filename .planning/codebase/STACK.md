# Technology Stack

**Analysis Date:** 2026-08-28

## Languages

**Primary:**
- TypeScript 5.x - Used for all application logic, React components, and API routes.

**Secondary:**
- JavaScript / ESM - Used for build/dev configurations (`eslint.config.mjs`) and operational scripts (`scripts/submission-worker.mjs`, `load-tests/public-form-journey.k6.js`).

## Runtime

**Environment:**
- Node.js 22 (pinned to `node:22-alpine` in `Dockerfile`)
- Browser runtime for public forms and admin dashboards

**Package Manager:**
- npm (lockfile `package-lock.json` present and canonical)

## Frameworks

**Core:**
- Next.js 16.2.4 (App Router, standalone output mode configured in `next.config.ts`)
- React 19.2.3 (UI rendering with React 19 hooks)

**Testing:**
- Vitest 4.1.5 (unit and integration tests)
- k6 (load testing under `load-tests/`)

**Build/Dev:**
- TypeScript Compiler (`tsconfig.json`)
- ESLint 9 (Flat Config via `eslint.config.mjs` with `eslint-config-next`)

## Key Dependencies

**Critical:**
- `@prisma/client` ^7.4.2 & `@prisma/adapter-pg` ^7.4.2 - Database client/ORM mapping with PostgreSQL driver adapter.
- `next-auth` ^4.24.13 - Google OAuth authentication and session management for `/admin` pages.
- `signature_pad` ^5.1.3 - Digital signature capture on canvas elements in attendance forms.
- `exceljs` ^4.4.0 - Form submissions export to Excel (.xlsx) / CSV.
- `dotenv` ^17.3.1 - Environment variable parsing.

**Infrastructure:**
- `pg` - PostgreSQL connection client adapter.
- `@hono/node-server` - Dependency override.

## Configuration

**Environment:**
- Configured via `.env` (development) and `.env.production` (production Docker Compose).
- Template: `.env.example`
- Key variables:
  - `DATABASE_URL` - PostgreSQL connection string.
  - `NEXTAUTH_URL` & `NEXTAUTH_SECRET` - NextAuth base URL (port 3456) and secret token.
  - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - Google OAuth credentials.
  - `ADMIN_EMAILS` - Comma-separated allowlist of administrator emails.
  - `INTERNAL_WORKER_TOKEN` - Shared secret for background worker API invocation.
  - `DB_POOL_MAX`, `DB_POOL_MIN`, `DB_POOL_CONNECTION_TIMEOUT_MS`, `DB_POOL_IDLE_TIMEOUT_MS` - Connection pool settings.
  - `RATE_LIMIT_SINGLE_INSTANCE_OK` - Safety guard for single-instance in-memory rate limiting.
  - `LLM_API_KEY`, `LLM_API_BASE`, `LLM_MODEL` - OpenAI-compatible LLM endpoint settings for AI qualitative analysis.

**Build:**
- `tsconfig.json` - TypeScript compilation rules, custom path alias `@/*` -> `./src/*`.
- `next.config.ts` - Standalone build output, `serverExternalPackages` for `@prisma/client`, `@prisma/adapter-pg`, and `pg`.
- `eslint.config.mjs` - ESLint 9 Flat Config.
- `vitest.config.ts` - Unit test suite resolution and path aliases.
- `prisma/schema.prisma` & `prisma.config.ts` - Database schema definition and migration tracking.

## Platform Requirements

**Development:**
- Local Node.js 20+ installation, npm, and Docker.
- PostgreSQL 16 (on port 5443 locally).

**Production:**
- Standalone Next.js multi-stage build running on Node 22 Alpine.
- Deployed via Docker Compose (`docker-compose.yml`):
  - `isian-postgres` (PostgreSQL 16 container)
  - `isian-app` (Next.js App server on port 3456)
  - `isian-worker` (Background submission queue processor)
  - Optional `bench` profile with 4 app instances, 2 workers, and `isian-proxy-bench` (Nginx on port 3457).

---

*Stack analysis: 2026-08-28*
