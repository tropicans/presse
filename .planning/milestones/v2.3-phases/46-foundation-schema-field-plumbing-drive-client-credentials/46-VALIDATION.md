---
phase: 46
slug: foundation-schema-field-plumbing-drive-client-credentials
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-11-16
revised: 2026-11-16
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Revision 2026-11-16:** Google Drive backend proved infeasible (see `46-03-SUMMARY.md`). Plans `46-02` and `46-03` are superseded; their rows are struck through below and replaced by `46-04-*` rows covering the MinIO implementation.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 (already in `devDependencies`) |
| **Config file** | `vitest.config.ts` (node env, `include: ['src/**/*.test.{ts,tsx}']`, alias `@ → ./src`, stub `DATABASE_URL`) |
| **Quick run command** | `npx vitest run src/lib/env.test.ts src/lib/forms.test.ts src/lib/storage-probe.test.ts src/lib/health.test.ts` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~15 seconds quick, ~60 seconds full |
| **Live-storage harness** | `scripts/ci-storage-smoke.mjs`, run inside the compose network — no mocks |
| **Live-DB harness** | `LIVE_DB=1` + `LIVE_DATABASE_URL` gates `src/lib/file-jobs.test.ts` against real PostgreSQL |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/env.test.ts src/lib/forms.test.ts src/lib/storage-probe.test.ts src/lib/health.test.ts`
- **After every plan wave:** Run `npm test && npm run lint && npx tsc --noEmit --pretty false`
- **Before `/gsd-verify-work`:** Full suite green + `npm run build` green + `scripts/ci-storage-smoke.mjs` executed against real MinIO with `PASS`/exit 0 recorded
- **Max feedback latency:** 20 seconds (unit), ~2 minutes (live storage)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 46-01-01 | 01 | 1 | FILE-01 | — | `FILE` enum value accepted without breaking legacy values | unit | `npx vitest run src/lib/forms.test.ts -t 'FILE'` | ✅ | ✅ green |
| 46-01-02 | 01 | 1 | FILE-02 | — | Migration guarded with `IF NOT EXISTS`; no destructive DDL | integration (live DB) | `docker compose run --rm app ./node_modules/.bin/prisma migrate deploy` | ✅ | ✅ green |
| 46-01-03 | 01 | 1 | FILE-03 | — | `bytea` round-trip preserves bytes exactly | unit + live DB | `npx vitest run src/lib/file-jobs.test.ts` | ✅ | ✅ green |
| ~~46-02-01~~ | ~~02~~ | ~~2~~ | ~~FILE-05~~ | — | Superseded — Drive PEM loader removed | — | — | — | ⛔ superseded |
| ~~46-02-02~~ | ~~02~~ | ~~2~~ | ~~FILE-04~~ | — | Superseded — Drive probe removed | — | — | — | ⛔ superseded |
| ~~46-02-03~~ | ~~02~~ | ~~2~~ | ~~FILE-04~~ | — | Superseded — Drive client removed | — | — | — | ⛔ superseded |
| 46-04-01 | 04 | 2 | FILE-04 | T-46-04-04 | `buildObjectKey` deterministic; client is path-style, region `us-east-1`; retry overwrites, never duplicates | unit (structural) | `npx vitest run src/lib/storage-probe.test.ts` | ✅ | ✅ green |
| 46-04-02 | 04 | 2 | FILE-05 | T-46-04-01 | Env contract validated: required non-empty, port integer 1..65535, bucket matches S3 naming | unit | `npx vitest run src/lib/env.test.ts -t 'getStorageConfig'` | ✅ | ✅ green |
| 46-04-03 | 04 | 2 | FILE-05 | T-46-04-01 | `describeStorageError` returns fixed vocabulary; secret never interpolated | unit | `npx vitest run src/lib/storage-probe.test.ts -t 'describeStorageError'` | ✅ | ✅ green |
| 46-04-04 | 04 | 2 | D-05 | T-46-04-03 | Healthy body exactly `{"status":"ok"}`; degraded answers HTTP 200 with `storage` object | unit | `npx vitest run src/lib/health.test.ts` | ✅ | ✅ green |
| 46-04-05 | 04 | 2 | FILE-05 | T-46-04-01 | Boot probe never throws, never exits; 60 s re-probe; Node-runtime guard | source assertion | `src/instrumentation.ts` contains `NEXT_RUNTIME !== 'nodejs'`; `src/lib/storage-probe.ts` exports `startStorageProbe` | ✅ | ✅ green |
| 46-04-06 | 04 | 2 | FILE-02 | T-46-04-04 | Column rename in place; `(bucket, object_key)` unique; no destructive DDL | static + live DB | migration guard `node -e ...` + `docker exec isian-postgres psql ... information_schema` | ✅ | ✅ green |
| 46-04-07 | 04 | 2 | FILE-04 | T-46-04-02 | `minio` service present, no host port, `minio_data` volume, health-gated deps | static + compose | `docker compose --env-file .env.production config --services` → `minio, postgres, app, worker` | ✅ | ✅ green |
| 46-04-08 | 04 | 2 | FILE-04 | T-46-04-02 | Smoke script contract: exit codes 0-6, no credential printed | static | `node --check scripts/ci-storage-smoke.mjs` | ✅ | ✅ green |
| 46-04-09 | 04 | 2 | FILE-04 (W1) | T-46-04-02 | Real bytes round-trip through real MinIO; anonymous GET refused | live (compose network) | `docker run --rm --network jott_default ... scripts/ci-storage-smoke.mjs` exit 0 | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⛔ superseded*

---

## Wave 0 Requirements

- [x] `src/lib/env.test.ts` — `getStorageConfig` cases incl. path-like bucket rejection (FILE-05)
- [x] `src/lib/forms.test.ts` — `FILE` round-trip cases (FILE-01)
- [x] `src/lib/storage-probe.test.ts` — new — error-classifier matrix + secret-leak assertion + `buildObjectKey` determinism (FILE-04, FILE-05)
- [x] `src/lib/health.test.ts` — new — exact-string health contract, degraded branch, DB-failure rethrow (D-05)
- [x] `src/lib/file-jobs.test.ts` — new — `bytea` shape against mocked `$queryRaw`/`$executeRaw`, plus live-DB gate (FILE-03)
- [x] `scripts/ci-storage-smoke.mjs` — new — live round-trip + anonymous-access refusal, exit codes 0-6 (FILE-04 real proof + W1 analogue)
- [x] `docker-compose.yml` — `minio` service, `minio_data` volume, storage env in the app/worker anchor
- [x] No framework install needed (vitest 4.1.5 present)
- [x] Import-smoke assertion for `file-type` ESM resolution if imported this phase

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Object bytes actually round-trip through the configured MinIO bucket byte-identically | FILE-04 (W1 analogue) | Requires a live MinIO reachable only on the compose network; a mock would defeat the purpose | Set `MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`; run `docker run --rm --network jott_default -v "${PWD}:/app" -w /app --env-file .env.production --entrypoint node node:22-alpine scripts/ci-storage-smoke.mjs`; expect `step 4/4 anonymous ditolak HTTP 403`, `PASS`, exit 0 |
| Bucket refuses anonymous access | FILE-04 / FILE-19 | Same reason — privacy of a live bucket cannot be asserted from a mock | Same run; a 200 on the unauthenticated GET makes the script exit 6. Optionally confirm via `docker exec isian-minio mc ls` that no public policy is set |
| Migration applies cleanly on an existing database | FILE-02 | `prisma migrate deploy` needs live PostgreSQL; no DB harness in repo apart from the `LIVE_DB` gate | Run `prisma migrate deploy` against the dev DB; confirm `submission_files.object_key`, `submission_files.bucket`, `file_upload_jobs.object_key` and zero Drive columns |
| Storage outage degrades without crashing the app | FILE-04 / D-02 | Only observable with a real unreachable endpoint | Stop `isian-minio`, restart `isian-app`, confirm the process stays up and `/api/health` answers HTTP 200 with `{"status":"degraded","storage":{...}}`; restore MinIO and confirm recovery within 60 s |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** verified 2026-11-16 — four gates green (`npm test` 165 passed, `npm run lint`, `npx tsc --noEmit`, `npm run build`), live MinIO smoke exit 0, live-DB `file-jobs` 6/6, `/api/health` = `{"status":"ok"}`
