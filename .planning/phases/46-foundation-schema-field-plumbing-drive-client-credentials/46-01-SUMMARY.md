---
phase: 46-foundation-schema-field-plumbing-drive-client-credentials
plan: 01
subsystem: data + forms
tags: [migration, prisma, field-type, bytea, file-upload, schema]
dependency_graph:
  requires: []
  provides:
    - FieldType.FILE (Postgres enum + TS union)
    - FormFieldType 'file' (domain union)
    - submission_files table
    - file_upload_jobs table (bytea payload spool)
    - src/lib/file-jobs.ts bytea primitives
  affects:
    - 46-02 (env/drive/health consume the same generated Prisma client)
    - 46-03 (ci-drive-smoke uses the same DB)
    - Phase 47 (file field config UI)
    - Phase 49 (submission write + file validation)
    - Phase 50 (worker state machine over file_upload_jobs)
tech_stack:
  added: []
  patterns:
    - Prisma migration with combined ALTER TYPE + CREATE TABLE in one folder
    - Raw-SQL tagged-template access to migration-managed tables (forms.ts precedent)
    - BYTEA write as raw Buffer; read normalised from Uint8Array to Buffer
key_files:
  created:
    - prisma/migrations/20261116000000_add_file_upload_tables/migration.sql
    - src/lib/file-jobs.ts
    - src/lib/file-jobs.test.ts
  modified:
    - prisma/schema.prisma
    - src/lib/forms.ts
    - src/lib/forms.test.ts
    - src/lib/admin-form-preview.ts
    - src/components/AdminFormEditor.tsx
decisions:
  - Single-folder migration (no split contingency) — deploy accepted ALTER TYPE + CREATE TABLE together
  - AdminFormEditor gains only fieldTypeLabels.file, not fieldTypeOptions (picker UI stays phase-47)
  - readFileUploadPayload normalises pg BYTEA Uint8Array to Buffer at the helper boundary
metrics:
  duration: 1h 10m
  completed: 2026-11-16
status: complete
---

# Phase 46 Plan 01: Foundation — schema + FILE field plumbing + Drive client credentials (W1 slice) Summary

One-line: Postgres gains `FieldType.FILE` plus `submission_files`/`file_upload_jobs` bytea tables, `FILE` is plumbed through all seven `forms.ts` mapping sites with round-trip tests, and `src/lib/file-jobs.ts` proves bytea writes/reads preserve bytes on a live database.

## What was built

### Task 1 — migration + Prisma parity (commit `32d54e2`)
- `prisma/migrations/20261116000000_add_file_upload_tables/migration.sql`
  - `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE'` as the first statement (Postgres forbids using the new label in the same statement batch, so it precedes the DDL).
  - `submission_files` — 16 columns including `drive_id`, PK `submission_files_pkey`, 3 indexes, and a **partial unique** index `submission_files_drive_file_id_key ... WHERE "drive_file_id" IS NOT NULL` so Drive-less rows do not collide.
  - `file_upload_jobs` — 14 columns including `"payload" BYTEA NOT NULL`, `payload_size`, `processed_at`, PK `file_upload_jobs_pkey`, 2 indexes.
  - Zero destructive DDL, everything `IF NOT EXISTS`-guarded.
- `prisma/schema.prisma` — `FILE` on `enum FieldType`; `model SubmissionFile` and `model FileUploadJob` added after `SubmissionJob` with `@@map`/`@@index(map:)` names matching the SQL.
- `npx prisma validate` and `npx prisma generate` exit 0.

### Task 2 — FILE through every forms.ts site (commit `d5802e5`)
All seven sites, verified by `git diff -U0` showing exactly 7 hunks (`+23 -4`):
1. `type FieldType` + `'FILE'`
2. `export type FormFieldType` + `'file'`
3. `export interface FileField extends BaseField { type: 'file' }` + added to the `FormField` union
4. `mapFieldType`: `case 'FILE': return 'file'` (previously a silent drop)
5. `mapPublicFormRowsToDefinition`: explicit `mappedType === 'file'` branch before the text-shaped default, so no `maxLength`/`placeholder` leak
6. `mapFormFieldTypeToDb`: `case 'file': return 'FILE'`
7. `allowedTypes` Set gains `'file'` (removes the runtime 400 on admin save)

Plus the two parity edits required by the widened union:
- `src/lib/admin-form-preview.ts` — `AdminPreviewField['type']` + `'file'`
- `src/components/AdminFormEditor.tsx` — `fieldTypeLabels.file = 'Berkas'` **only**; `fieldTypeOptions` deliberately unchanged so FILE is not offered in the admin picker until phase 47.

`validateFormSubmission` and all raw-SQL insert paths (`${dbType}::"FieldType"`) untouched.

Tests: new `describe('FILE field type', ...)` block in `src/lib/forms.test.ts` — 5 cases (type mapping, no `maxLength`, no `placeholder`, admin save resolves, vocabulary-size invariant).

### Task 3 — bytea spool helper + live migration proof (commit `6f45b91`)
- `src/lib/file-jobs.ts`
  - `insertFileUploadJob({ id, fileId, payload: Buffer, payloadMime, payloadSize })` — single `$executeRaw` tagged template into `"file_upload_jobs"`, payload interpolated **as a raw Buffer** (never base64), literals `'PENDING'`, `0`, `CURRENT_TIMESTAMP`.
  - `readFileUploadPayload(jobId)` — one `$queryRaw`, returns `{ payload, mime, size } | null`, normalising pg-types' BYTEA `Uint8Array` to a `Buffer` via `Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)` (no copy of semantics, no re-encode).
  - No payload logging. File-top comment records the phase-46 / phase-50 responsibility split.
- `src/lib/file-jobs.test.ts` — 4 mocked cases ($executeRaw called once with a Buffer, `Buffer.compare === 0`, SQL literal assertions, Uint8Array→Buffer normalisation, null row) plus a `describe.skipIf(!process.env.LIVE_DB)` live case that inserts `Buffer.from([1,2,3])` and asserts the stored hex is exact.

**[BLOCKING] live-DB proof — executed, not skipped:**
- `npx prisma migrate deploy` → exit 0, "No pending migrations to apply" (already applied earlier in this session).
- `information_schema.tables` → `file_upload_jobs`, `submission_files` present.
- `pg_enum`/`pg_type` for `FieldType` → 8 labels, `FILE` last.
- `_prisma_migrations` → `20261116000000_add_file_upload_tables|2026-11-16 03:50:52.142728+00` (non-null `finished_at`).
- `LIVE_DB=1` vitest run → 6/6 passed; verified `010203` round-trips byte-exact; `file_upload_jobs` count back to 0 afterwards (no residue).

## Verification

| Command | Exit |
|---|---|
| `npm run lint` | 0 |
| `npx tsc --noEmit --pretty false` | 0 |
| `npm test` | 0 (17 files, 145 passed, 1 skipped live test) |
| `npm run build` | 0 |
| `npx prisma migrate deploy` | 0 |
| `LIVE_DB=1 npx vitest run src/lib/file-jobs.test.ts` | 0 (6/6) |
| 7-site static node guard | `all 7 sites present` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Widened union broke two TS consumers**
- **Found during:** Task 2
- **Issue:** adding `'file'` to `FormFieldType` made `AdminPreviewField['type']` and the `Record<EditableField['type'], string>` label map in `AdminFormEditor.tsx` non-exhaustive → TS2741.
- **Fix:** added `'file'` to `AdminPreviewField['type']` and `file: 'Berkas'` to `fieldTypeLabels`. Deliberately did **not** add `'file'` to `fieldTypeOptions` — the admin picker must not offer FILE until phase 47.
- **Files:** `src/lib/admin-form-preview.ts`, `src/components/AdminFormEditor.tsx`
- **Commit:** `d5802e5`

**2. [Rule 1 - Bug] BYTEA reads come back as `Uint8Array`, not `Buffer`**
- **Found during:** Task 3 live proof
- **Issue:** the declared return `payload: Buffer` was wrong — `@prisma/adapter-pg` + `pg-types` decode OID 17 to `Uint8Array`. Callers typing it as `Buffer` would hit `instanceof Buffer === false` and lose `.write`/`.toString('hex')` behaviour.
- **Fix:** `readFileUploadPayload` now casts the SQL row to `{ payload: Uint8Array | null }` and returns `Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)`. Bytes unchanged; a dedicated test pins the normalisation.
- **Files:** `src/lib/file-jobs.ts`, `src/lib/file-jobs.test.ts`
- **Commit:** `6f45b91`

**3. [Rule 3 - Blocking] `vitest.config.ts` pins a stub `DATABASE_URL`, so `LIVE_DB` used the wrong credentials**
- **Found during:** Task 3 live proof
- **Issue:** first live attempt failed `28P01 password authentication failed for user "postgres"` because `vitest.config.ts` hardcodes `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/form`, and the module-level `vi.mock('@/lib/prisma')` also intercepts the file-jobs import graph — so `vi.importActual` still came back mocked and the insert never landed.
- **Fix:** the live block builds its own `PrismaClient` + `PrismaPg` from `LIVE_DATABASE_URL` and throws if it is unset. `vitest.config.ts` was **not** modified (out of scope).
- **Files:** `src/lib/file-jobs.test.ts`
- **Commit:** `6f45b91`

**4. [Rule 3 - Blocking] Test SQL-token assertions assumed quoted column names**
- **Found during:** Task 3
- **Issue:** assertions expected `"payload"`/`"payload_mime"` but the INSERT column list uses unquoted identifiers (only the table name is quoted).
- **Fix:** assertions target the unquoted identifiers plus `CURRENT_TIMESTAMP`, `'PENDING'`, `next_attempt_at`.
- **Files:** `src/lib/file-jobs.test.ts`
- **Commit:** `6f45b91`

### Plan-spec adaptations
- The plan's `<automated>` guards use `node -e "require('fs')..."`. Under PowerShell that quoting is unreliable, so the equivalent guards were run as a temporary `.mjs` file (`fs.readFileSync`), then deleted. Same checks, same result.
- Plan said `readFileUploadPayload` returns `Buffer` directly from the query; the actual adapter behaviour forced the explicit normalisation in deviation 2. API shape (`{ payload, mime, size } | null`) preserved.

None of the deviations touched files owned by 46-02 or 46-03.

## Authentication gates
None.

## Known Stubs
None. `FileField` is intentionally minimal (no `maxSize`/`allowedMime`/`maxFileCount`) — FILE-06 config lands in phase 47, as scoped.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new_data_store | `prisma/migrations/20261116000000_add_file_upload_tables/migration.sql` | New bytea-bearing tables (`file_upload_jobs.payload`) — a new at-rest storage surface for user-submitted bytes. No encryption at rest beyond Postgres defaults; retention/pruning is a phase-50 concern. |
| threat_flag: new_db_write_path | `src/lib/file-jobs.ts` | New raw-SQL write path taking an arbitrary `Buffer`. Values are bound via tagged-template parameters (no string interpolation), but the module has no size ceiling — callers must cap `payloadSize` in phase 49. |

Both are expected consequences of the plan's stated scope; recorded so the security audit can confirm mitigations land in phases 49/50.

## Handoff notes

**For 46-02 (env / drive / health / instrumentation):**
- Migration folder name is `20261116000000_add_file_upload_tables` — **single folder, no split contingency was needed**. Deploy accepts `ALTER TYPE` + `CREATE TABLE` in one file.
- The generated Prisma client now has `Bytes` mapping on `FileUploadJob.payload`. `npm run build` passed under `output: "standalone"` without touching `serverExternalPackages`; the existing `@prisma/client`, `@prisma/adapter-pg`, `pg` entries were sufficient.
- `FieldType` in Postgres now has 8 labels; anything that enumerates it (e.g. a health check asserting schema shape) should expect `FILE`.
- `src/lib/prisma.ts` is untouched — no need to reconcile exports.

**For 46-03 (production env / ci-drive-smoke):**
- Live DB used for the W1 proof: `postgresql://jott_user:jott_secret_2026@127.0.0.1:5443/jott_attendance?schema=public` (host 5443 → container `isian-postgres` 5432).
- `file_upload_jobs` is empty after the proof run — safe to reuse the same DB for the smoke test.
- `vitest.config.ts` hardcodes a stub `DATABASE_URL`; any future live-DB test must read a separate env var (pattern: `LIVE_DB=1` + `LIVE_DATABASE_URL`) rather than relying on `DATABASE_URL`.

## Self-Check: PASSED

- `prisma/migrations/20261116000000_add_file_upload_tables/migration.sql` — FOUND
- `src/lib/file-jobs.ts` — FOUND
- `src/lib/file-jobs.test.ts` — FOUND
- commit `32d54e2` — FOUND
- commit `d5802e5` — FOUND
- commit `6f45b91` — FOUND
