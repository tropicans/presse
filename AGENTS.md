# Agent Notes

## Commands
- Use `npm` only: `npm install`, `npm run dev`, `npm run lint`, `npm run build`.
- Dev runs on `http://localhost:3456`; keep `NEXTAUTH_URL` aligned with that port.
- Targeted lint: `npm run lint -- src/path/to/file.tsx`.
- Standalone typecheck: `npx tsc --noEmit --pretty false`.
- Prisma changes: `npx prisma migrate dev --name <name>` then `npx prisma generate`.

## Verified Gates
- No test script, CI workflow, or pre-commit config is checked in.
- Minimum verification: `npm run lint` -> `npx tsc --noEmit --pretty false` -> `npm run build`.
- For form or auth changes, manually verify admin login, `/admin/forms`, a public `/f/[slug]` submit, `/success`, and the matching export route.

## App Shape
- Public form entrypoint is `src/app/f/[slug]/page.tsx`; successful submits redirect to `/success?slug=<slug>&submissionId=<id>`.
- Admin pages in `src/app/admin/**` only gate auth on the server, then hand off to client components in `src/components/*` that call `/api/admin/forms*`.
- Follow the existing Next.js 16 pattern: App Router `params` and `searchParams` are typed as `Promise<...>` and awaited.

## Data / Prisma Gotchas
- `src/lib/forms.ts` is the source of truth for form-builder behavior: form loading, validation, quiz scoring, admin CRUD, submissions, and CSV export all live there.
- Dynamic form tables (`forms`, `form_fields`, `field_options`, `submissions`, `submission_answers`) are created in SQL migrations and accessed with `prisma.$queryRaw/$executeRaw`; `prisma/schema.prisma` only models `Attendance`.
- Keep migration SQL and `src/lib/forms.ts` in sync for form-builder data changes; Prisma schema edits alone are not enough.
- The attendance template is special-cased as slug `attendance-template` / id `attendance-template-form` and is auto-seeded by `seedAttendanceTemplateIfNeeded()`.

## Legacy Attendance
- Attendance still has legacy admin routes: `/api/attendance` and `/api/attendance/export`.
- `/api/attendance/export` returns XLSX via `exceljs`; builder form exports use `/api/admin/forms/[id]/export` and return CSV.
- Public submits go through `/api/public/forms/[slug]/submit`; attendance slugs can still fall back to legacy attendance submission logic inside `createPublicFormSubmission()`.

## Auth / Env
- Admin auth is Google OAuth via NextAuth in `src/lib/auth.ts`; only emails in `ADMIN_EMAILS` can access `/admin`.
- Required local env is defined in `.env.example`: `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `ADMIN_EMAILS`.

## Conventions
- User-facing UI copy and API errors are currently Indonesian; keep new strings consistent unless the task explicitly changes language.
- Recent git history is mostly Conventional Commits with scopes, e.g. `feat(forms): ...`, `fix(forms): ...`.
- `next.config.ts` uses `output: "standalone"` and keeps `@prisma/client`, `@prisma/adapter-pg`, and `pg` as runtime server packages; preserve that when touching build or deploy config.
