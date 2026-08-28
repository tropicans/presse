# External Integrations

**Analysis Date:** 2026-08-28

## APIs & External Services

**LLM Qualitative Analysis:**
- OpenAI-compatible chat completion endpoint used to generate qualitative feedback analysis from open-text form submissions.
  - SDK/Client: Direct HTTP POST via native `fetch` in `src/lib/ai-analysis.ts`.
  - Auth: `LLM_API_KEY` Bearer token.
  - Base URL: `LLM_API_BASE` (e.g. `https://sembilan.kelazz.my.id/v1`).
  - Model: `LLM_MODEL` (e.g. `gpt-4o`).

**Google OAuth Authentication:**
- OAuth 2.0 provider for administrator login.
  - SDK/Client: NextAuth.js Google Provider in `src/lib/auth.ts`.
  - Credentials: `GOOGLE_CLIENT_ID` & `GOOGLE_CLIENT_SECRET`.
  - Access Control: Validated against `ADMIN_EMAILS` allowlist in NextAuth `signIn` callback.

## Data Storage

**Databases:**
- PostgreSQL 16 (running via `postgres:16-alpine` in Docker or local instance).
  - Connection: `DATABASE_URL` environment variable.
  - Client: Prisma Client with `@prisma/adapter-pg` connection pool adapter (`src/lib/prisma.ts`).
  - Raw SQL Engine: Dynamic form builder, submission mutations, and job locking use raw queries (`prisma.$queryRaw` / `prisma.$executeRaw`) in `src/lib/forms.ts`.
  - Migrations: SQL migration files located in `prisma/migrations/`.

**File Storage:**
- Signatures and canvas inputs are encoded as base64 string buffers and stored directly in database text columns (`SignaturePad.tsx`, `Attendance.signature`, `SubmissionAnswer.valueText`). No external S3/blob storage is used.

**Caching:**
- In-memory per-process sliding-window rate limiter in `src/lib/rate-limit.ts`.
- Next.js route caching and Next.js ISR/cache revalidation (`revalidatePath`) in `src/lib/forms.ts`.

## Authentication & Identity

**Auth Provider:**
- NextAuth.js v4 with Google Provider.
  - Sign-in and error pages gated at `/admin/login`.
  - Server-side session verification via `getAdminSession()` in `src/lib/auth.ts`.
  - Restricted to verified Google account emails defined in `ADMIN_EMAILS`.

## Monitoring & Observability

**Health Check:**
- HTTP GET endpoint at `/api/health` returning database connectivity status and process health (`src/app/api/health/route.ts`).
- Integrated into Docker Compose healthchecks for `isian-app` and `isian-worker`.

**Logging:**
- Standard output (`console.log`, `console.error`) with module tag prefixes (e.g. `[submission-worker]`, `[ai-analysis]`).

## CI/CD & Deployment

**Hosting & Containers:**
- Multi-stage Docker containerization (`Dockerfile`) producing standalone Node.js Alpine runtime.
- Managed through Docker Compose (`docker-compose.yml`) exposing app on port `3456`.
- Optional benchmark infrastructure with multi-replica load balancing via Nginx (`infra/nginx/benchmark.conf`).

## Webhooks & Callbacks

**Internal Worker Job Polling:**
- Background worker `scripts/submission-worker.mjs` executes HTTP POST polling loop:
  - Endpoint: `/api/internal/submission-jobs/process`
  - Authentication: Validated via header `x-worker-token` matching `INTERNAL_WORKER_TOKEN`.
  - Workload: Claims pending jobs with `FOR UPDATE SKIP LOCKED`, executes form submission processing, and handles retries.

---

*Integration audit: 2026-08-28*
