# Technology Stack

**Analysis Date:** 2026-07-16

## Languages

**Primary:**
- TypeScript 5.x - Used for all application logic, React components, and API routes.

**Secondary:**
- JavaScript / ESM - Used for build/dev configurations (`eslint.config.mjs`) and script operational workers (`scripts/submission-worker.mjs`).

## Runtime

**Environment:**
- Node.js 22 (pinned to `node:22-alpine` in Docker)
- Browser runtime for public and admin frontends

**Package Manager:**
- npm (lockfile `package-lock.json` present)

## Frameworks

**Core:**
- Next.js 16.2.4 (App Router, standalone output mode)
- React 19.2.3 (UI rendering)

**Testing:**
- Vitest 4.1.5 (unit and integration tests)
- k6 (load testing under `load-tests/`)

**Build/Dev:**
- TypeScript Compiler
- ESLint (Flat Config via `eslint.config.mjs`)

## Key Dependencies

**Critical:**
- `@prisma/client` ^7.4.2 & `@prisma/adapter-pg` ^7.4.2 - Database client/ORM mapping.
- `next-auth` ^4.24.13 - Google OAuth and session management for admin pages.
- `signature_pad` ^5.1.3 - Used in attendance forms to capture digital signatures.
- `exceljs` ^4.4.0 - Used to export form submissions as Excel/CSV.
- `dotenv` ^17.3.1 - Environment variable parsing.

**Infrastructure:**
- `pg` - PostgreSQL connection adapter.
- `@hono/node-server` - Used as a peer override.

## Configuration

**Environment:**
- Configured via `.env` (development) and `.env.production` (production compose).
- Key variables:
  - `DATABASE_URL` - PostgreSQL connection string.
  - `NEXTAUTH_URL` & `NEXTAUTH_SECRET` - NextAuth server URL and signature.
  - `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` - Google Console credentials.
  - `ADMIN_EMAILS` - Comma-separated allowlist of email addresses.
  - `INTERNAL_WORKER_TOKEN` - Token shared with the background worker.
  - `LLM_API_KEY`, `LLM_API_BASE`, `LLM_MODEL` - OpenAI-compatible configuration.

**Build:**
- `tsconfig.json` - TypeScript compilation rules, custom path alias `@/*` -> `src/*`.
- `next.config.ts` - Next.js config with standalone build and `serverExternalPackages` config.
- `eslint.config.mjs` - ESLint config.
- `vitest.config.ts` - Test suite resolution.
- `prisma.config.ts` - Schema and migration lookup.

## Platform Requirements

**Development:**
- Local Node.js 20+ installation, npm, and Docker.
- PostgreSQL 16 (on port 5443 locally).

**Production:**
- Standalone Next.js multi-stage build.
- Deployed via Docker Compose (PostgreSQL container, `app` server on port 3456, `worker` process, optional load-balanced `bench` profile).

---

*Stack analysis: 2026-07-16*
*Update after major dependency changes*
