# Technology Stack

**Analysis Date:** 2026-09-25

## Languages

**Primary:**
- TypeScript 5.x - Used for all application logic, React components, Next.js App Router endpoints, and domain modules (`tsconfig.json`).

**Secondary:**
- JavaScript / ESM - Used for build/dev configurations (`eslint.config.mjs`) and background workers (`scripts/submission-worker.mjs`, `load-tests/public-form-journey.k6.js`).
- SQL / PostgreSQL DDL - Used in Prisma migrations (`prisma/migrations/`) and raw queries (`src/lib/forms.ts`).

## Runtime

**Environment:**
- Node.js 22 (pinned to `node:22-alpine` in `Dockerfile`, local runtime supports Node.js 20+)
- Browser runtime for public forms and admin dashboards

**Package Manager:**
- npm (lockfile `package-lock.json` present and canonical)
- Overrides configured for `postcss: ^8.5.10` and `@hono/node-server: ^1.19.13`

## Frameworks

**Core:**
- Next.js 16.2.4 (App Router, standalone output mode configured in `next.config.ts`)
- React 19.2.3 & React DOM 19.2.3 (UI rendering, hooks)

**Testing:**
- Vitest 4.1.5 (`vitest.config.ts`, unit and integration tests under `src/**/*.test.ts`)
- k6 (load testing under `load-tests/public-form-journey.k6.js`)

**Build/Dev:**
- TypeScript Compiler (`tsconfig.json`)
- ESLint 9 (Flat Config via `eslint.config.mjs` with `eslint-config-next`)

## Key Dependencies

**Critical:**
- `@prisma/client` ^7.4.2 & `@prisma/adapter-pg` ^7.4.2 - Database client/ORM mapping with PostgreSQL driver adapter (`src/lib/prisma.ts`).
- `next-auth` ^4.24.13 - Google OAuth authentication and session management for `/admin` pages (`src/lib/auth.ts`).
- `signature_pad` ^5.1.3 - Digital signature capture on canvas elements in attendance forms (`src/components/SignaturePad.tsx`).
- `exceljs` ^4.4.0 - Form submissions export to Excel (.xlsx) / CSV (`src/lib/forms.ts`).
- `dotenv` ^17.3.1 - Environment variable parsing.

**Infrastructure:**
- `pg` - PostgreSQL connection client adapter used by `@prisma/adapter-pg`.
- `@hono/node-server` - Overridden peer dependency.

## Configuration

**Environment:**
- Configured via `.env` (development) and `.env.production` (production Docker Compose).
- Template: `.env.example`
- Key variables:
  - `DATABASE_URL` - PostgreSQL connection string (`postgresql://...`).
  - `NEXTAUTH_URL` & `NEXTAUTH_SECRET` - NextAuth base URL (port 3456) and secret token.
  - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - Google OAuth credentials.
  - `ADMIN_EMAILS` - Comma-separated allowlist of administrator emails.
  - `INTERNAL_WORKER_TOKEN` - Shared secret for background worker API invocation.
  - `DB_POOL_MAX`, `DB_POOL_MIN`, `DB_POOL_CONNECTION_TIMEOUT_MS`, `DB_POOL_IDLE_TIMEOUT_MS` - Connection pool settings.
  - `RATE_LIMIT_SINGLE_INSTANCE_OK` - Guard for single-instance in-memory limiter.
  - `LLM_API_KEY`, `LLM_API_BASE`, `LLM_MODEL` - OpenAI-compatible LLM endpoint settings for AI form analysis.

**Build:**
- `next.config.ts` - Standalone output mode, `serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"]`, Turbopack root config.
- `tsconfig.json` - Strict TypeScript rules, path alias `@/* -> ./src/*`.
- `eslint.config.mjs` - ESLint 9 flat configuration extending Next core-web-vitals and TypeScript presets.
- `vitest.config.ts` - Node test environment with `@/*` alias.
- `prisma.config.ts` - Prisma CLI configuration.

## Platform Requirements

**Development:**
- Local Node.js 20+ installation, npm, and Docker.
- PostgreSQL 16 (default local port 5443 mapped via Docker Compose).

**Production:**
- Standalone multi-stage Docker container (`Dockerfile` based on `node:22-alpine`).
- Docker Compose service topology:
  - `postgres` (PostgreSQL 16 Alpine on internal network)
  - `app` (Next.js standalone server on port 3456)
  - `worker` (Node.js background submission job processor)
  - Optional `bench` profile (Nginx reverse proxy on port 3457)

---

*Stack analysis: 2026-09-25*
