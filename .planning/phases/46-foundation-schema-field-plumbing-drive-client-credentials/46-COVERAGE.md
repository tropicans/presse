# Phase 46 — Coverage Matrix

> Capability-to-plan traceability for Phase 46 (Foundation — Schema, Field Plumbing, MinIO Client & Credentials).
> Every capability from ROADMAP §46, REQUIREMENTS FILE-01..FILE-05, RESEARCH.md, and CONTEXT.md D-01..D-14 is mapped here.
> An item with no plan is a gap. An item with a plan but no verify hook is unproven.
>
> **Revision 2026-11-16:** the original matrix mapped a Google Drive backend. Drive proved infeasible (`46-03-SUMMARY.md`: `canCreateDrives: false`, `drives.list: []`, My Drive folder with `storageQuota.limit: "0"`, `files.get` @ `drive.file` → 404). Plan `46-02` and `46-03` are **superseded**; plan `46-04` implements the same capabilities on MinIO. Rows 9-24 below are the rewritten MinIO versions.

---

## Capability Matrix

| # | Capability | Method / Endpoint | Decision | Reason | Phase | Verify Hook |
|---|-----------|-------------------|----------|--------|-------|-------------|
| 1 | `FieldType` enum contains `FILE` in PostgreSQL | `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE'` in `prisma/migrations/20261116000000_add_file_upload_tables/migration.sql` | D-11, FILE-01 | Enum is source-of-truth for DB writes; must precede any raw-SQL cast `::"FieldType"` | 46-01 | `pg_enum` query asserts `FILE` present (46-01 Task 3, `[BLOCKING]`) — ✅ green |
| 2 | `submission_files` table exists with the full column set (id, submission_id nullable, field_id nullable, original/sanitized filename, mime, size, checksum, storage status, `bucket`, `object_key`, last_error, timestamps) | `CREATE TABLE IF NOT EXISTS submission_files (...)` in same migration | D-11, FILE-02 | Upload records need a durable row even when no submission exists yet (pre-submit spool race) | 46-01 | `information_schema.columns` query on live DB (46-01 Task 3, `[BLOCKING]`) — ✅ green |
| 3 | `file_upload_jobs` table exists with `payload BYTEA NOT NULL`, payload_mime, payload_size, `object_key`, status, attempt counter, next_attempt_at, processed_at | `CREATE TABLE IF NOT EXISTS file_upload_jobs (...)` in same migration | D-10, D-11, FILE-03 | The bytea column IS the spool — no filesystem, no base64, no `submission_jobs` reuse (D-09) | 46-01 | `information_schema.columns` + `pg_indexes` on live DB (46-01 Task 3, `[BLOCKING]`) — ✅ green |
| 4 | `submission_files_bucket_object_key_key` partial unique index enforces object identity | `CREATE UNIQUE INDEX ... ON (bucket, object_key) WHERE object_key IS NOT NULL` (46-04 migration) | D-11, D-14, FILE-02 | Object identity is the `(bucket, key)` pair — two rows must never claim the same object | 46-04 | `pg_indexes` query on live DB + migration guard script (46-04 Task 3) — ✅ green |
| 5 | Prisma parity for the file tables (schema edits alone do NOT update form-builder tables — AGENTS.md) | `prisma/schema.prisma` gains `model SubmissionFile` (`objectKey`/`bucket`), `model FileUploadJob` (`objectKey`), and `FILE` in `FieldType` enum | AGENTS.md parity rule, D-11 | `$queryRaw/$executeRaw` callers rely on column types matching; drift breaks TS types | 46-01 / 46-04 | `npx prisma validate` + `npx tsc --noEmit` (46-01 Tasks 1 & 3, 46-04 Task 3) — ✅ green |
| 6 | `FILE` recognized in `src/lib/forms.ts` field-type union and domain types | Add `'FILE'` to DB union, `'file'` to domain union, `FileField` interface, `mapFieldType` / `mapFormFieldTypeToDb` / `mapPublicFieldRow` / `allowedTypes` | D-01..D-04, FILE-01 | Feature is a peer field type, not a second type system | 46-01 | `npx vitest run src/lib/forms.test.ts -t 'FILE'` round-trip (46-01 Task 2) — ✅ green |
| 7 | `FILE` field carries no `maxLength`/`placeholder` domain properties | `FileField` shape typed as empty config in type tests | D-02 | Upload config belongs to Phase 47 builder; Phase 46 only proves plumbing | 46-01 | Type-level assertion in `src/lib/forms.test.ts` (46-01 Task 2) — ✅ green |
| 8 | Bytea spool helpers exist for the phase 49 upload path | `src/lib/file-jobs.ts` exports `insertFileUploadJob` and `readFileUploadPayload` | D-10, D-12, FILE-03 | Spool must be provably non-lossy before any upload code depends on it; claim/complete/fail helpers belong to phase 50 | 46-01 | `npx vitest run src/lib/file-jobs.test.ts` — bytes-in → bytes-out (46-01 Task 3); live-DB 6/6 — ✅ green |
| 9 | `StorageConfig` + `getStorageConfig` env accessor | `src/lib/env.ts` gains `StorageConfig` interface + `getStorageConfig(env: EnvSource = process.env)` | D-06, D-07, FILE-05 | Single validation boundary; port and bucket are URL-construction inputs, so both are gated | 46-04 | `npx vitest run src/lib/env.test.ts -t 'getStorageConfig'` (46-04 Task 2) — ✅ green |
| 10 | `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET` documented in `.env.example` | Six commented lines with source hints and the "bucket stays private" note | D-06, FILE-05 | Boot validation requires documented contract; operators need the exact source path | 46-04 | `.env.example` contains all six names; `grep` finds zero Drive vars (46-04 Task 4) — ✅ green |
| 11 | Storage credentials are never reachable from client bundle, logs, or error text | `storage.ts` marked `server-only`; `describeStorageError` returns a fixed vocabulary with no interpolation of bodies, headers, or credential fields | T-46-04-01, FILE-05, W10 | Credential leak closes W10 | 46-04 | `storage-probe.test.ts` asserts a nested `secretAccessKey` never appears in the returned string; `grep -rn` finds no `process.env.MINIO_*` in `src/components` / `src/app` (46-04 Task 2) — ✅ green |
| 12 | S3 client singleton in `src/lib/storage.ts` | `getStorageClient()` memoized on `globalThis.__s3`; `forcePathStyle: true`, region `us-east-1` | D-05 analogue, FILE-04 | MinIO serves buckets as path segments; virtual-host addressing needs wildcard DNS it does not have | 46-04 | `storage-probe.test.ts` / `storage.ts` structural assertions (46-04 Task 1) — ✅ green |
| 13 | Object identity is deterministic | `buildObjectKey(fileId)` returns `files/<fileId>` — no timestamp, no random suffix | D-13, FILE-04 | S3 PUT is idempotent per key, so a retried push overwrites instead of duplicating; removes duplicate reconciliation entirely | 46-04 | `buildObjectKey` determinism + distinctness tests (46-04 Task 1) — ✅ green |
| 14 | Startup probe never throws, never exits | `probeStorage()` calls `headBucket()` and converts every failure into `{state:'degraded', reason}`; `startStorageProbe()` logs a warning and schedules a 60 s re-probe while degraded | D-01 (revised), D-02, D-03, FILE-04 | A storage outage must not take down public form submissions — spool absorbs them | 46-04 | `storage-probe.test.ts` degraded-path tests + `health.test.ts` degraded branch (46-04 Task 2) — ✅ green |
| 15 | `getStorageState()` returns `{state:'degraded', reason:'belum di-probe'}` before any probe runs | Exported state accessor backed by a `globalThis` slot | D-08 analogue | Health endpoint must never report `ok` before the probe has passed once | 46-04 | `storage-probe.test.ts` pre-probe shape assertion (46-04 Task 2) — ✅ green |
| 16 | Degraded mode is recoverable without a container restart | 60-second re-probe timer pinned to `globalThis` with `.unref?.()`; re-probe only runs while degraded | D-03 | HMR double-registration + transient outage recovery | 46-04 | Timer guard inspection in `src/lib/storage-probe.ts`; recovery is operator-verified in the manual table of `46-VALIDATION.md` — ✅ structural |
| 17 | `HealthResult` union covers the degraded shape | `src/lib/health.ts` gains `status: 'degraded'` branch carrying `storage: {state, reason}` | D-04, D-05, FILE-04 | Health body contract must extend without breaking the exact-string check | 46-04 | `npx vitest run src/lib/health.test.ts` (46-04 Task 2) — ✅ green |
| 18 | Healthy `/api/health` body stays byte-exact `{"status":"ok"}` | `route.ts` unchanged when healthy; degraded branch returns HTTP 200 with the extended body | D-05, FILE-04 | Docker healthcheck + k6 load test parse this exact string today | 46-04 | `health.test.ts` byte-equal assertion; live `Invoke-RestMethod` returned `{"status":"ok"}` (46-04 Task 6) — ✅ green |
| 19 | Startup probe fires at boot via `src/instrumentation.ts` `register()` | `NEXT_RUNTIME !== 'nodejs'` guard; `startStorageProbe()` awaited inside a `try`; failures logged, never fatal | D-01 (revised), FILE-04 | Process must boot into degraded mode rather than crash-loop when storage is down | 46-04 | `npm run build` + live stack boot: `isian-app` reached `Healthy` (46-04 Task 6) — ✅ green |
| 20 | Docker build succeeds without real secrets (build-time placeholders) | `Dockerfile` gains six `MINIO_*` placeholder `ENV` lines before the build step; compose uses `${VAR:?}` for access/secret | D-06, FILE-05 | `next build` must not require production secrets; runtime validation still happens | 46-04 | `docker compose --env-file .env.production build app worker` exit 0 (46-04 Task 4/6) — ✅ green |
| 21 | Real bytes round-trip through the configured MinIO bucket and land byte-identical | `scripts/ci-storage-smoke.mjs` `PutObject` then `GetObject`, comparing length and then every byte | D-01 (revised), FILE-04, W1 analogue | Mocked tests cannot prove a live bucket stores exactly what was sent — this is THE milestone gate | 46-04 | `docker run --rm --network jott_default ... scripts/ci-storage-smoke.mjs` → `PASS`, `SMOKE_EXIT=0` (46-04 Task 6, `[BLOCKING]`/human-verify) — ✅ green |
| 22 | Bucket refuses anonymous access | Unauthenticated `fetch` of the object URL must not answer 200 | T-46-04-02, FILE-19 | Public bucket = public form submissions; FILE-19 forbids public file access | 46-04 | Same smoke run: `step 4/4 anonymous ditolak HTTP 403`; a 200 exits 6 (46-04 Task 6) — ✅ green |
| 23 | Smoke script fails loud on every mismatch | Exit codes: 1=missing/invalid env, 2=storage unreachable, 3=credentials rejected, 4=bucket missing and uncreatable, 5=bytes differ, 6=anonymous GET returned 200 | FILE-04 | A green exit must mean the proof passed, never a silent skip | 46-04 | `node --check scripts/ci-storage-smoke.mjs` + documented header contract (46-04 Task 5) — ✅ green |
| 24 | MinIO console and API are not reachable from the public internet | `minio` service declares **no** `ports:` mapping; console only via `docker exec` / SSH tunnel | T-46-04-02, FILE-19 | Exposed console = exposed credentials | 46-04 | `docker compose config --services` → `minio, postgres, app, worker`; `docker compose config` shows no `ports` under `minio` (46-04 Task 4) — ✅ green |

---

## Superseded Rows (Drive era — no longer applicable)

| Original row | Was | Superseded by | Reason |
|--------------|-----|---------------|--------|
| Drive `getDriveConfig` / PEM handling (old #9) | Shared Drive folder-id regex + PEM unescape | #9 `getStorageConfig` | No PEM, no folder id — S3 credentials are plain key/secret |
| Drive env vars in `.env.example` (old #10) | `GOOGLE_*` × 3 | #10 `MINIO_*` × 6 | Drive vars removed from `.env.production`, `.env.example`, `Dockerfile`, `docker-compose.yml` |
| Drive client singleton `src/lib/drive.ts` (old #12) | `google.auth.JWT` @ `drive.file` scope | #12 `src/lib/storage.ts` | `src/lib/drive.ts` and `src/lib/drive-probe.test.ts` deleted |
| Drive probe classifier fatal vs transient (old #13) | `fatal` for `404` / missing `driveId` / `invalid_grant` | #14 degraded-only probe | D-01 revised: with MinIO in the same stack, there is no boot-time class of error worth crashing for |
| `files.get` with `supportsAllDrives` (old #14) | Drive-specific verification | #21 live round-trip | MinIO has no Shared Drive concept; byte round-trip is the stronger proof |
| `permissions.create` OPT-OUT (old #24) | Drive sharing API | #22 anonymous-GET refusal | Drive sharing API does not exist in S3; anonymous GET refusal is the equivalent assertion |
| `scripts/ci-drive-smoke.mjs` (old #21/#22) | `node scripts/ci-drive-smoke.mjs` | `scripts/ci-storage-smoke.mjs` | Same purpose, new backend |

---

## Concurrency Guarantees (must_haves.truths — explicit)

These are stated in plan frontmatter `must_haves.truths` because the phase introduces shared mutable state across concurrent uploads.

### FILE-01 / FILE-02 / FILE-04 — concurrency

- **FILE-01 (enum):** `ALTER TYPE ... ADD VALUE IF NOT EXISTS` is idempotent; concurrent migration attempts (deploy × replica) do not error — proven by 46-01 Task 3's `_prisma_migrations` finished-row assertion.
- **FILE-02 (tables):** `CREATE TABLE IF NOT EXISTS` + `CREATE UNIQUE INDEX IF NOT EXISTS` guarantee re-runnable migrations; the column rename in `20261116120000_swap_drive_columns_for_object_storage` uses in-place `RENAME COLUMN` so existing rows keep identity, and the partial unique index `submission_files_bucket_object_key_key` enforces single-claim on `(bucket, object_key)` under concurrent retries.
- **FILE-04 (probe + object identity):** the 60-second re-probe timer is pinned to `globalThis` and calls `.unref?.()`; concurrent `register()` calls (HMR, dev workers) do not double-register. `buildObjectKey(fileId)` is a pure function, so two concurrent pushes for the same file id target the same key and the second PUT overwrites the first — no duplicate object can exist.

### FILE-03 / FILE-05 — explicit truths

- **FILE-03 (bytea spool):** a `Buffer` written through `$executeRaw` (via `insertFileUploadJob`) reads back byte-identical through `readFileUploadPayload`'s `$queryRaw`; phase 46 supplies only insert/read — the `UPDATE ... FOR UPDATE SKIP LOCKED` claim loop, attempt counter and `next_attempt_at` scheduling are phase 50's worker state machine (46-01 Task 3 pins the column vocabulary `PENDING → SYNCED | FAILED | ORPHANED` per D-09 at the schema level only).
- **FILE-05 (credentials):** `getStorageConfig` is a pure function of its `env` argument (default `process.env`), so concurrent reads under `next dev` HMR produce the same config. The secret is never logged, and `describeStorageError` classifies without echoing. The `server-only` marker on `storage.ts` and `storage-probe.ts` prevents client-bundle inclusion.

---

## Public-Sharing — OPT-OUT (mandatory)

| Capability | Decision | Reason | Phase | Verify |
|-----------|----------|--------|-------|--------|
| Public bucket policy, `s3:GetObject` on `*` principal, anonymous read, or a presigned URL handed to a browser | **OPT-OUT** — never emitted this phase or any phase unless a future phase explicitly adds an opt-in flag | The upload pipeline must never public-share form submissions; FILE-19 forbids it and W10 is only closed if files stay reachable through app routes only | 46 | `scripts/ci-storage-smoke.mjs` asserts an unauthenticated GET is refused (exit 6 otherwise) — 46-04 Task 5/6, live PASS recorded |

---

## Assumptions Flagged (unresolved `$COVERAGE` edges)

| ID | Assumption | Risk if Wrong | Owner | Status |
|----|-----------|---------------|-------|--------|
| A-COV-1 | `@aws-sdk/client-s3@3.1169.0` + `@aws-sdk/s3-request-presigner@3.1169.0` (Apache-2.0, maintainers `amzn-oss`/`aws-sdk-bot`) satisfy the package-legitimacy gate | Supply-chain tampering — mitigated by pinning exact versions in `package-lock.json` | 46-04 Task 1 | ✅ resolved (installed after legitimacy check) |
| A-COV-2 | MinIO accepts path-style addressing with region `us-east-1` and no virtual-host DNS | Client fails at first PUT; proven false by the live smoke run | 46-04 Task 1/6 | ✅ resolved (smoke PASS) |
| A-COV-3 | `file-type@22.3.0` is ESM-only and resolves under Next standalone | Import error at build; deferred to Phase 47 if imported later | Phase 47 | ⏳ carries forward |
| A-COV-4 | MinIO root credentials are acceptable app credentials for a single-tenant deployment | Privilege over-reach; bucket is private and the API is not internet-reachable in the meantime | 46-04 threat model T-46-04-05 (accepted) | ⏳ hardening follow-up in Phase 53 |
| A-COV-5 | `npx prisma migrate deploy` runs against the live dev DB in this environment (OQ-3) | Plan 01/46-04 cannot prove live DDL | 46-04 Task 6 | ✅ resolved (migration applied; columns verified) |
| A-COV-6 | The MinIO image pinned by digest `sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e` stays pullable | Force-pull failure on a fresh host; mitigation: mirror the image or re-pin from registry metadata | 46-04 Task 4 | ⏳ operational |

---

## Deferred (out of Phase 46 scope)

| Item | Belongs to |
|------|-----------|
| File upload UI, size/type limits config, builder field config | Phase 47 |
| Public form renderer for `FILE` field | Phase 47 |
| Upload API route + rate limiting | Phase 49 |
| `file_upload_jobs` worker claim loop + state machine transitions | Phase 50 |
| Submission-linked `submission_files` writes | Phase 49/50 |
| Scoped MinIO policy user instead of root credentials | Phase 53 hardening |
| Retention TTL value and purge job | Phase 50 / 53 |

---

## Gap Summary

| Category | Count | Status |
|----------|-------|--------|
| ROADMAP §46 success criteria | 5 | All covered |
| REQUIREMENTS FILE-01..FILE-05 | 5 | All covered (FILE-01/02/03 → plan 01; FILE-04 → plan 04; FILE-05 → plan 04). Plans 02/03 superseded |
| CONTEXT.md D-01..D-14 | 14 | All covered |
| RESEARCH.md assumptions A1–A7 | 7 | A-COV-1..6 mapped; A6/A7 covered by threat model |
| Open questions OQ-1..OQ-4 | 4 | OQ-1/OQ-2 closed by architecture change (no Workspace tenant → MinIO); OQ-3 → 46-04 Task 6 live proof; OQ-4 → 46-04 Task 2 |
| Unplanned | 0 | — |
