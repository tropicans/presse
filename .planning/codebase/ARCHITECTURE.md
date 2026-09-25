<!-- refreshed: 2026-09-25 -->
# Architecture

**Analysis Date:** 2026-09-25

## System Overview

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                               Browser UI                                │
├────────────────────────────────────┬────────────────────────────────────┤
│         Public Submitter           │             Admin User             │
│   `src/components/AttendanceForm`  │ `src/components/AdminFormEditor`   │
│   `src/app/f/[slug]/page.tsx`      │ `src/app/admin/forms/[id]/page.tsx`│
└─────────────────┬──────────────────┴──────────────────┬─────────────────┘
                  │                                     │
                  ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         App Router API Handlers                         │
│  - `src/app/api/public/forms/[slug]/route.ts`                           │
│  - `src/app/api/public/forms/[slug]/submit/route.ts`                    │
│  - `src/app/api/admin/forms/[id]/submissions/route.ts`                  │
│  - `src/app/api/internal/submission-jobs/process/route.ts`             │
└─────────────────┬──────────────────┬──────────────────┬─────────────────┘
                  │                  │                  │
                  ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           Domain / Service Layer                        │
│  - Form Engine & Validation: `src/lib/forms.ts`                         │
│  - Authentication & RBAC: `src/lib/auth.ts`                             │
│  - Rate Limiting: `src/lib/rate-limit.ts`                               │
│  - AI Summarization: `src/lib/ai-analysis.ts`                           │
└─────────────────┬─────────────────────────────────────┬─────────────────┘
                  │                                     │
                  ▼                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                             Persistence Layer                           │
│  - Prisma Adapter: `src/lib/prisma.ts`                                  │
│  - Schema & Raw SQL: `prisma/schema.prisma` & `prisma/migrations`       │
│  - PostgreSQL 16 (Tables: forms, form_fields, submissions, jobs)        │
└─────────────────────────────────────────────────────────────────────────┘
                  ▲
                  │ Worker batch polling
┌─────────────────┴───────────────────────────────────────────────────────┐
│                       Background Submission Worker                      │
│                  `scripts/submission-worker.mjs`                        │
└─────────────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Public Form Shell | Central public form entry, step navigation, validation display, signature capture | `src/components/AttendanceForm.tsx` |
| Admin Forms List | Form dashboard, status toggling, deletion modals, creation entry | `src/components/AdminFormsList.tsx` |
| Admin Form Editor | Drag-free form schema builder, branching/pages config, quiz settings | `src/components/AdminFormEditor.tsx` |
| Admin Submissions | Submissions table, pagination, search filters, detail drawers, export triggers | `src/components/AdminFormSubmissions.tsx` |
| Admin Form Preview | Unsaved draft live preview via `localStorage` synchronization | `src/components/AdminFormPreview.tsx` |
| Form Engine | Form CRUD, raw SQL querying, branching rules, scoring, batch job queue | `src/lib/forms.ts` |
| AI Analysis Engine | Submission aggregation, prompt synthesis, OpenAI-compatible LLM invocation | `src/lib/ai-analysis.ts` |
| Auth & Permissions | NextAuth Google OAuth session handling, admin email allowlist check | `src/lib/auth.ts` |
| Rate Limiter | In-memory sliding window IP request limiting for public endpoints | `src/lib/rate-limit.ts` |
| Submission Worker | Standalone Node process polling `/api/internal/submission-jobs/process` | `scripts/submission-worker.mjs` |

## Pattern Overview

**Overall:** Thin Server Routes + Fat Domain Module + React Client Components + Asynchronous Job Queue.

**Key Characteristics:**
- **Thin App Router Handlers:** Route files (`src/app/api/**/route.ts`) parse inputs, check auth/rate-limits, and delegate directly to pure TypeScript domain functions in `src/lib/`.
- **Hybrid Data Modeling:** Prisma models provide TypeScript typing and structure, but performance-critical and dynamic builder logic executes via parameterized raw SQL (`prisma.$queryRaw` and `prisma.$executeRaw` in `src/lib/forms.ts`).
- **Asynchronous Submission Queue:** Heavy form submissions can be queued into `submission_jobs` and asynchronously drained by `scripts/submission-worker.mjs` to keep public submission response times under ~100ms.
- **Client Draft Synchronization:** Live preview of unsaved editor changes uses browser `localStorage` and `useSyncExternalStore` (`src/lib/admin-form-preview.ts`), avoiding premature database writes.

## Layers

**Presentation Layer (App Router):**
- Purpose: HTTP request routing, parameter extraction, response serialization, and server-side authentication gates.
- Location: `src/app/`
- Contains: `page.tsx`, `layout.tsx`, `route.ts`.
- Depends on: `src/lib/auth.ts`, `src/lib/forms.ts`, `src/lib/rate-limit.ts`, `src/lib/ai-analysis.ts`.

**Client UI Layer:**
- Purpose: Interactive form rendering, multi-step page advancement, canvas signature pad, admin data grids.
- Location: `src/components/`
- Contains: Client React components marked with `'use client'`.
- Depends on: Browser APIs, `signature_pad`, native `fetch`.

**Domain / Service Layer:**
- Purpose: Business logic, validation schemas, scoring algorithms, export generation, and job queue management.
- Location: `src/lib/`
- Contains: `forms.ts`, `ai-analysis.ts`, `rate-limit.ts`, `auth.ts`, `env.ts`.
- Depends on: `src/lib/prisma.ts`, external LLM HTTP endpoints, ExcelJS.

**Persistence Layer:**
- Purpose: Relational data storage, connection pooling, and migrations.
- Location: `prisma/` and `src/lib/prisma.ts`
- Contains: `schema.prisma`, SQL migrations under `prisma/migrations/`.
- Depends on: PostgreSQL 16 database.

**Background Worker Layer:**
- Purpose: Offloaded batch execution for asynchronous submissions.
- Location: `scripts/`
- Contains: `submission-worker.mjs`.
- Depends on: Node.js fetch runtime, internal worker API routes.

## Data Flow

### Primary Request Path (Public Form Submission)

1. Participant enters form at `/f/[slug]` (`src/app/f/[slug]/page.tsx`).
2. Public form definition loaded via `getPublicFormBySlug(slug)` (`src/lib/forms.ts:L311`).
3. Participant submits form payload to `POST /api/public/forms/[slug]/submit` (`src/app/api/public/forms/[slug]/submit/route.ts`).
4. IP rate limiter checked via `rateLimit(ip, ...)` (`src/lib/rate-limit.ts:L38`).
5. Submission payload validated via `validateFormSubmission(form, payload)` (`src/lib/forms.ts:L912`).
6. Submission either committed immediately or queued to `submission_jobs` table via `enqueueSubmissionJob(...)` (`src/lib/forms.ts`).
7. Client redirected to `/success?slug=[slug]&submissionId=[id]` (`src/app/success/page.tsx`).

### Asynchronous Worker Drainage Loop

1. `scripts/submission-worker.mjs` executes continuous polling loop.
2. Worker sends `POST /api/internal/submission-jobs/process?batch=25` with `x-worker-token`.
3. Route verifies worker token against `INTERNAL_WORKER_TOKEN`.
4. Domain helper `processSubmissionJobBatch(batchSize)` selects pending jobs with row-level lock (`FOR UPDATE SKIP LOCKED`).
5. Answers are persisted into `submission_answers` and job status is updated to `COMPLETED` (or `FAILED` with retry backoff).

### Admin Form Management & AI Analysis

1. Admin accesses `/admin/forms` or `/admin/forms/[id]` gated by `getAdminSession()` (`src/lib/auth.ts`).
2. Changes saved via `PATCH/PUT /api/admin/forms/[id]`.
3. Admin clicks "Analisis AI" triggering `POST /api/admin/forms/[id]/ai-analysis`.
4. `generateAndSaveFormAiAnalysis(formId)` aggregates quantitative answers, gathers text responses, and sends structured prompt to LLM (`src/lib/ai-analysis.ts`).
5. Analysis result markdown is stored in `form_ai_analyses` table and returned for display.

## Key Abstractions

**PublicFormDefinition & FormSettings:**
- Purpose: Flexible JSON settings representing dynamic form pages, conditional branching rules, quiz pass rates, and display configs.
- Examples: `src/lib/forms.ts` (`PublicFormDefinition`, `FormSettingsJson`).

**SubmissionJob:**
- Purpose: Encapsulates asynchronous submission tasks for high-throughput resilience.
- Examples: `src/lib/forms.ts`, `prisma/schema.prisma` (`model SubmissionJob`).

**In-Memory RateLimiter:**
- Purpose: Sliding window request throttler by IP address.
- Examples: `src/lib/rate-limit.ts`.

## Entry Points

**Web Application Server:**
- Location: `src/app/layout.tsx`, `src/app/page.tsx`, `next dev` / `next start` (or `.next/standalone/server.js` in production).
- Responsibilities: Serves Next.js App Router, handles public & admin HTTP endpoints.

**Submission Worker Process:**
- Location: `scripts/submission-worker.mjs` (`npm run worker:submission`).
- Responsibilities: Standalone Node.js daemon draining pending database submission jobs.

## Architectural Constraints

- **Single-Threaded Worker Execution:** The background submission worker operates as an external Node.js loop; race conditions on job claims are prevented by PostgreSQL row-level locks (`SKIP LOCKED`).
- **In-Memory Rate Limiting Scope:** `src/lib/rate-limit.ts` uses an in-memory `Map`. For multi-instance scaling, `RATE_LIMIT_SINGLE_INSTANCE_OK` must be explicitly reviewed or replaced with Redis.
- **Strict DB Pool Configuration:** `src/lib/prisma.ts` enforces configurable connection limits (`DB_POOL_MAX`, `DB_POOL_MIN`, timeouts) to prevent connection exhaustion.
- **SQL Migration Parity:** Because `src/lib/forms.ts` issues raw SQL queries alongside Prisma models, schema changes require direct alignment between `schema.prisma`, migration files, and raw SQL queries.

## Anti-Patterns

### Monolithic Domain Engine

**What happens:** `src/lib/forms.ts` contains over 3,000 lines of code combining CRUD, validation, branching calculations, quiz evaluation, SQL queries, Excel generation, and queue processing.
**Why it's wrong:** High risk of regression when touching unrelated form behaviors; cognitive overload during maintenance.
**Do this instead:** Refactor sub-domains into distinct modules under `src/lib/forms/` (e.g., `validation.ts`, `scoring.ts`, `export.ts`, `queue.ts`).

### Monolithic CSS File

**What happens:** All application styling (admin tables, public form layouts, modals, signatures, dark mode overrides) is bundled in a single 6,200+ line `src/app/globals.css`.
**Why it's wrong:** High selector specificity clashes and difficult maintainability.
**Do this instead:** Extract modular CSS files or component-scoped styles while adhering to vanilla CSS tokens.

## Error Handling

**Strategy:** Typed domain error throwing converted to semantic HTTP responses at route boundaries.

**Patterns:**
- Custom `FormSubmissionError` (`src/lib/forms.ts`) thrown on invalid form states or payload validation failures.
- Route handlers catch `FormSubmissionError` and return `NextResponse.json({ error: err.message }, { status: 400 })`.
- Unhandled unexpected exceptions return HTTP 500 with sanitized messages to clients, while full traces are logged to `console.error`.

## Cross-Cutting Concerns

**Logging:** Prefixed console logs for worker tasks and database operations (`[submission-worker]`, `[prisma]`).
**Validation:** Strict input validation and sanitization in `validateFormSubmission` (`src/lib/forms.ts`) and environment validation in `src/lib/env.ts`.
**Authentication:** Session checks via `getAdminSession()` and `isAdminEmail()` in `src/lib/auth.ts`.

---

*Architecture analysis: 2026-09-25*
