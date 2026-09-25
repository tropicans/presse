# Repository Guidelines

## Project Overview
- `isian`: Next.js 16 App Router app for public form submission and admin form management.
- Root `/` redirects by admin session to `/admin/forms` or `/admin/login`.
- Public users submit at `/f/[slug]`, then land on `/success?slug=<slug>&submissionId=<id>`.
- UI copy is mostly Indonesian; keep new user-facing strings consistent unless task says otherwise.

## Architecture & Data Flow
- App routes live in `src/app/**`; route handlers stay thin and call domain helpers.
- Client UI lives in `src/components/**`; components use React hooks and native `fetch`, no global state/SWR/React Query observed.
- Main form engine is `src/lib/forms.ts`: form loading, validation, branching, quiz scoring, admin CRUD, submissions, CSV export, queued job processing.
- Public GET `/api/public/forms/[slug]` caches form JSON; public POST `/api/public/forms/[slug]/submit` rate-limits by IP, validates, stores, and may enqueue jobs.
- Admin pages/APIs must call `getAdminSession()` from `src/lib/auth.ts`; Google OAuth allowlist comes from `ADMIN_EMAILS`.
- Preview flow uses `src/lib/admin-form-preview.ts`, `localStorage`, and `useSyncExternalStore` to share unsaved editor drafts with preview tabs.
- Persistence is mixed: `prisma/schema.prisma` models legacy `Attendance`; form-builder tables are migration-managed SQL and accessed via `prisma.$queryRaw/$executeRaw` in `src/lib/forms.ts`.
- Background worker: `scripts/submission-worker.mjs` POSTs to `src/app/api/internal/submission-jobs/process/route.ts` with `x-worker-token`.

## Key Directories
- `src/app/` — App Router pages and API route handlers.
- `src/components/` — PascalCase client/server UI components.
- `src/lib/` — auth, Prisma client, form domain logic, rate limiting, display helpers.
- `prisma/` — Prisma schema plus SQL migrations for raw form-builder tables.
- `scripts/` — operational Node scripts, currently submission worker.
- `load-tests/` — k6 load test for public form journey.
- `infra/nginx/` — benchmark Nginx config for compose bench profile.
- `new_design/` — static design references/prototypes; not app source.

## Development Commands
```bash
npm install
npm run dev              # Next dev server on http://localhost:3456
npm run lint             # ESLint flat config
npm run build            # Next standalone build
npm run start            # Next production server
npx tsc --noEmit --pretty false
npm run worker:submission
npm run load:test:public
```
- Targeted lint example: `npm run lint -- src/components/AttendanceForm.tsx`.
- Prisma changes: `npx prisma migrate dev --name <name>` then `npx prisma generate`.
- `README.md` is stock create-next-app text and has stale port `3000`; prefer `package.json` and this file.

## Runtime & Tooling Preferences
- Use npm only; `package-lock.json` and Dockerfile `npm ci` are canonical. No pnpm/yarn/bun config observed.
- Runtime target is Node 22 Alpine in `Dockerfile`; Next config uses `output: "standalone"`.
- TypeScript is strict with alias `@/* -> ./src/*` in `tsconfig.json`.
- ESLint config is `eslint.config.mjs` with Next core-web-vitals and TypeScript presets.
- Env template is `.env.example`; keep `NEXTAUTH_URL` aligned with port `3456` locally.
- Compose uses `.env.production`, `postgres`, `app`, `worker`, optional `bench` profile, and port `3456` (`3457` via bench proxy).

## Code Conventions & Patterns
- Components: PascalCase files in `src/components`; route files: `page.tsx`/`route.ts`.
- Imports should use `@/` alias for `src/*`.
- Server admin pages gate auth, then render client components that call `/api/admin/forms*`.
- For Next.js 16 App Router, existing routes type `params`/`searchParams` as `Promise<...>` and `await` them.
- Public form UI is centralized in `src/components/AttendanceForm.tsx` despite name; it handles standard, quiz, attendance, and webinar flows.
- Rate limiting in `src/lib/rate-limit.ts` is in-memory per process; do not treat it as multi-instance protection.
- Keep migration SQL and `src/lib/forms.ts` raw SQL in sync; Prisma schema edits alone do not update form-builder tables.
- Preserve `next.config.ts` `serverExternalPackages` for `@prisma/client`, `@prisma/adapter-pg`, and `pg` when touching build/deploy config.

## Important Files
- `src/app/layout.tsx` — app metadata and root layout.
- `src/app/f/[slug]/page.tsx` — public form entry.
- `src/app/success/page.tsx` — public submission confirmation.
- `src/app/admin/forms/**` — admin form management pages.
- `src/app/api/public/forms/[slug]/**` — public form JSON and submit APIs.
- `src/app/api/admin/forms/**` — admin CRUD, submissions, export APIs.
- `src/lib/auth.ts` — NextAuth Google provider and admin allowlist.
- `src/lib/prisma.ts` — PrismaPg adapter and connection pool env handling.
- `src/lib/forms.ts` — form-builder source of truth.
- `src/lib/rate-limit.ts` — per-process sliding-window limiter.
- `Dockerfile`, `docker-compose.yml`, `start.sh` — container runtime and migration startup.

## Testing & QA
- No unit/integration/E2E test script or CI workflow is checked in.
- Minimum verification for non-trivial code changes:
```bash
npm run lint
npx tsc --noEmit --pretty false
npm run build
```
- For form/auth changes, manually verify admin login, `/admin/forms`, public `/f/[slug]` submit, `/success`, and relevant export route.
- k6 load test: `npm run load:test:public`; envs include `BASE_URL`, `FORM_SLUG`, `K6_VUS`, `K6_ITERATIONS_PER_VU`, `K6_MAX_DURATION`, `SUBMIT_FORM`, `LOAD_FORM_DEFINITION`, `UNIQUE_IPS`, `PARTICIPANT_TYPE`.
- Load test covers `/f/<slug>`, `/api/public/forms/<slug>`, optional `/api/public/forms/<slug>/submit`.

## Commit Attribution
AI commits MUST include own model attribution, for example:
```text
Co-Authored-By: Claude Sonnet 4 <noreply@example.com>
```
