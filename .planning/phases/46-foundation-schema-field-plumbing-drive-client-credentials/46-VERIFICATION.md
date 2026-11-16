---
phase: 46-foundation-schema-field-plumbing-drive-client-credentials
verified: 2026-11-16T13:06:00Z
status: passed
score: 5/5 must-haves verified
covered_files:
  - .env.example
  - .planning/phases/46-foundation-schema-field-plumbing-drive-client-credentials/46-01-PLAN.md
  - .planning/phases/46-foundation-schema-field-plumbing-drive-client-credentials/46-01-SUMMARY.md
  - .planning/phases/46-foundation-schema-field-plumbing-drive-client-credentials/46-02-PLAN.md
  - .planning/phases/46-foundation-schema-field-plumbing-drive-client-credentials/46-02-SUMMARY.md
  - .planning/phases/46-foundation-schema-field-plumbing-drive-client-credentials/46-03-PLAN.md
  - .planning/phases/46-foundation-schema-field-plumbing-drive-client-credentials/46-03-SUMMARY.md
  - .planning/phases/46-foundation-schema-field-plumbing-drive-client-credentials/46-04-PLAN.md
  - .planning/phases/46-foundation-schema-field-plumbing-drive-client-credentials/46-04-SUMMARY.md
  - Dockerfile
  - docker-compose.yml
  - prisma/migrations/20261116000000_add_file_upload_tables/migration.sql
  - prisma/migrations/20261116120000_swap_drive_columns_for_object_storage/migration.sql
  - prisma/schema.prisma
  - scripts/ci-storage-smoke.mjs
  - src/instrumentation.ts
  - src/lib/env.test.ts
  - src/lib/env.ts
  - src/lib/file-jobs.test.ts
  - src/lib/file-jobs.ts
  - src/lib/forms.test.ts
  - src/lib/forms.ts
  - src/lib/health.test.ts
  - src/lib/health.ts
  - src/lib/storage-probe.test.ts
  - src/lib/storage-probe.ts
  - src/lib/storage.ts
covered_digest: "v4:sha256:7ec1b150fbd7df0887a5e96d2cc9544f971d471c3d529262a0969dd80c7e0b84"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 46: Foundation — Schema, Field Plumbing, MinIO Client & Credentials Verification Report

**Phase Goal:** The feature's storage backbone is real and proven: `FILE` field type exists in PostgreSQL and TypeScript, both file tables exist via migration, and an S3-compatible client demonstrably uploads a real file into a private MinIO bucket and reads it back byte-identical.
**Verified:** 2026-11-16T13:06:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth   | Status     | Evidence       |
| --- | ------- | ---------- | -------------- |
| 1   | A migration creates `submission_files` (id, submission_id nullable, field_id nullable, original/sanitized filename, mime, size, checksum, storage status, object_key, bucket, timestamps) and `file_upload_jobs` (`payload bytea`, status PENDING/CLAIMED/DONE/FAILED, attempt counter, next_attempt_at), and `ALTER TYPE "FieldType" ADD VALUE 'FILE'` applies cleanly on an existing database | ✓ VERIFIED | Verified against live PostgreSQL database `isian-postgres`: enum `FieldType` contains `FILE`, tables `submission_files` and `file_upload_jobs` exist with matching columns and indices (including unique partial index `(bucket, object_key)`). |
| 2   | `FILE` is recognized end-to-end in `src/lib/forms.ts` unions, mappers, and the domain form-field model, alongside the Prisma schema parity models | ✓ VERIFIED | `src/lib/forms.ts` implements `FieldType` enum union with `'FILE'`, `FormFieldType` union with `'file'`, `FileField` interface, and `FormField` union. `mapFieldType` and `mapFormFieldTypeToDb` round-trip correctly. Unit tests in `src/lib/forms.test.ts` pass (39 tests). Prisma models `SubmissionFile` and `FileUploadJob` maintain exact parity. |
| 3   | A smoke test uploads a real file through the storage client, reads it back byte-identical, and proves the bucket rejects anonymous access — not merely returns HTTP 200 | ✓ VERIFIED | Executed `scripts/ci-storage-smoke.mjs` inside container network against live MinIO container (`http://minio:9000`). Uploaded test file, read back byte-identical (all 107 bytes matched element-by-element), confirmed anonymous unauthenticated GET receives HTTP 403, cleaned up object, and exited with status 0 (`PASS`). |
| 4   | A connectivity probe runs at boot and reports degraded state (never a silent failure) when MinIO is unreachable, without preventing the app from booting into spool-only mode | ✓ VERIFIED | `src/lib/storage-probe.ts` implements `probeStorage`, `startStorageProbe`, and 60s re-probe. `src/instrumentation.ts` registers probe at boot. `src/lib/health.ts` exposes degraded state with HTTP 200 payload. Live container `/api/health` returned `{"status":"ok"}`. Unit tests in `src/lib/storage-probe.test.ts` and `src/lib/health.test.ts` pass. |
| 5   | New env vars (`MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`) are documented in `.env.example` and validated at boot; the secret key is never reachable from the client bundle or logs | ✓ VERIFIED | All 6 env vars documented in `.env.example`. `src/lib/env.ts` enforces port numbers (1..65535) and S3 bucket regex. `src/lib/storage.ts` and `src/lib/storage-probe.ts` marked `import 'server-only'`. `describeStorageError` sanitizes error details without credentials (verified in `storage-probe.test.ts`). |

**Score:** 5/5 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `prisma/migrations/20261116000000_add_file_upload_tables/migration.sql` | DDL for FILE enum value, `submission_files`, and `file_upload_jobs` with bytea spool | ✓ VERIFIED | Created with IF NOT EXISTS, non-destructive, verified in live DB. |
| `prisma/migrations/20261116120000_swap_drive_columns_for_object_storage/migration.sql` | Column rename to `object_key`/`bucket` and unique partial index | ✓ VERIFIED | In-place column rename, verified in live DB. |
| `prisma/schema.prisma` | Parity models for `SubmissionFile` and `FileUploadJob`, enum `FieldType.FILE` | ✓ VERIFIED | Full column-for-column parity with PostgreSQL schema. |
| `src/lib/forms.ts` | FILE field domain model, mappers, and allowed types | ✓ VERIFIED | `FileField` discriminated union member, `mapFieldType`, `mapFormFieldTypeToDb`, `allowedTypes`. |
| `src/lib/file-jobs.ts` | Raw SQL bytea spool insert and read helpers | ✓ VERIFIED | `insertFileUploadJob` and `readFileUploadPayload` correctly handle Buffer/Uint8Array. |
| `src/lib/storage.ts` | S3 client singleton with path-style addressing and helper operations | ✓ VERIFIED | `buildStorageClient` (`forcePathStyle: true`), `putObject`, `getObjectBytes`, `deleteObject`, `headBucket`, `buildObjectKey`. |
| `src/lib/storage-probe.ts` | Storage connectivity probe, safe error classifier, 60s re-probe timer | ✓ VERIFIED | Never throws, boots into degraded spool-only mode if unreachable, sanitized error strings. |
| `src/lib/env.ts` | Env parsing and validation for MinIO settings | ✓ VERIFIED | `getStorageConfig` validates endpoint, port, SSL, keys, and S3 bucket regex. |
| `src/lib/health.ts` | Degraded storage branch in health check | ✓ VERIFIED | Returns exact `{"status":"ok"}` when healthy; returns degraded payload on storage failure without throwing. |
| `src/instrumentation.ts` | Next.js server instrumentation starting storage probe on Node runtime | ✓ VERIFIED | Calls `startStorageProbe` under `process.env.NEXT_RUNTIME === 'nodejs'`. |
| `scripts/ci-storage-smoke.mjs` | Live S3 round-trip and privacy test script | ✓ VERIFIED | Executed against live MinIO container, verified byte-identical match and HTTP 403 on anonymous GET. |
| `docker-compose.yml` | MinIO service definition, data volume, and app/worker env injection | ✓ VERIFIED | Digest-pinned MinIO container without public host port; internal network access only. |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | --- | --- | ------ | ------- |
| `src/instrumentation.ts` | `src/lib/storage-probe.ts` | dynamic import inside `register()` on Node.js runtime | ✓ WIRED | Probe starts cleanly at server boot. |
| `src/lib/health.ts` | `src/lib/storage-probe.ts` | `getStorageState()` mapped into health payload | ✓ WIRED | Storage state inspected without throwing. |
| `src/lib/storage.ts` | `src/lib/env.ts` | `getStorageConfig()` supplies MinIO parameters | ✓ WIRED | S3 client initialized with valid configuration. |
| `src/lib/forms.ts` | `prisma/migrations/...swap_drive_columns...` | DB enum and columns match TypeScript domain types | ✓ WIRED | Full mapping between SQL rows and form domain model. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| -------- | ------------- | ------ | ------------------ | ------ |
| `src/lib/file-jobs.ts` | `payload` Buffer | `prisma.$executeRaw` / `prisma.$queryRaw` BYTEA | Yes (round-trip byte preservation) | ✓ FLOWING |
| `src/lib/storage.ts` | `body` Uint8Array | MinIO S3 `PutObjectCommand` / `GetObjectCommand` | Yes (verified via live smoke test) | ✓ FLOWING |
| `src/lib/health.ts` | `storage` state | `getStorageState()` in `storage-probe.ts` | Yes (queried live on `/api/health`) | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Live S3 upload, byte-identical readback, and private bucket check | `docker run --rm --network jott_default -v "${PWD}:/app" -w /app --env-file .env.production --entrypoint node node:22-alpine scripts/ci-storage-smoke.mjs` | `PASS round-trip byte-identik, bucket private` (exit 0) | ✓ PASS |
| App health endpoint | `Invoke-RestMethod -Uri http://127.0.0.1:3456/api/health` | `{"status":"ok"}` | ✓ PASS |
| Targeted unit tests | `npx vitest run src/lib/env.test.ts src/lib/forms.test.ts src/lib/storage-probe.test.ts src/lib/health.test.ts` | 4 test files, 66 tests passed | ✓ PASS |
| Spool payload tests | `npx vitest run src/lib/file-jobs.test.ts` | 5 passed, 1 skipped (live DB gated) | ✓ PASS |
| Full test suite | `npm test` | 19 test files, 165 passed | ✓ PASS |
| TypeScript check | `npx tsc --noEmit --pretty false` | Exit 0, 0 errors | ✓ PASS |
| Linter check | `npm run lint` | Exit 0, 0 errors | ✓ PASS |
| Live PostgreSQL schema | `docker exec isian-postgres psql -U jott_user -d jott_attendance -c "\d submission_files"` | Table and unique index verified | ✓ PASS |

### Probe Execution

| Probe | Command | Result | Status |
| ----- | ------- | ------ | ------ |
| `scripts/ci-storage-smoke.mjs` | `docker run --rm --network jott_default -v "${PWD}:/app" -w /app --env-file .env.production --entrypoint node node:22-alpine scripts/ci-storage-smoke.mjs` | Exit code 0, all 4 steps OK | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ---------- | ----------- | ------ | -------- |
| FILE-01 | 46-01 | Tipe field `FILE` tersedia end-to-end pada enum PostgreSQL `FieldType`, union TypeScript di `src/lib/forms.ts`, dan model domain form field | ✓ SATISFIED | Enum `FieldType` in PostgreSQL has `FILE`; `src/lib/forms.ts` implements `FieldType`, `FormFieldType`, `FileField`, and mappers; covered by `forms.test.ts`. |
| FILE-02 | 46-01, 46-04 | Tabel `submission_files` menyimpan metadata file via migrasi SQL | ✓ SATISFIED | Migrations `20261116000000` and `20261116120000` applied to live PostgreSQL; table contains all required columns with partial unique index on `(bucket, object_key)`. |
| FILE-03 | 46-01 | Tabel `file_upload_jobs` menyimpan payload bytes (`bytea`) sebagai spool lokal dengan status antrian | ✓ SATISFIED | Migration creates table with `payload bytea`; `src/lib/file-jobs.ts` implements insert and read helpers; verified in `file-jobs.test.ts` and live DB. |
| FILE-04 | 46-04 | Klien S3-compatible mengunggah dan membaca kembali file dari bucket MinIO private dengan path-style addressing, dan smoke test membuktikan round-trip byte-identik serta penolakan akses anonim | ✓ SATISFIED | `src/lib/storage.ts` implements client with `forcePathStyle: true`; `scripts/ci-storage-smoke.mjs` passes end-to-end against live container with byte-identical check and HTTP 403 on unauthenticated GET. |
| FILE-05 | 46-04 | Konfigurasi env baru terdaftar di `.env.example` dan divalidasi saat boot; secret key tidak pernah masuk client bundle maupun log | ✓ SATISFIED | `.env.example` documents all 6 vars; `src/lib/env.ts` validates types; `storage.ts` is `server-only`; `storage-probe.ts` sanitizes errors without leaking credentials. |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| None | - | - | - | No TODO, FIXME, XXX debt markers or stub implementations found. |

### Human Verification Required

None. All success criteria and requirements for Phase 46 are headless infrastructure, schema, and storage client verification, programmatically verified against running containers and automated test suites.

### Gaps Summary

No gaps identified. All 5 roadmap success criteria and requirements (FILE-01 through FILE-05) are fully satisfied and verified in the codebase and running Docker environment.

---

_Verified: 2026-11-16T13:06:00Z_
_Verifier: the agent (gsd-verifier)_
