---
phase: 46-foundation-schema-field-plumbing-drive-client-credentials
plan: 04
subsystem: storage + config + health + containers
tags: [minio, s3, object-storage, migration, docker-compose, health, probe, smoke-test]
dependency_graph:
  requires:
    - 46-01 (file tables, bytea spool, Prisma client)
  provides:
    - src/lib/storage.ts (S3 client, put/get/delete/head, buildObjectKey)
    - src/lib/storage-probe.ts (probeStorage, startStorageProbe, getStorageState, describeStorageError)
    - getStorageConfig + StorageConfig (MINIO_* contract)
    - storage degraded branch in /api/health
    - submission_files.object_key/bucket + file_upload_jobs.object_key
    - minio compose service + minio_data volume
    - scripts/ci-storage-smoke.mjs (live round-trip + privacy proof)
  affects:
    - 46-02 (superseded — Drive client removed)
    - 46-03 (superseded — Drive smoke/provisioning abandoned)
    - Phase 47 (upload UI consumes the same storage layer)
    - Phase 48/49 (spool + upload path degrade instead of failing)
    - Phase 50 (worker pushes object_key to the bucket)
    - Phase 51 (serving route reads getObjectBytes)
    - Phase 53 (scoped MinIO policy user hardening)
tech_stack:
  added:
    - "@aws-sdk/client-s3@3.1169.0"
    - "@aws-sdk/s3-request-presigner@3.1169.0"
    - "minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e"
  removed:
    - "@googleapis/drive"
    - "google-auth-library"
  patterns:
    - globalThis-singleton client cache (mirrors src/lib/prisma.ts)
    - idempotent-by-key PUT with deterministic object keys
    - degrade-never-crash boot probe with 60 s self-healing re-probe
    - digest-pinned container image with no host port mapping
    - plain-Node ESM smoke script with contractual exit codes
key_files:
  created:
    - src/lib/storage.ts
    - src/lib/storage-probe.ts
    - src/lib/storage-probe.test.ts
    - prisma/migrations/20261116120000_swap_drive_columns_for_object_storage/migration.sql
    - scripts/ci-storage-smoke.mjs
  modified:
    - src/lib/env.ts
    - src/lib/env.test.ts
    - src/lib/health.ts
    - src/lib/health.test.ts
    - src/instrumentation.ts
    - prisma/schema.prisma
    - .env.example
    - Dockerfile
    - docker-compose.yml
    - package.json
    - package-lock.json
  deleted:
    - src/lib/drive.ts
    - src/lib/drive-probe.test.ts
decisions:
  - MinIO replaces Google Drive — no Workspace tenant, SA quota 0, canCreateDrives false (46-03 proof)
  - D-01 revised — storage never fail-fasts; missing bucket or bad credentials boot into degraded mode
  - D-13 — buildObjectKey(fileId) = files/<fileId>, deterministic, retries overwrite, no reconciliation
  - D-14 — object identity is the (bucket, object_key) pair, enforced by a partial unique index
  - Columns renamed in place (RENAME COLUMN) so existing rows keep identity
  - MinIO image pinned by digest because the registry denies anonymous manifest inspection of version tags
  - MinIO has no host port mapping — console never public; smoke runs inside the compose network
  - Root MinIO credentials reused as app credentials for single-tenant deploy; scoped policy user deferred to phase 53
metrics:
  duration: ~2h 30m
  completed: 2026-11-16
status: complete
---

# Phase 46 Plan 04: MinIO Object Storage Replacement Summary

One-line: Google Drive is gone — replaced end to end by a digest-pinned MinIO service, an S3 client with deterministic object keys, a boot probe that degrades instead of crashing, a storage-aware `/api/health`, an in-place column swap, and a live round-trip proof that the bucket stores bytes byte-identically while refusing anonymous reads.

## Why this plan exists

Plan 46-03 closed as **blocked**. A live API probe proved Google Drive cannot serve this milestone:

| Probe result | Value |
|---|---|
| `canCreateDrives` | `false` |
| `drives.list` | `[]` |
| folder `1JFVg1xu4jfFj3ZnOJgP3ShFFiT8dc6r0` `driveId` | absent — it is a My Drive folder owned by `kelehhadari@gmail.com` |
| `storageQuota.limit` | `"0"` |
| `files.get` @ `drive.file` scope | `404` |

The operator has **no Google Workspace tenant**, so a Shared Drive cannot be provisioned at all. Architecture revised to a self-hosted S3-compatible store in the same compose stack. Plan 46-04 is the replacement.

## What was built

### Task 1 — `src/lib/storage.ts`
- `import 'server-only'` at the top so the module can never enter a client bundle.
- `buildStorageClient(config)` — `region: 'us-east-1'`, `endpoint: \`${useSSL ? 'https' : 'http'}://${endpoint}:${port}\``, **`forcePathStyle: true`** (MinIO serves buckets as path segments and has no wildcard DNS for virtual-host addressing), credentials from `accessKey`/`secretKey`.
- `getStorageClient()` — cached on `globalThis.__s3`, config memoized on `globalThis.__s3Config` so `getBucket()` does not re-parse env.
- `putObject(key, body, contentType)` — sets `ContentType` and `ContentLength` explicitly so MinIO does not chunk-encode.
- `getObjectBytes(key)` — throws `object kosong: <key>` when the body is absent rather than returning an empty buffer.
- `deleteObject(key)`, `headBucket()`.
- `buildObjectKey(fileId)` → `files/<fileId>`. Deterministic by design (D-13): a retried push overwrites the same object, so no duplicate reconciliation exists.
- Only the four command classes actually used are imported from `@aws-sdk/client-s3`, plus `S3Client`.

### Task 2 — env contract, probe, health, instrumentation
- `src/lib/env.ts`: `STORAGE_BUCKET_PATTERN = /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/`, `StorageConfig`, `getStorageConfig()`. Requires `MINIO_ENDPOINT`, integer `MINIO_PORT` in 1..65535, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, and a bucket name that cannot be path-like (`../etc` rejected — the value is used to build URLs). `MINIO_USE_SSL` optional, truthy only for `'true'`/`'1'`.
- `DriveConfig`, `getDriveConfig`, `DRIVE_FOLDER_ID_PATTERN` and the Drive describe-block removed from `src/lib/env.ts` and `src/lib/env.test.ts`.
- `src/lib/storage-probe.ts`: `StorageProbeResult` union, `describeStorageError` (fixed vocabulary — `timeout`, `kredensial invalid`, `bucket tidak ditemukan`, `HTTP <n>`; never interpolates bodies, headers, or credential fields), `probeStorage()` (never throws), `startStorageProbe()` (warns once, then a 60 s re-probe that only runs while degraded, timer `.unref()`'d), `getStorageState()` (returns `{state:'degraded', reason:'belum di-probe'}` before the first probe). State and timer pinned to `globalThis` so repeated instrumentation boots do not stack timers.
- `src/lib/health.ts`: `HealthResult` became `{status:'ok'} | {status:'degraded'; storage:{state:'degraded'; reason:string}}`; `prisma.$queryRaw\`SELECT 1\`` still runs first so a real DB outage still rejects (503). Healthy body stays byte-exact `{"status":"ok"}`.
- `src/instrumentation.ts` imports `startStorageProbe` from `./lib/storage-probe` inside the `NEXT_RUNTIME !== 'nodejs'` guard.
- Tests: `src/lib/storage-probe.test.ts` (classifier matrix, nested-`secretAccessKey` leak assertion, `buildObjectKey` determinism) and `src/lib/health.test.ts` (byte-exact healthy body, degraded branch, DB-failure rethrow). Both start with `vi.mock('server-only', () => ({}))`.

### Task 3 — schema column swap
`prisma/migrations/20261116120000_swap_drive_columns_for_object_storage/migration.sql` uses **in-place renames** so existing rows keep identity:

1. `submission_files.drive_file_id` → `object_key`
2. `submission_files.drive_id` → `bucket`
3. drop the legacy `submission_files_drive_file_id_key` index
4. `ADD COLUMN IF NOT EXISTS` safety net for both columns
5. `CREATE UNIQUE INDEX IF NOT EXISTS "submission_files_bucket_object_key_key" ON (bucket, object_key) WHERE object_key IS NOT NULL` — identity is the pair (D-14)
6. `file_upload_jobs.drive_file_id` → `object_key` plus the same safety net

Zero `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE`. `prisma/schema.prisma`: `SubmissionFile.objectKey`/`bucket`, `FileUploadJob.objectKey`, no `drive` reference left. `npx prisma generate` run.

### Task 4 — container wiring
- `docker-compose.yml`: new `minio` service, `image: minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e` (digest-pinned — the registry denies anonymous manifest inspection of version tags), `command: ["server","/data","--address",":9000","--console-address",":9001"]`, root user/password from the two required vars, `minio_data:/data`, healthcheck `["CMD","mc","ready","local"]`, and **no `ports:` key**.
- `MINIO_ENDPOINT`/`PORT`/`USE_SSL`/`ACCESS_KEY`/`SECRET_KEY`/`BUCKET` replace the three Drive vars in the `&app-env` anchor; the `x-worker` anchor inherits them.
- `app` and `worker` both gained `minio: condition: service_healthy`.
- `minio_data` declared in the top-level `volumes:` block next to `pgdata`.
- `Dockerfile`: six `MINIO_*` build-time placeholders replace the Drive placeholders.
- `.env.example`: six `MINIO_*` vars with a comment stating the bucket stays private and the endpoint is the compose service name inside Docker.
- `package.json`: `@googleapis/drive` and `google-auth-library` uninstalled; `@aws-sdk/client-s3@3.1169.0` and `@aws-sdk/s3-request-presigner@3.1169.0` installed after a legitimacy gate (maintainers `amzn-oss` / `aws-sdk-bot`, Apache-2.0, exact versions pinned).

### Task 5 — `scripts/ci-storage-smoke.mjs`
Plain ESM importing `@aws-sdk/client-s3` directly (never `src/lib/**`, which is Next-resolved). Steps: read config → `HeadBucket` (404 → `CreateBucket`, keeps the run idempotent on a fresh volume) → `PutObject` a uniquely named `smoke/ci-<ts>-<uuid>.txt` → `GetObject` and compare length then every byte → unauthenticated `fetch` of the object URL which must not return 200 → delete the object. Exit codes: `0` pass, `1` missing/invalid env, `2` storage unreachable, `3` credentials rejected, `4` bucket missing and uncreatable, `5` bytes differ, `6` anonymous GET returned 200. Never prints the secret. `node --check` exit 0.

### Task 6 — operator live proof

All five steps executed against the real stack. **Captured output verbatim:**

**1. `docker compose --env-file .env.production up -d`**
```
 Container isian-minio Running
 Container isian-postgres Recreate
 Container isian-postgres Recreated
 Container isian-app Recreate
 Container isian-app Recreated
 Container isian-worker Recreate
 Container isian-worker Recreated
 Container isian-postgres Starting
 Container isian-minio Waiting
 Container isian-minio Healthy
 Container isian-postgres Started
 Container isian-postgres Waiting
 Container isian-postgres Healthy
 Container isian-app Starting
 Container isian-app Started
 Container isian-app Waiting
 Container isian-app Healthy
 Container isian-worker Starting
 Container isian-worker Started
UP_EXIT=0
```
Migration applied by `start.sh` on that boot:
```
12 migrations found in prisma/migrations
Applying migration `20261116120000_swap_drive_columns_for_object_storage`
The following migration(s) have been applied:
migrations/
    └─ migration.sql
All migrations have been successfully applied.
```

**2. `Invoke-RestMethod http://127.0.0.1:3456/api/health`**
```
{"status":"ok"}
```

**3. Column swap on the live database**
```
    table_name    | column_name
------------------+-------------
 file_upload_jobs | object_key
 submission_files | bucket
 submission_files | object_key
(3 rows)
```
Zero Drive columns. Drive-column count query returns `0`.

**4. Live round-trip inside the compose network** (`isian-minio` has no host port — another MinIO already owns host 9000, and a host-local probe to `127.0.0.1:9000` answers 403 from the wrong server):
```
step 4/4 anonymous ditolak HTTP 403
PASS
SMOKE_EXIT=0
```
Bucket `form-uploads` was auto-created on that run.

**5. `LIVE_DB=1 npx vitest run src/lib/file-jobs.test.ts`**
```
 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  1.30s
EXIT=0
```

## Verification

| Command | Exit |
|---|---|
| `npm test` | 0 (19 files, 165 passed, 1 skipped live test) |
| `npm run lint` | 0 (1 pre-existing `.trunk/configs/svgo.config.mjs` warning only) |
| `npx tsc --noEmit --pretty false` | 0 |
| `npm run build` | 0 |
| `docker compose --env-file .env.production build app worker` | 0 |
| `docker compose --env-file .env.production config --services` | 0 → `minio, postgres, app, worker` |
| `node --check scripts/ci-storage-smoke.mjs` | 0 |
| `LIVE_DB=1 npx vitest run src/lib/file-jobs.test.ts` | 0 (6/6) |
| Live smoke in compose network | 0 (`PASS`) |
| `Invoke-RestMethod /api/health` | `{"status":"ok"}` |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] MinIO image version tag could not be inspected**
- **Found during:** Task 4
- **Issue:** the registry denies anonymous manifest inspection for version tags, so a tag-pinned image could not be verified as what it claims to be.
- **Fix:** pinned by manifest digest instead: `minio/minio@sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e`. Immutable and verifiable; the tag is irrelevant once the digest is fixed.
- **Files:** `docker-compose.yml`

**2. [Rule 3 - Blocking] Host port 9000 already taken by another MinIO instance (`titan-minio`)**
- **Found during:** Task 4/6
- **Issue:** mapping MinIO to host 9000/9001 would either fail to bind or silently point local tooling at the wrong server — and a host-local smoke run against `127.0.0.1:9000` returned 403 from that other instance.
- **Fix:** no host port mapping at all. This satisfies the prohibition ("no host port mapping for `minio`") and the security goal (console not public) at the same time; the smoke script runs inside the compose network instead.
- **Files:** `docker-compose.yml`, Task 6 verification command

**3. [Rule 3 - Blocking] `server-only` throws under vitest**
- **Found during:** Task 2
- **Issue:** importing `@/lib/storage-probe` (or `@/lib/storage`) in a test aborted with `This module cannot be imported from a Client Component module`.
- **Fix:** both new test files begin with `vi.mock('server-only', () => ({}))`, the established pattern in this repo.
- **Files:** `src/lib/storage-probe.test.ts`, `src/lib/health.test.ts`

**4. [Rule 1 - Bug] Plan's inline `node -e` guards were unreliable under PowerShell quoting**
- **Found during:** Task 3/4
- **Issue:** the plan's `node -e "require('fs').readFileSync(...)"` guards mis-quote nested double quotes in pwsh.
- **Fix:** ran the equivalent checks as temporary `.mjs` files (`fs.readFileSync`), then deleted them. Same assertions, same result.
- **Files:** none retained

**5. [Rule 2 - Missing] Health check had to keep the DB failure path rejecting**
- **Found during:** Task 2
- **Issue:** a naïve rewrite of `health.ts` around the storage branch would have swallowed `prisma.$queryRaw` failures into the degraded payload, turning a real DB outage into HTTP 200.
- **Fix:** the DB query still runs first and is still allowed to reject; only `getStorageState()` feeds the degraded branch. Pinned by an explicit test.
- **Files:** `src/lib/health.ts`, `src/lib/health.test.ts`

### Plan-spec adaptations
- The plan assumed a Drive-era distinction between fatal and transient storage errors. D-01 was revised: with MinIO in the same compose stack there is no boot-time condition worth crashing for, so the probe is degraded-only. Fatal classification was removed rather than ported.
- The plan listed `@aws-sdk/s3-request-presigner` as a dependency; it is installed and pinned but not yet imported — phase 51 decides whether presigning is ever used, and FILE-19 currently forbids handing presigned URLs to browsers.

## Authentication gates
One operator gate (Task 6 checkpoint), satisfied: real `MINIO_*` values written to the git-ignored `.env.production`, stack brought up, all five proofs captured above.

## Known Stubs
- `@aws-sdk/s3-request-presigner` installed but unused. Intentional — the decision of how files are served belongs to phase 51.
- No `listObjects` helper. Deliberately absent: with deterministic keys there is nothing to reconcile, so listing would invite the duplicate-check logic D-13 exists to avoid.
- MinIO root credentials are the app credentials. Single-tenant accepted risk, tracked in threat register T-46-04-05 and deferred to phase 53 as a scoped policy user.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| threat_flag: new_external_service | `docker-compose.yml` (`minio`) | New network-reachable service holding all user-submitted file bytes. Mitigated: no host port, private bucket, digest-pinned image, healthcheck-gated startup. |
| threat_flag: credential_surface | `.env.production` (operator, not committed) | Six new secrets. `MINIO_SECRET_KEY` is a 40-char random value; never logged, never interpolated by `describeStorageError` (pinned by a leak test). |
| threat_flag: plaintext_at_rest | `minio_data` volume | Object bytes are stored unencrypted on the host volume, same posture as the `pgdata` bytea spool. Operator must include `minio_data` in the host backup routine. |

All three are expected consequences of the plan's stated scope. The security audit should confirm the phase-53 scoped-policy-user follow-up and the bucket-privacy assertion still hold after later phases touch the storage layer.

## Handoff notes

**For Phase 47 (upload UI + builder config):**
- Storage is ready: `putObject` / `getObjectBytes` / `deleteObject` / `buildObjectKey` from `src/lib/storage.ts`. Everything is `server-only`.
- `file-type@22.3.0` is ESM-only — `import` only, never `require`.
- The `FILE` field type is plumbed through `forms.ts` but **not** offered in the admin picker (`fieldTypeOptions`); phase 47 adds it along with size/type limits.

**For Phase 48/49 (spool + upload route):**
- Storage outages are already degraded, not fatal. Write to `file_upload_jobs` unconditionally; the worker is the only path that talks to MinIO.
- Cap `payloadSize` in the route — `src/lib/file-jobs.ts` has no size ceiling of its own.
- Rate limiting is per-process in-memory only; do not treat it as multi-instance protection.

**For Phase 50 (sync worker) / 51 (serving):**
- `file_upload_jobs.object_key` and `submission_files.object_key`/`bucket` are the coordinates. `buildObjectKey(fileId)` is the only correct key derivation — do not invent another.
- Retries are safe: PUT overwrites by key.

**For Phase 53 (hardening):**
- Replace the root MinIO credentials with a scoped policy user (`s3:GetObject`/`s3:PutObject`/`s3:DeleteObject` on `arn:aws:s3:::form-uploads/*` only).
- Decide the retention TTL for both `file_upload_jobs.payload` and bucket objects.

**Operational:**
- Local smoke must run inside the network — host `127.0.0.1:9000` belongs to a different MinIO instance:
  ```
  docker run --rm --network jott_default -v "${PWD}:/app" -w /app --env-file .env.production --entrypoint node node:22-alpine scripts/ci-storage-smoke.mjs
  ```
- `.env.production.bak` still contains the now-dead Google private key. Safe to delete; it grants nothing today, but it should not linger.

## Self-Check: PASSED

- `src/lib/storage.ts` — FOUND
- `src/lib/storage-probe.ts` — FOUND
- `src/lib/storage-probe.test.ts` — FOUND
- `prisma/migrations/20261116120000_swap_drive_columns_for_object_storage/migration.sql` — FOUND
- `scripts/ci-storage-smoke.mjs` — FOUND
- `src/lib/drive.ts` — ABSENT (deleted, as required)
- `src/lib/drive-probe.test.ts` — ABSENT (deleted, as required)
