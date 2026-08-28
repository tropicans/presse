<!-- refreshed: 2026-08-28 -->
# Architecture

**Analysis Date:** 2026-08-28

## System Overview

```text
┌─────────────────────────────────────────────────────────────┐
│                      Client Layer                           │
├──────────────────┬──────────────────┬───────────────────────┤
│   Public Form    │   Admin Forms    │    Admin Submissions  │
│ `AttendanceForm` │`AdminFormEditor` │`AdminFormSubmissions` │
└────────┬─────────┴────────┬─────────┴──────────┬────────────┘
         │                  │                     │
         ▼                  ▼                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 Next.js 16 App Router                       │
│    `/f/[slug]`  ·  `/admin/**`  ·  `/api/**`                │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   Domain & Service Layer                    │
│   `src/lib/forms.ts` · `src/lib/auth.ts` · `ai-analysis.ts` │
│                `src/lib/rate-limit.ts`                      │
└────────┬─────────────────────────────────────────┬──────────┘
         │                                         │
         ▼                                         ▼
┌──────────────────┐                     ┌────────────────────┐
│   Prisma Client  │                     │  Submission Worker │
│ `src/lib/prisma` │                     │`submission-worker` │
└────────┬─────────┘                     └─────────┬──────────┘
         │                                         │
         ▼                                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      PostgreSQL 16                          │
│        Tables: forms, form_fields, submissions,             │
│        submission_answers, submission_jobs, ai_analyses     │
└─────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Public Form Runner | Multi-step interactive form filling, validation, conditional branching, quiz handling, signature pad | `src/components/AttendanceForm.tsx` |
| Admin Form Editor | Form builder UI (fields, settings, scoring rules, workflow branching) | `src/components/AdminFormEditor.tsx` |
| Admin Submissions | Submissions table viewer, filters, quiz metrics, Excel/CSV export, AI analysis trigger | `src/components/AdminFormSubmissions.tsx` |
| Form Engine | Form CRUD, answer validation, scoring, raw SQL persistence, job queuing, CSV generation | `src/lib/forms.ts` |
| Auth & Sessions | NextAuth Google provider configuration and `ADMIN_EMAILS` allowlist checks | `src/lib/auth.ts` |
| AI Analysis | Open-text answer summarization, sentiment classification, LLM prompt engineering | `src/lib/ai-analysis.ts` |
| Rate Limiter | Sliding-window in-memory request throttle for public submission APIs | `src/lib/rate-limit.ts` |
| Background Worker | Async polling daemon invoking internal job processing API | `scripts/submission-worker.mjs` |

## Pattern Overview

**Overall:** Full-stack Next.js Monolith (App Router) with decoupled async queue worker.

**Key Characteristics:**
- **App Router Architecture:** Lightweight server routes delegating logic to domain service libraries (`src/lib/*`).
- **Hybrid Rendering:** Server components gate authentication, while rich interactive React client components manage draft states and multi-step forms.
- **Dynamic Form Engine:** Flexible JSON settings paired with raw SQL queries (`prisma.$queryRaw` / `prisma.$executeRaw`) to support dynamic schema-free field types.
- **Transactional Job Queue:** Dedicated `submission_jobs` table processed asynchronously using PostgreSQL row locking (`FOR UPDATE SKIP LOCKED`).

## Layers

**Routing & Controller Layer:**
- Purpose: HTTP request parsing, authentication gating, rate limiting, and response dispatching.
- Location: `src/app/**/page.tsx`, `src/app/**/route.ts`
- Depends on: `src/lib/auth.ts`, `src/lib/forms.ts`, `src/lib/ai-analysis.ts`, `src/lib/rate-limit.ts`.

**Domain Logic Layer:**
- Purpose: Form definition processing, submission validation, quiz scoring calculations, export file building, and AI prompt composition.
- Location: `src/lib/`
- Contains: `forms.ts`, `auth.ts`, `ai-analysis.ts`, `rate-limit.ts`, `admin-display.ts`, `env.ts`.
- Depends on: `src/lib/prisma.ts`.

**Database Persistence Layer:**
- Purpose: Data persistence, transaction management, and connection pooling.
- Location: `prisma/schema.prisma`, `src/lib/prisma.ts`, raw SQL in `src/lib/forms.ts`.

## Data Flow

### Public Submission Workflow
1. User loads `/f/[slug]` (`src/app/f/[slug]/page.tsx`), which renders `src/components/PublicFormPage.tsx` and `src/components/AttendanceForm.tsx`.
2. User fills out questions, signatures, and navigates conditional branches.
3. Form submits via POST to `/api/public/forms/[slug]/submit`.
4. Submit handler extracts IP (`getClientIp`), enforces sliding-window rate limit (`rateLimit`), validates answers (`validateFormSubmission`), stores submission records, and enqueues a `SubmissionJob`.
5. User is redirected to `/success?slug=<slug>&submissionId=<id>`.

### Job Queue Processing Loop
1. Background script `scripts/submission-worker.mjs` runs an infinite interval loop.
2. Sends HTTP POST to `/api/internal/submission-jobs/process` with header `x-worker-token`.
3. Handler executes `processQueuedSubmissionJobs()` in `src/lib/forms.ts`.
4. Pending jobs are locked via `SELECT ... FOR UPDATE SKIP LOCKED`, processed, and marked `COMPLETED` (or scheduled for exponential backoff retry on failure).

### Admin Management Flow
1. Admin navigates to `/admin/forms` or `/admin/forms/[id]`.
2. Session checked on server via `getAdminSession()`.
3. Client components fetch data via `/api/admin/forms/**` and `/api/admin/forms/[id]/submissions`.
4. Admin can trigger AI qualitative analysis via `/api/admin/forms/[id]/ai-analysis` or export data via `/api/admin/forms/[id]/export`.

## Key Abstractions

**Dynamic Form Schema:**
- Forms contain JSON settings (`settingsJson`) specifying workflows, branching logic, score thresholds, and page structures.
- Field types supported: `SHORT_TEXT`, `LONG_TEXT`, `RADIO`, `SELECT`, `YES_NO`, `SIGNATURE`, `LIKERT`.

**Admin Authorization Gate:**
- Restricts admin access exclusively to Google accounts present in `ADMIN_EMAILS` environment variable.

## Entry Points

**Next.js App Server:**
- Location: `src/app/page.tsx`, `.next/standalone/server.js`
- Responsibilities: Web UI rendering, public forms, admin portal, REST APIs.

**Background Submission Worker:**
- Location: `scripts/submission-worker.mjs`
- Responsibilities: Asynchronous submission job execution, deduplication checks, and failure retry dispatching.

## Architectural Constraints

- **Single-Process Rate Limiting:** Rate limiter in `src/lib/rate-limit.ts` uses an in-memory `Map`. Horizontal scaling across multiple containers requires setting `RATE_LIMIT_SINGLE_INSTANCE_OK=true` or migrating to a shared Redis store.
- **Connection Pool Sizing:** PostgreSQL connection pool in `src/lib/prisma.ts` is configured via `DB_POOL_MAX` and `DB_POOL_MIN` to prevent database connection exhaustion.
- **Dual SQL Paradigm:** Prisma schema models `Attendance` and relations, while form-builder tables rely on raw PostgreSQL queries within `src/lib/forms.ts`.

## Error Handling

**Strategy:**
- Custom error classes (e.g. `FormSubmissionError`) thrown in domain layer (`src/lib/forms.ts`) and converted to HTTP status codes at the route boundary.
- Worker jobs retry with exponential backoff up to 5 attempts before terminal failure (`FAILED`).

## Cross-Cutting Concerns

- **Logging:** Prefixed console logs for server and background worker processes.
- **Validation:** Server-side payload validation in `validateFormSubmission()`.
- **Display Helpers:** Formatting helpers in `src/lib/admin-display.ts`.

---

*Architecture analysis: 2026-08-28*
