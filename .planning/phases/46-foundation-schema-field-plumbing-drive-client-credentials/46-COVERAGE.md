# Phase 46 — Coverage Matrix

> Capability-to-plan traceability for Phase 46 (Foundation — Schema, Field Plumbing, Drive Client & Credentials).
> Every capability from ROADMAP §46, REQUIREMENTS FILE-01..FILE-05, RESEARCH.md, and CONTEXT.md D-01..D-12 is mapped here.
> An item with no plan is a gap. An item with a plan but no verify hook is unproven.

---

## Capability Matrix

| # | Capability | Method / Endpoint | Decision | Reason | Phase | Verify Hook |
|---|-----------|-------------------|----------|--------|-------|-------------|
| 1 | `FieldType` enum contains `FILE` in PostgreSQL | `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE'` in `prisma/migrations/20261116000000_add_file_upload_tables/migration.sql` | D-11, FILE-01 | Enum is source-of-truth for DB writes; must precede any raw-SQL cast `::"FieldType"` | 46-01 | `npx prisma db execute --stdin` → `pg_enum` query asserts `FILE` present (46-01 Task 3, `[BLOCKING]`) |
| 2 | `submission_files` table exists with the full column set (id, submission_id nullable, field_id nullable, original/sanitized filename, mime, size, checksum, storage status, drive_id, last_error, timestamps) | `CREATE TABLE IF NOT EXISTS submission_files (...)` in same migration | D-11, FILE-02 | Upload records need a durable row even when no submission exists yet (pre-submit spool race) | 46-01 | `information_schema.columns` query on live DB (46-01 Task 3, `[BLOCKING]`) |
| 3 | `file_upload_jobs` table exists with `payload BYTEA NOT NULL`, payload_mime, payload_size, drive_file_id, status, attempt counter, next_attempt_at, processed_at | `CREATE TABLE IF NOT EXISTS file_upload_jobs (...)` in same migration | D-10, D-11, FILE-03 | The bytea column IS the spool — no filesystem, no base64, no `submission_jobs` reuse (D-09) | 46-01 | `information_schema.columns` query on live DB + `pg_indexes` for `file_upload_jobs_status_next_idx` + `file_upload_jobs_file_id_idx` (46-01 Task 3, `[BLOCKING]`) |
| 4 | `submission_files_drive_file_id_key` partial unique index prevents duplicate Drive IDs | `CREATE UNIQUE INDEX ... WHERE drive_id IS NOT NULL` in same migration | D-11, FILE-02 | Idempotent retry safety — two spool rows must never claim the same Drive object | 46-01 | `pg_indexes` query on live DB (46-01 Task 3) |
| 5 | Prisma parity for the file tables (schema edits alone do NOT update form-builder tables — AGENTS.md) | `prisma/schema.prisma` gains `model SubmissionFile`, `model FileUploadJob`, and `FILE` in `FieldType` enum | AGENTS.md parity rule, D-11 | `$queryRaw/$executeRaw` callers rely on column types matching; drift breaks TS types | 46-01 | `npx prisma validate` + `npx tsc --noEmit` (46-01 Tasks 1 & 3) |
| 6 | `FILE` recognized in `src/lib/forms.ts` field-type union and domain types | Add `'FILE'` to DB union, `'file'` to domain union, `FileField` interface, `mapFieldType` / `mapFormFieldTypeToDb` / `mapPublicFieldRow` / `allowedTypes` | D-01..D-04, FILE-01 | Feature is a peer field type, not a second type system — "alongside" describes Prisma parity only (`assumption_delta_decision: promote`) | 46-01 | `npx vitest run src/lib/forms.test.ts -t 'FILE'` round-trip (46-01 Task 2) |
| 7 | `FILE` field carries no `maxLength`/`placeholder` domain properties | `FileField` shape typed as empty config in type tests | D-02 | Upload config (size/type limits) belongs to Phase 47 builder; Phase 46 only proves plumbing | 46-01 | Type-level assertion in `src/lib/forms.test.ts` (46-01 Task 2) |
| 8 | Bytea spool helpers exist for the phase 49 upload path | `src/lib/file-jobs.ts` exports `insertFileUploadJob` (raw `$executeRaw` INSERT INTO `file_upload_jobs`) and `readFileUploadPayload` (raw `$queryRaw` SELECT of `payload` by id) | D-10, D-12, FILE-03 | Spool must be provably non-lossy before any upload code depends on it; claim/complete/fail state-machine helpers are deliberately out of scope (phase 50 owns the worker) | 46-01 | `npx vitest run src/lib/file-jobs.test.ts` — bytes-in → bytes-out through mocked prisma (46-01 Task 3) |
| 9 | `DriveConfig` + `getDriveConfig` env accessor | `src/lib/env.ts` gains `DriveConfig` interface + `getDriveConfig(env: EnvSource = process.env)` | D-05, D-06, FILE-05 | Single validation boundary; PEM unescape happens exactly once, folder-id regex gate is the SSRF mitigation T-46-02-05 | 46-02 | `npx vitest run src/lib/env.test.ts -t 'Drive'` (46-02 Task 2) |
| 10 | `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` documented in `.env.example` | Three commented lines with source hints | D-06, FILE-05 | Boot validation requires documented contract; operators need the exact source path | 46-02 | `git diff .env.example` contains all three names (46-02 Task 5) |
| 11 | Service-account key is never reachable from client bundle or logs | `drive.ts` marked `server-only`; no `console.*` call with the key; PEM header validated before client construction | T-46-01, FILE-05, W10 | Credential leak closes W10 (ROADMAP §46 threats) | 46-02 | `grep -rn 'private' src/components src/app` returns nothing from `process.env` Drive vars + `env.test.ts` asserts no key echo (46-02 Tasks 2 & 3) |
| 12 | Drive client singleton in `src/lib/drive.ts` | `getDriveClient()` memoized per-process; `google.auth.JWT` scoped to `https://www.googleapis.com/auth/drive.file` only | D-05, D-07, FILE-04 | Least-privilege scope + single connection avoids token churn | 46-02 | `npx vitest run src/lib/drive-probe.test.ts` asserts scope constant exactly (46-02 Task 3) |
| 13 | Startup probe classifies permanent vs transient failures | `__test__.classifyError` maps `404`/missing `driveId`/`canAddChildren:false`/`invalid_grant`/`401` → `fatal`; no-response/`429`/`5xx` → `transient` | D-07, D-08, FILE-04 | Silent permanent spool is exactly the failure mode W1 forbids (ROADMAP §46 #4) | 46-02 | `npx vitest run src/lib/drive-probe.test.ts` classifier matrix (46-02 Task 3) |
| 14 | Probe uses `files.get` (not `drives.get`) with `supportsAllDrives: true` and `fields` requesting `driveId` + `capabilities(canAddChildren)` | `__test__.probe` issues one `files.get` call | OQ-4 resolution, D-08 | `drives.get` needs a broader scope than `drive.file`; `files.get` on the folder carries enough proof | 46-02 | `drive-probe.test.ts` asserts request params verbatim + asserts no `drives.get` call (46-02 Task 3) |
| 15 | `getDriveState()` returns `{state:'degraded', reason:'belum di-probe'}` before any probe runs | Exported state accessor backed by `globalThis` slot | D-08 | Health endpoint must never report `ok` before the probe has passed once | 46-02 | `drive-probe.test.ts` asserts pre-probe shape (46-02 Task 3) |
| 16 | Degraded mode is recoverable without a container restart | 60-second re-probe timer pinned to `globalThis.__driveTimer` with `.unref?.()` | D-08 | HMR double-registration + transient outage recovery | 46-02 | Inspection of `src/lib/drive.ts` `scheduleReprobe` (`if (g.__driveTimer) return` guard + `.unref?.()`); no unit test for the timer — recovery proven end-to-end by 46-03 Task 3 operator checkpoint (46-02 Task 3) |
| 17 | `HealthResult` union covers the degraded shape | `src/lib/health.ts` gains `status: 'degraded'` branch carrying `drive: {state, reason}` | D-05, FILE-04 | Health body contract must extend without breaking the exact-string check | 46-02 | `npx vitest run src/lib/health.test.ts` (46-02 Task 4) |
| 18 | Healthy `/api/health` body stays byte-exact `{"status":"ok"}` | `route.ts` unchanged when healthy; degraded branch returns HTTP 200 with the extended body | D-05, FILE-04 | Docker healthcheck + k6 load test parse this exact string today — breaking it breaks deploy | 46-02 | `health.test.ts` byte-equal assertion (46-02 Task 4) |
| 19 | Startup probe fires at boot via `src/instrumentation.ts` `register()` | `NEXT_RUNTIME !== 'nodejs'` guard; awaits `startDriveProbe()`; permanent error exits non-zero | D-07, D-08, FILE-04, OQ-4 | App must not boot into permanent silent-spool state (ROADMAP §46 #4) | 46-02 | `npm run build` + standalone boot smoke: healthy boot exits 0, bad-folder boot exits non-zero (46-02 Task 6, `[BLOCKING]`) |
| 20 | Docker build succeeds without real secrets (build-time placeholders) | `Dockerfile` gains three placeholder `ENV` lines before the build step; compose uses `${VAR:?<Indonesian message>}` | D-06, FILE-05 | `next build` must not require production secrets; runtime validation still happens | 46-02 | `npm run build` inside standalone build smoke (46-02 Task 6) |
| 21 | Real file lands inside the configured Shared Drive folder — proven against live Google Workspace | `scripts/ci-drive-smoke.mjs` uploads with `supportsAllDrives: true` + `parents: [FOLDER_ID]`, then `files.get` verifies `driveId` match | D-01, FILE-04, W1 non-negotiable | Mocked tests cannot prove Shared Drive membership or `driveId` equality — this is THE milestone gate | 46-03 | `node scripts/ci-drive-smoke.mjs` exit 0 + operator opens Drive UI and confirms the file (46-03 Task 3, `[BLOCKING]`/human-verify) |
| 22 | Smoke script fails loud on every mismatch | Exit codes: 1=auth/config, 2=not Shared Drive, 3=driveId mismatch, 4=parents mismatch, 5=trashed, 6=size zero | D-08, FILE-04 | A green exit must mean the proof passed, never a silent skip | 46-03 | Script source review + intentional-failure runs recorded (46-03 Task 2 & 3) |
| 23 | `.env.production` remains git-ignored and never committed | `git check-ignore -v .env.production` passes; no `git add` of the file | D-06, W10 | W10 credential-leak closure requires the key never enter git history | 46-03 | `git check-ignore -v .env.production` + `git status --porcelain` shows no `.env.production` entry (46-03 Task 3) |
| 24 | `permissions.create` for public/anyone sharing is OPT-OUT — the smoke file is visible only to the SA and Shared Drive members | No `permissions.create({type:'anyone'})` anywhere; probe verifies via absence of any such call | T-46-02-04, FILE-04 | Public-link sharing is the exact leak D-07 forbids | 46-03 | `grep -rn 'permissions.create\|type: .anyone.' scripts src` returns no hits (46-03 verify) |

---

## Concurrency Guarantees (must_haves.truths — explicit)

These are stated in plan frontmatter `must_haves.truths` because the phase introduces shared mutable state across concurrent uploads.

### FILE-01 / FILE-02 / FILE-04 — concurrency

- **FILE-01 (enum):** `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is idempotent; concurrent migration attempts (deploy × replica) do not error — proven by 46-01 Task 3's `_prisma_migrations` finished-row assertion.
- **FILE-02 (tables):** `CREATE TABLE IF NOT EXISTS` + `CREATE UNIQUE INDEX IF NOT EXISTS` guarantee re-runnable migrations; the partial unique index `submission_files_drive_file_id_key` enforces single-claim under concurrent retries — 46-01 Task 3 asserts via `pg_indexes`.
- **FILE-04 (probe):** the 60-second re-probe timer is pinned to `globalThis.__driveTimer` and calls `.unref?.()`; concurrent `register()` calls (HMR, dev workers) do not double-register — `src/lib/drive.ts` `scheduleReprobe` guards with `if (g.__driveTimer) return`; no unit test for the timer, recovery proven by 46-03 Task 3 operator checkpoint.

### FILE-03 / FILE-05 — explicit truths

- **FILE-03 (bytea spool):** a `Buffer` written through `$executeRaw` (via `insertFileUploadJob`) reads back byte-identical through `readFileUploadPayload`'s `$queryRaw`; phase 46 supplies only insert/read — the `UPDATE ... FOR UPDATE SKIP LOCKED` claim loop, attempt counter and `next_attempt_at` scheduling are phase 50's worker state machine (46-01 Task 3 pins the column vocabulary `PENDING → SYNCED | FAILED | ORPHANED` per D-09 at the schema level only).
- **FILE-05 (credentials):** `getDriveConfig` is a pure function of its `env` argument (default `process.env`), so concurrent reads under `next dev` HMR produce the same config; the PEM unescape happens exactly once per call and the key is never logged. The `server-only` marker on `drive.ts` prevents client-bundle inclusion.

---

## `permissions.create` — OPT-OUT (mandatory)

| Capability | Decision | Reason | Phase | Verify |
|-----------|----------|--------|-------|--------|
| `permissions.create` with `type:'anyone'` / `role:'reader'` (public-share a file) | **OPT-OUT** — never emitted this phase or any phase unless a future phase explicitly adds an opt-in flag | The upload pipeline must never public-share form submissions; D-07 forbids it and W10 (credential leak) is only closed if files stay inside the Shared Drive | 46 | `grep -rn "permissions.create\|type: .anyone." scripts src` must return 0 matches — enforced in 46-03 Task 2 verify |

---

## Assumptions Flagged (unresolved `$COVERAGE` edges)

| ID | Assumption | Risk if Wrong | Owner |
|----|-----------|---------------|-------|
| A-COV-1 | `@googleapis/drive@27.1.0` exports `files.create` supporting `requestBody: {parents, name}` + `media` in a single call across its generated types | Extra round-trip or type erasure; low severity (worst case: pre-created folder placeholder) | 46-02 Task 2/3 — package legitimacy + type build |
| A-COV-2 | `google-auth-library@11.3.4` `JWT` accepts a PEM with `\n` unescaped once | Auth failure at boot; caught by `getDriveConfig` PEM-header validation before JWT constructor | 46-02 Task 2 |
| A-COV-3 | `file-type@22.3.0` is ESM-only and resolves under Next standalone `serverExternalPackages` if imported this phase | Import error at build; deferred to Phase 47 if imported later — 46-02 conditional import-smoke covers it | 46-02 Task 6 |
| A-COV-4 | Shared Drive service-account membership role `writer` suffices for `files.create` with `supportsAllDrives: true` | Upload fails 403; caught by 46-03 Task 3 proof, mitigated by OQ-2 note that `fileOrganizer` is the fallback | 46-03 Task 1 |
| A-COV-5 | `npx prisma migrate deploy` runs against the live dev DB in this environment (OQ-3) | Plan 01 Task 3 cannot prove live DDL; contingency: split migration into enum-only + table-only folders and run manually | 46-01 Task 3 |

---

## Deferred (out of Phase 46 scope)

| Item | Belongs to |
|------|-----------|
| File upload UI, size/type limits config, builder field config | Phase 47 |
| Public form renderer for `FILE` field | Phase 47 |
| Upload API route + rate limiting | Phase 49 |
| `file_upload_jobs` worker claim loop + state machine transitions | Phase 50 |
| Submission-linked `submission_files` writes | Phase 49/50 |
| `fileOrganizer` role escalation | Phase 50 if delete-any-file is needed |

---

## Gap Summary

| Category | Count | Status |
|----------|-------|--------|
| ROADMAP §46 success criteria | 5 | All covered |
| REQUIREMENTS FILE-01..FILE-05 | 5 | All covered (FILE-01/02/03 → plan 01; FILE-04 → plans 02+03; FILE-05 → plan 02) |
| CONTEXT.md D-01..D-12 | 12 | All covered |
| RESEARCH.md assumptions A1–A7 | 7 | A-COV-1..4 mapped; A5 (instrumentation) covered by 46-02 Task 5; A6/A7 covered by threat model |
| Open questions OQ-1..OQ-4 | 4 | OQ-1/OQ-2 → 46-03 Task 1; OQ-3 → 46-01 Task 3 contingency; OQ-4 → 46-02 Task 6 |
| Unplanned | 0 | — |
