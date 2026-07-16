# Architecture

**Analysis Date:** 2026-07-16

## Pattern Overview

**Overall:** Full-stack Next.js Monolith with separate Background Worker process.

**Key Characteristics:**
- **App Router:** Thin server routes delegating to pure typescript domain logic libraries.
- **Client/Server Hybrid:** Next.js Server Components gate session authentication, while rich React client components handle local draft states, signature pads, and form steps.
- **Direct Database Manipulation:** Combined usage of Prisma Client and raw PostgreSQL transaction SQL to implement a schema-less, highly dynamic form builder engine.
- **Background Worker Queue:** Separate Node.js script processing transactional queue items over API calls.

## Layers

**Routing & Controller Layer:**
- Purpose: Entry point for requests, query/params parsing, security gates, and response rendering.
- Files:
  - Pages: `src/app/**/page.tsx`
  - Routes: `src/app/**/route.ts`
- Depends on: Session Helpers (`src/lib/auth.ts`), Core Engine Functions (`src/lib/forms.ts`, `src/lib/ai-analysis.ts`).

**Domain Logic Layer:**
- Purpose: Houses forms rendering configurations, validations, score calculations, export compilation, and job queue management.
- Files:
  - Form Actions: `src/lib/forms.ts`
  - AI Analytics: `src/lib/ai-analysis.ts`
  - Rate Limiter: `src/lib/rate-limit.ts`
- Depends on: Database Access (`src/lib/prisma.ts`).

**Database Persistence Layer:**
- Purpose: Store structures and values.
- Files:
  - Prisma Models: `prisma/schema.prisma`
  - Raw SQL Mapping: Inline tags in `src/lib/forms.ts`.

## Data Flow

### Public Submission Workflow
1. User loads `/f/[slug]` which renders `src/app/f/[slug]/page.tsx` fetching public definitions.
2. Form answers entered on page steps inside `src/components/AttendanceForm.tsx` (supports standard fields, Likert options, signatures, branching logic).
3. Upon submit, POST requests `/api/public/forms/[slug]/submit`.
4. Submit endpoint extracts headers via `getClientIp()`, validates rate limits via `rateLimit()`, validates inputs via `validateFormSubmission()`, stores answers, and creates a task entry in `SubmissionJob` table.
5. User is redirected to `/success`.

### Job Queue Processing Loop
1. Worker script `scripts/submission-worker.mjs` executes an infinite loop.
2. Sends POST to `/api/internal/submission-jobs/process` with `INTERNAL_WORKER_TOKEN`.
3. API route calls `processQueuedSubmissionJobs()`.
4. Retrieves `PENDING` jobs from `submission_jobs` using `FOR UPDATE SKIP LOCKED` database transaction.
5. Updates job state to `PROCESSING`, runs mutations, then marks `COMPLETED` (or increments attempts and schedules delay retries if failed).

### Admin Management Flow
1. Admin visits `/admin/forms` or pages under `/admin/forms/[id]`.
2. Session checked on server via `getAdminSession()`.
3. Client component fetches endpoints like `/api/admin/forms/[id]/submissions` or initiates AI Analysis via POST to `/api/admin/forms/[id]/ai-analysis`.

## Key Abstractions

**Dynamic Form Schema Engine:**
- Encapsulates forms as JSON settings models including pages, conditional routes, and branching configurations.
- Bypasses static schema migration limits by compiling fields dynamically via raw PostgreSQL client execution.

**Google Auth Allowlist:**
- Restricts Admin portal to specific authorized emails configured in `ADMIN_EMAILS` env variable inside `src/lib/auth.ts`.

## Entry Points

**Main Server:**
- Location: `.next/standalone/server.js` (compiled production bundle) or `npm run dev` in development.
- Responsibilities: Server routing, server components rendering, API endpoints.

**Task Worker:**
- Location: `scripts/submission-worker.mjs`
- Responsibilities: Runs infinite async batch loop checking for database tasks to execute.

## Error Handling

**App Boundary:**
- Form submission errors throw custom classes like `FormSubmissionError` which are captured at endpoints to yield clean HTTP 400 JSON payloads.

**Worker Retries:**
- Failed tasks are automatically rescheduled with exponential backoff (`attempts * 2 seconds`), capped at 5 total attempts before marking status as `FAILED`.

## Cross-Cutting Concerns

**Rate Limiting:**
- Per-process sliding window limiter inside `src/lib/rate-limit.ts` (monitored by IP headers).

**AI Analysis:**
- Aggregates quantitative and qualitative responses and invokes OpenAI endpoint to generate Markdown summary inside `src/lib/ai-analysis.ts`.

---

*Architecture analysis: 2026-07-16*
*Update when major patterns change*
