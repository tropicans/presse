---
phase: 48
slug: storage-abstraction-postgres-bytea-spool-layer
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-11-16
---

# Phase 48 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 (already configured in `devDependencies`) |
| **Config file** | `vitest.config.ts` (node env, `include: ['src/**/*.test.{ts,tsx}']`, alias `@ → ./src`, stub `DATABASE_URL`) |
| **Quick run command** | `npx vitest run src/lib/file-storage.test.ts src/lib/file-jobs.test.ts` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~1 second quick, ~10 seconds full |
| **Lint & Typecheck command** | `npm run lint && npx tsc --noEmit --pretty false` |
| **Live DB command** | `$env:LIVE_DB="1"; $env:LIVE_DATABASE_URL="postgresql://jott_user:jott_secret_2026@127.0.0.1:5443/jott_attendance?schema=public"; npx vitest run src/lib/file-storage.test.ts` |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/file-storage.test.ts`
- **After every plan wave:** Run `npm test && npm run lint && npx tsc --noEmit --pretty false`
- **Before phase completion:** Full test suite green + `npm run build` green + live DB test green
- **Max feedback latency:** ~2 seconds (unit tests with mocked Prisma)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 48-01-01 | 01 | 1 | FILE-02, FILE-03 | T-48-01, T-48-03 | Payload nullability migration, recordFileUpload persists metadata and bytea spool atomically via parameterized SQL, getFileForServing returns normalized Buffer | tracer (unit) | `npx vitest run src/lib/file-storage.test.ts && npx tsc --noEmit --pretty false` | ❌ (Wave 0 creates) | ⬜ pending |
| 48-01-02 | 01 | 1 | FILE-02, FILE-03 | T-48-02 | State machine enforces valid transitions (PENDING_UPLOAD → QUEUED), rejects illegal rewinds/resurrection, links files to submissions, preserves file-jobs compatibility | unit | `npx vitest run src/lib/file-storage.test.ts src/lib/file-jobs.test.ts && npm run lint` | ✅ | ⬜ pending |
| 48-02-01 | 02 | 2 | FILE-02, FILE-03 | T-48-01, T-48-03 | claimUploadJobs uses FOR UPDATE SKIP LOCKED and caps batch size; markFileJobSynced nulls payload; markFileJobFailed applies retry backoff or terminal FAILED | unit | `npx vitest run src/lib/file-storage.test.ts` | ✅ | ⬜ pending |
| 48-02-02 | 02 | 2 | FILE-02, FILE-03 | T-48-03, T-48-04 | cleanupOrphanedFiles compares UTC timestamps to purge expired unlinked files; live-DB test validates full lifecycle against PostgreSQL | unit + integration | `npm test && npm run lint && npx tsc --noEmit --pretty false` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⛔ superseded*

---

## Wave 0 Requirements

- [x] Existing test harness `vitest` ready in `vitest.config.ts`
- [x] `src/lib/file-jobs.test.ts` exists and passes (mocked + live DB pattern established)
- [ ] `src/lib/file-storage.test.ts` will be created in Plan 48-01 Task 1 (tracer slice)

---

## Manual-Only Verifications

Phase 48 is pure backend domain logic and raw-SQL storage abstraction with zero UI components. All persistence behaviors, state machine transitions, concurrent lock queries, and spool byte lifecycles are 100% verified via automated Vitest suites and live-DB PostgreSQL integration tests.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter
