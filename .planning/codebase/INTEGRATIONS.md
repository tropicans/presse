# External Integrations

**Analysis Date:** 2026-07-16

## APIs & External Services

**LLM API Integration:**
- OpenAI-compatible LLM endpoint used to perform qualitative analysis on form submissions.
  - SDK/Client: REST API calling via native `fetch` client inside `src/lib/ai-analysis.ts`.
  - Auth: API key configured in `LLM_API_KEY` environment variable.
  - Base URL: Configurable via `LLM_API_BASE` (defaults to `https://sembilan.kelazz.my.id/v1`).
  - Model: Configurable via `LLM_MODEL` (defaults to `gpt-4o`).

## Data Storage

**Databases:**
- PostgreSQL (pinned to `postgres:16-alpine` in Docker)
  - Connection: Configured via `DATABASE_URL` environment variable. E.g., `postgresql://user:password@host:port/db?schema=public`.
  - Client: Prisma ORM v7.4.2 (`prisma` client with raw SQL fallback for form engine and dynamic tables).
  - Migrations: Database migration SQL scripts located in `prisma/migrations/`.

**File Storage:**
- None. Signatures are encoded and stored in the database as base64 string buffers (text data type).

**Caching:**
- Local per-process in-memory caching and Next.js route caching.

## Authentication & Identity

**Auth Provider:**
- NextAuth.js v4 using custom callbacks to filter users by email address allowlist.
  - Session strategy: Default session management with sign-in paths gated under `/admin/login`.

**OAuth Integrations:**
- Google OAuth provider used for logging in administrators.
  - Credentials: `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET` configured in environment.
  - Allowlist: Managed in `ADMIN_EMAILS` (comma-separated list of Google accounts allowed access).

## Monitoring & Observability

**Logs:**
- Standalone stdout/stderr console output for server and worker processes.

## CI/CD & Deployment

**Hosting:**
- Containerized runtime using Docker and Docker Compose.
  - Port: Gated behind port `3456` locally (or `3457` when running k6 benchmarks via Nginx proxy).

## Webhooks & Callbacks

**Internal Worker Pull Hook:**
- Background task worker `scripts/submission-worker.mjs` executes pulling requests to the internal API route:
  - Endpoint: `/api/internal/submission-jobs/process`
  - Verification: Authenticated via header `x-worker-token` containing the `INTERNAL_WORKER_TOKEN`.

---

*Integration audit: 2026-07-16*
*Update when adding/removing external services*
