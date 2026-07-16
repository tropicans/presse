# Codebase Concerns

**Analysis Date:** 2026-07-16

## Tech Debt

**Raw SQL query dependency in Form Engine:**
- Issue: Forms configuration, submissions lookup, and worker transactions use raw queries via `prisma.$queryRaw` instead of Prisma's structured API.
- Files: `src/lib/forms.ts` (multiple functions like `processQueuedSubmissionJobs`, `listAdminFormSubmissions`).
- Why: Implements highly dynamic column lookups and row schema modifications that Prisma Client's static model type generation does not native-support.
- Impact: Increased maintenance overhead, potential for PostgreSQL syntax errors, database schema changes must be manually reflected in SQL template strings.
- Fix approach: Abstract raw SQL calls into modular query builders with strict validation, or evaluate JSONB fields for dynamic data.

**Complex Dynamic Branching UI Logic:**
- Issue: Step rendering, paging, validation, and branching rules are split between server calculations and massive UI state code.
- Files: `src/components/AttendanceForm.tsx`, `src/lib/forms.ts`.
- Why: Accommodates standard forms, webinar flows, attendance workflows, and quiz logic in a single interface.
- Impact: Modifying specific page transition behaviors is fragile and can easily break other workflows.
- Fix approach: Refactor form modes into isolated sub-components and state providers.

## Known Bugs

**Process-Bound Rate Limiting:**
- Symptoms: Rate limits can be easily bypassed or behave inconsistently if the application is scaled horizontally (multi-instance).
- Trigger: Multiple requests landing on different instances of the app.
- Files: `src/lib/rate-limit.ts`.
- Workaround: The system blocks production deployment unless `RATE_LIMIT_SINGLE_INSTANCE_OK` is explicitly set to `true`.
- Root cause: Throttling uses a process-local `Map` instance to log client IP request frequencies.
- Fix: Replace the local store with a shared Redis adapter.

## Security Considerations

**Static Environment Admin Allowlist:**
- Risk: Google OAuth session validation queries the static `ADMIN_EMAILS` variable. Modifying admin access requires modifying env configs and restarting the runtime.
- Files: `src/lib/auth.ts`, `src/lib/env.ts`.
- Current mitigation: Checked server-side on sign-in callback.
- Recommendations: Migrate admin profiles to a database table or integration provider group.

**Large Base64 Canvas Payload Uploads:**
- Risk: Signature fields allow submitting base64 encoded strings up to 500,000 characters direct to PostgreSQL text columns.
- Files: `src/components/SignaturePad.tsx`, `src/lib/forms.ts`.
- Current mitigation: Maximum size checked during validation (`MAX_SIGNATURE_LENGTH = 500000`).
- Recommendations: Restrict signature canvas resolution or dump image blobs to object storage and save URLs in the database.

## Performance Bottlenecks

**Database Connection Exhaustion:**
- Problem: Complex query transactions and background worker loops can exhaust connection slots on the database.
- Files: `src/lib/prisma.ts`, `docker-compose.yml`.
- Cause: Next.js hot-reloading or heavy concurrent queries combined with pool defaults might exceed max connections.
- Improvement path: Ensure pool parameters (`DB_POOL_MAX`, `DB_POOL_MIN`) are tuned in relation to the PostgreSQL server `max_connections` (configured to 300).

## Fragile Areas

**Raw Builder Table Migrations:**
- Files: `prisma/schema.prisma`, `prisma/migrations/`.
- Why fragile: Form structural modifications (like submission answers index, jobs statuses) require complex, multi-statement raw SQL migrations which must remain perfectly in sync with the Javascript forms engine parser.
- Test coverage: Partially tested via unit tests utilizing mocked client instances.

## Scaling Limits

**Worker Fetch Polling:**
- Current capacity: Batching processes up to 100 jobs per interval.
- Limit: Sequential polling structure in `scripts/submission-worker.mjs` might introduce latency under heavy traffic.
- Symptoms: Submission job backlog increases.
- Scaling path: Introduce webhook/push events or parallelize worker polling threads.

## Missing Critical Features

**Admin Queue Notifications:**
- Problem: Failed submission job items update `status` to `FAILED` in the database but do not trigger notifications or alerts.
- Current workaround: Admin must manually check tables or logs for failures.
- Implementation complexity: Low (add logging hook or mailer task on terminal fail status).

## Test Coverage Gaps

**UI Integration and End-to-End Flow:**
- What's not tested: Form navigation, signature drawing, local storage draft caching, and NextAuth session transitions.
- Risk: UI regressions or page rendering bugs can go undetected.
- Priority: High.
- Difficulty to test: Requires setting up a browser automation framework (e.g., Playwright) to trace user input states.

---

*Concerns audit: 2026-07-16*
*Update as issues are fixed or new ones discovered*
