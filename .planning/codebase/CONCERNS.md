# Codebase Concerns

**Analysis Date:** 2026-09-25

## Tech Debt

**Monolithic Domain Engine (`src/lib/forms.ts`):**
- Issue: `src/lib/forms.ts` exceeds 3,000 lines of code. It acts as a massive god-module housing CRUD operations, raw SQL tagged template queries, submission validations, conditional branching navigation, quiz grading, CSV/Excel export builders, and queue drainage functions.
- Files: `src/lib/forms.ts`
- Impact: High cognitive load, elevated risk of regressions when modifying one feature that inadvertently affects another, and difficulty in testing sub-domains in isolation.
- Fix approach: Modularize into dedicated submodules under `src/lib/forms/`:
  - `src/lib/forms/validation.ts`
  - `src/lib/forms/scoring.ts`
  - `src/lib/forms/export.ts`
  - `src/lib/forms/queue.ts`
  - `src/lib/forms/repository.ts`

**Monolithic Global Stylesheet (`src/app/globals.css`):**
- Issue: `src/app/globals.css` contains over 6,200 lines of CSS rules, combining base reset, design tokens, light/dark theme variables, form components, admin data tables, modals, and responsive layout classes in a single file.
- Files: `src/app/globals.css`
- Impact: Increased CSS bundle size on initial load, high specificity conflicts, and fragile styling modifications.
- Fix approach: Split into modular token files or CSS modules matching components (`components/admin.module.css`, `components/form.module.css`).

**Dual Persistence Mechanism (Prisma ORM vs. Raw SQL):**
- Issue: The application relies on Prisma Schema (`prisma/schema.prisma`) for typing and certain models, but extensively executes raw parameterized SQL (`prisma.$queryRaw` and `prisma.$executeRaw`) in `src/lib/forms.ts`.
- Files: `prisma/schema.prisma`, `src/lib/forms.ts`, `prisma/migrations/`
- Impact: Schema changes require triple maintenance (Prisma schema, migration SQL files, and embedded raw SQL query strings). Omitting one causes subtle runtime failures.
- Fix approach: Standardize query helpers or use a query builder / complete Prisma model mapping to avoid query string drifting.

## Known Bugs & Edge Cases

**Excel Export Memory Pressure:**
- Symptoms: Large export requests can lead to high memory consumption on the Node.js process.
- Files: `src/lib/forms.ts`, `src/app/api/admin/forms/[id]/export/route.ts`
- Trigger: Exporting forms with thousands of submission rows containing long text or rich answers.
- Workaround: A hard cap (`ADMIN_EXCEL_EXPORT_ROW_LIMIT = 500`) is in place. Submissions exceeding 500 rows cannot currently be exported in a single batch without pagination.

## Security Considerations

**In-Memory Rate Limiting on Multi-Instance Deployments:**
- Risk: `src/lib/rate-limit.ts` uses an in-memory sliding window `Map`. In a multi-replica or auto-scaling container environment, requests from the same IP hitting different instances will bypass rate limits.
- Files: `src/lib/rate-limit.ts`
- Current mitigation: A deployment guard (`RATE_LIMIT_SINGLE_INSTANCE_OK`) forces administrators to acknowledge single-instance deployment.
- Recommendations: Implement a Redis-backed or database-backed distributed rate limiter when scaling horizontally.

**Client IP Header Spoofing:**
- Risk: When deployed behind multiple proxies or CDN layers, reading `x-forwarded-for` without verifying trusted upstream proxies could allow attackers to spoof client IPs and circumvent rate limiting.
- Files: `src/lib/rate-limit.ts`, `src/app/api/public/forms/[slug]/submit/route.ts`
- Current mitigation: Reads standard headers, but assumes trusted proxy setup.
- Recommendations: Configure explicit trusted proxy hops in Nginx/Docker network.

**Large Payload & Signature Storage:**
- Risk: Base64-encoded signatures (`MAX_SIGNATURE_LENGTH = 500000`) and JSON payloads stored directly in PostgreSQL text columns can lead to database bloat if spam submissions occur.
- Files: `src/lib/forms.ts`, `prisma/schema.prisma`
- Current mitigation: Strict length validation in `validateFormSubmission`.
- Recommendations: Store high-resolution binary signatures in an S3-compatible object store (e.g. MinIO) and store only references in PostgreSQL.

## Performance Bottlenecks

**In-Memory Submissions Aggregation for AI Analysis:**
- Problem: `preAggregateSubmissions` fetches up to 1,000 submission rows and processes them in Node memory.
- Files: `src/lib/ai-analysis.ts:L30-L75`
- Cause: Lack of SQL-level `GROUP BY` aggregation for choice questions.
- Improvement path: Migrate quantitative counts (radio, select, yes/no) to SQL aggregate queries (`SELECT value_text, COUNT(*) FROM submission_answers GROUP BY value_text`) to reduce memory and transfer overhead.

## Fragile Areas

**Conditional Branching Engine:**
- Files: `src/lib/forms.ts`, `src/components/AttendanceForm.tsx`, `src/components/AdminFormEditor.tsx`
- Why fragile: Page routing logic depends on dynamic field values evaluated on the client and re-evaluated during server validation. Any discrepancy between client route computation and server step resolution will cause submission rejections.
- Safe modification: When modifying branching algorithms, test multi-page branching flows in both `AttendanceForm.tsx` and `forms.test.ts`.

## Scaling Limits

**Submission Worker Concurrency:**
- Current capacity: Single worker script (`scripts/submission-worker.mjs`) draining batches of 25 items every 250ms.
- Limit: PostgreSQL connection pool limits and serial batch loop.
- Scaling path: Run multiple worker replicas safely using PostgreSQL's `FOR UPDATE SKIP LOCKED` query mechanism.

## Dependencies at Risk

**`@hono/node-server` Dependency Override:**
- Risk: Overridden to `^1.19.13` in `package.json:overrides` to satisfy peer dependencies without a clear direct import in the core codebase.
- Impact: Potential version mismatches during major dependency upgrades.
- Migration plan: Audit whether the override is still required after upgrading to newer Next.js / Node versions.

## Missing Critical Features

**Automated CI/CD Pipeline:**
- Problem: No GitHub Actions or GitLab CI workflow configuration exists in the repository.
- Blocks: Automated PR verification (lint, typecheck, tests) must be performed manually by developers before merging.

**UI Component Testing:**
- Problem: Zero component-level unit tests (e.g. React Testing Library) or E2E browser tests (Playwright).
- Blocks: Regressions in user interaction (canvas drawing, step navigation, modal dialogues) can only be caught through manual QA.

## Test Coverage Gaps

**Client Components (`src/components/`):**
- What's not tested: `AttendanceForm.tsx`, `AdminFormEditor.tsx`, `AdminFormSubmissions.tsx`, `SignaturePad.tsx`.
- Files: All files in `src/components/`.
- Risk: Breaking changes in canvas event listeners, form pagination state, or table filters can slip into production unnoticed.
- Priority: High.

**Admin API Route Handlers:**
- What's not tested: Route-level integration tests for `/api/admin/forms/*` endpoints.
- Files: `src/app/api/admin/forms/**/route.ts`.
- Risk: Authentication session leaks or HTTP serialization errors.
- Priority: Medium.

---

*Concerns audit: 2026-09-25*
