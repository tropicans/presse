# External Integrations

**Analysis Date:** 2026-09-25

## APIs & External Services

**Authentication / Identity:**
- Google OAuth 2.0 - Admin authentication provider for `/admin` management portals.
  - SDK/Client: `next-auth/providers/google` via NextAuth v4 (`src/lib/auth.ts`)
  - Auth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`
  - Access Control: Restricted strictly to emails listed in `ADMIN_EMAILS`.

**AI & Natural Language Processing:**
- OpenAI-compatible Chat Completions API - Generates executive summaries and thematic analyses for form submissions (`src/lib/ai-analysis.ts`).
  - Endpoint: POST `${LLM_API_BASE}/chat/completions`
  - Auth: `LLM_API_KEY` (Bearer header)
  - Config: `LLM_MODEL`, `LLM_API_BASE`

## Data Storage

**Databases:**
- PostgreSQL 16:
  - Connection: `DATABASE_URL`
  - Client: Prisma Client (`@prisma/client` + `@prisma/adapter-pg`) with pg connection pool (`src/lib/prisma.ts`).
  - Schema Management: Dual-mode — Prisma schema models `Attendance`, `Form`, `FormField`, `FieldOption`, `Submission`, `SubmissionAnswer`, `SubmissionJob`, `FormAiAnalysis`, while dynamic forms execution frequently relies on raw parameterized SQL (`prisma.$queryRaw`, `prisma.$executeRaw` in `src/lib/forms.ts`).

**File Storage:**
- Ephemeral / In-Memory only:
  - Signatures are encoded and stored directly as base64 data URLs in PostgreSQL (`db.Text` columns).
  - Excel and CSV exports are generated in-memory using `exceljs` (`src/lib/forms.ts`) and streamed directly in HTTP response payloads.

**Caching & Queuing:**
- Public Form JSON Caching: Route-level cache headers / revalidation via `next/cache` (`revalidatePath`).
- Job Queue: Database-backed job table `submission_jobs` managed via transactional enqueue and worker polling (`scripts/submission-worker.mjs` and `src/app/api/internal/submission-jobs/process/route.ts`).
- Rate Limiting Cache: In-memory sliding window counters stored in a JavaScript `Map` inside `src/lib/rate-limit.ts`.

## Authentication & Identity

**Auth Provider:**
- NextAuth.js (v4):
  - Implementation: Session cookie token authentication wrapping Google Provider (`src/lib/auth.ts`).
  - Admin Route Gate: Server components and route handlers verify session using `getAdminSession()` (`src/lib/auth.ts`).
  - Redirection: Non-authenticated admin traffic redirects to `/admin/login`.

## Monitoring & Observability

**Health Checks:**
- Endpoint: `GET /api/health` (`src/app/api/health/route.ts`), delegating to `checkHealth()` (`src/lib/health.ts`) to verify PostgreSQL connectivity via `SELECT 1`.

**Logs:**
- Standard console logging (`console.log`, `console.error`) with prefixing (e.g., `[submission-worker]`, `[prisma]`).
- Container logs captured via Docker standard output / logging drivers.

## CI/CD & Deployment

**Hosting:**
- Self-hosted Docker Compose or container orchestrator running standalone Next.js.
- Compose profiles: default runtime (`postgres`, `app`, `worker`) and benchmark profile (`bench` with Nginx proxy).

**CI Pipeline:**
- Local/repo verification scripts:
  - `npm run lint` (`eslint.config.mjs`)
  - `npm test` (`vitest run`)
  - `npx tsc --noEmit`
  - `npm run build`
  - Load testing via k6: `npm run load:test:public` (`load-tests/public-form-journey.k6.js`).

## Environment Configuration

**Required env vars:**
- `DATABASE_URL`: PostgreSQL connection string.
- `NEXTAUTH_URL`: Canonical application URL (e.g. `http://localhost:3456`).
- `NEXTAUTH_SECRET`: Encryption key for NextAuth sessions.
- `GOOGLE_CLIENT_ID`: Google OAuth client ID.
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret.
- `ADMIN_EMAILS`: Comma-separated admin email addresses.
- `INTERNAL_WORKER_TOKEN`: Authorization token for internal worker endpoints.

**Optional env vars:**
- `RATE_LIMIT_SINGLE_INSTANCE_OK`: Allows in-memory rate limiter in production.
- `DB_POOL_MAX`, `DB_POOL_MIN`, `DB_POOL_CONNECTION_TIMEOUT_MS`, `DB_POOL_IDLE_TIMEOUT_MS`: Database pool tuning.
- `LLM_API_KEY`, `LLM_API_BASE`, `LLM_MODEL`: AI analysis configuration.
- `WORKER_BASE_URL`, `WORKER_BATCH_SIZE`, `WORKER_IDLE_MS`, `WORKER_ERROR_MS`: Background worker tuning.

**Secrets location:**
- `.env` for local development (gitignored).
- `.env.production` for Docker Compose production deployments (gitignored).

## Webhooks & Callbacks

**Incoming:**
- `POST /api/internal/submission-jobs/process` - Internal worker batch callback authenticated via `x-worker-token` header (`src/app/api/internal/submission-jobs/process/route.ts`).
- `GET/POST /api/auth/[...nextauth]` - OAuth callbacks handled by NextAuth (`src/app/api/auth/[...nextauth]/route.ts`).

**Outgoing:**
- External calls to `https://accounts.google.com` (OAuth token exchange).
- External calls to OpenAI-compatible LLM endpoint (`${LLM_API_BASE}/chat/completions`) when admin triggers AI analysis.

---

*Integration audit: 2026-09-25*
