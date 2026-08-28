# Codebase Concerns

**Analysis Date:** 2026-08-28

## Tech Debt

**Raw SQL Query Dependency in Form Engine:**
- Issue: Dynamic form operations, submissions lookups, and worker transactions use raw queries via `prisma.$queryRaw` and `prisma.$executeRaw` instead of type-safe Prisma client model queries.
- Files: `src/lib/forms.ts` (`processQueuedSubmissionJobs`, `listAdminFormSubmissions`, `createAdminForm`).
- Why: Accommodates schema-free, dynamic question types and dynamic columns without creating a database migration per form field.
- Impact: Elevated risk of PostgreSQL syntax errors, complex manual type casting, and higher maintenance overhead during database schema updates.
- Fix approach: Abstract raw SQL calls into dedicated query builder modules with strict runtime validation, or consider PostgreSQL JSONB columns for dynamic answer storage.

**Large Multi-Workflow UI Component in `AttendanceForm.tsx`:**
- Issue: A single React component (`src/components/AttendanceForm.tsx`) orchestrates standard forms, webinar registrations, attendance tracking, and interactive quizzes.
- Files: `src/components/AttendanceForm.tsx`.
- Why: Historical evolution from a simple attendance sheet into a general-purpose dynamic form runner.
- Impact: High UI state complexity, making subtle branching or scoring modifications prone to regressions in other form workflows.
- Fix approach: Refactor form modes into modular sub-components and isolated React state providers.

## Known Bugs

**Process-Local Rate Limiting:**
- Symptoms: Rate limits can be bypassed or behave inconsistently if the application is scaled horizontally across multiple instances behind a load balancer.
- Trigger: Inbound requests landing on different application containers.
- Files: `src/lib/rate-limit.ts`.
- Workaround: Production single-instance deployments require `RATE_LIMIT_SINGLE_INSTANCE_OK="true"`.
- Root cause: Rate limiting relies on an in-memory `Map` store per process.
- Fix: Replace in-memory store with a shared Redis or database-backed rate limiter adapter for multi-instance deployments.

## Security Considerations

**Static Environment Admin Allowlist:**
- Risk: Administrator authorization checks match against the static `ADMIN_EMAILS` environment variable. Adding/removing administrators requires modifying environment variables and restarting the service.
- Files: `src/lib/auth.ts`, `src/lib/env.ts`.
- Current mitigation: Checked server-side during the NextAuth `signIn` callback.
- Recommendations: Store admin users and roles in a database table with an invitation workflow.

**Large Base64 Canvas Signature Payloads:**
- Risk: Digital signature fields allow submitting raw base64 encoded PNG strings up to 500,000 characters directly into PostgreSQL text columns.
- Files: `src/components/SignaturePad.tsx`, `src/lib/forms.ts`.
- Current mitigation: Size validated on submit (`MAX_SIGNATURE_LENGTH = 500000`).
- Recommendations: Offload large signature binaries to S3/MinIO object storage and store signed URLs in database tables.

## Performance Bottlenecks

**Database Connection Pool Starvation Under High Concurrency:**
- Problem: Heavy concurrent traffic during mass form submissions or simultaneous AI analyses can saturate PostgreSQL connection pools.
- Files: `src/lib/prisma.ts`, `docker-compose.yml`.
- Cause: Next.js standalone workers and background queue workers each maintain distinct connection pools.
- Improvement path: Tune `DB_POOL_MAX` and `DB_POOL_MIN` in relation to PostgreSQL server `max_connections` (configured to 300 in Docker).

## Fragile Areas

**Dual Schema vs Raw Migration Alignment:**
- Files: `prisma/schema.prisma`, `prisma/migrations/`, `src/lib/forms.ts`.
- Why fragile: Changes to form-builder database tables must be reflected in raw SQL migration scripts as well as embedded SQL queries inside `src/lib/forms.ts`. Prisma schema edits alone do not automatically update raw form-builder queries.
- Test coverage: Covered by unit tests in `src/lib/forms.test.ts` using mocked Prisma calls.

## Scaling Limits

**Worker Fetch Polling:**
- Current capacity: Batch processing up to 25–100 jobs per interval.
- Limit: Polling-based execution in `scripts/submission-worker.mjs` may introduce slight processing delay during sudden bursts of thousands of submissions.
- Symptoms: Submissions remain in `PENDING` state longer than normal.
- Scaling path: Run multiple worker replicas (as demonstrated in the `docker-compose` bench profile) or adopt event-driven notifications.

## Missing Critical Features

**Admin Queue Failure Notifications:**
- Problem: Failed submission jobs reach `FAILED` status after 5 retries without dispatching email or webhook alerts.
- Current workaround: Administrators must manually review logs or database records.
- Priority: Medium.

## Test Coverage Gaps

**UI Integration and End-to-End Browser Testing:**
- What's not tested: Complex UI flows such as multi-step page transitions, signature canvas interaction, client-side draft recovery, and Google OAuth redirect flows.
- Risk: Client-side UI regressions can escape unit tests.
- Priority: High.
- Recommended fix: Introduce Playwright or Cypress for automated E2E testing of `/f/[slug]` and `/admin/forms`.

---

*Concerns audit: 2026-08-28*
