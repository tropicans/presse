---
phase: 46
slug: foundation-schema-field-plumbing-drive-client-credentials
# status lifecycle: draft (seeded by plan-phase) → validated (set by validate-phase §6)
# audit-milestone §5.5 distinguishes NOT-VALIDATED (draft) from PARTIAL (validated + nyquist_compliant: false) (#2117)
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-11-16
---

# Phase 46 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 (already in `devDependencies`) |
| **Config file** | `vitest.config.ts` (node env, `include: ['src/**/*.test.{ts,tsx}']`, alias `@ → ./src`, stub `DATABASE_URL`) |
| **Quick run command** | `npx vitest run src/lib/env.test.ts src/lib/forms.test.ts` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~15 seconds quick, ~60 seconds full |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/env.test.ts src/lib/forms.test.ts`
- **After every plan wave:** Run `npm test && npm run lint && npx tsc --noEmit --pretty false`
- **Before `/gsd-verify-work`:** Full suite green + `npm run build` green + real Drive smoke test executed and output recorded
- **Max feedback latency:** 20 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 46-01-01 | 01 | 1 | FILE-01 | — | `FILE` enum value accepted without breaking legacy values | unit | `npx vitest run src/lib/forms.test.ts -t 'FILE'` | ❌ W0 | ⬜ pending |
| 46-01-02 | 01 | 1 | FILE-02 | — | Migration guarded with `IF NOT EXISTS`; no destructive DDL | integration (manual/live DB) | `docker compose run --rm app ./node_modules/.bin/prisma migrate deploy` | ❌ W0 | ⬜ pending |
| 46-01-03 | 01 | 1 | FILE-03 | — | `bytea` round-trip preserves bytes exactly | unit (mocked prisma) | `npx vitest run src/lib/file-jobs.test.ts` | ❌ W0 | ⬜ pending |
| 46-02-01 | 02 | 2 | FILE-05 | T-46-01 | Private key never logged; PEM header enforced; `\n` unescaped once | unit | `npx vitest run src/lib/env.test.ts -t 'Drive'` | ❌ W0 | ⬜ pending |
| 46-02-02 | 02 | 2 | FILE-04 | T-46-02 | Permanent errors fail-fast, transient errors degrade — no silent spool | unit | `npx vitest run src/lib/drive-probe.test.ts` | ❌ W0 | ⬜ pending |
| 46-02-03 | 02 | 2 | D-05 | T-46-03 | Health body stays exactly `{"status":"ok"}` when healthy | unit | `npx vitest run src/lib/health.test.ts` | ❌ W0 | ⬜ pending |
| 46-03-01 | 03 | 3 | FILE-04 | T-46-04 | Real file lands in Shared Drive (not mocked) | manual `checkpoint:human-verify` | `node scripts/ci-drive-smoke.mjs` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/lib/env.test.ts` — extend with Drive config cases (FILE-05)
- [ ] `src/lib/forms.test.ts` — extend with `FILE` round-trip cases (FILE-01)
- [ ] `src/lib/drive-probe.test.ts` — new — permanent vs transient classifier matrix (FILE-04)
- [ ] `src/lib/health.test.ts` — new — exact-string health contract (D-05)
- [ ] `src/lib/file-jobs.test.ts` — new — `bytea` shape assertion against mocked `$executeRaw`/`$queryRaw` (FILE-03)
- [ ] `scripts/ci-drive-smoke.mjs` — new — real Drive smoke test, opt-in via env (FILE-04 real proof + W1)
- [ ] No framework install needed (vitest 4.1.5 present)
- [ ] Import-smoke assertion for `file-type` ESM resolution if imported this phase

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| File actually appears in the configured Shared Drive folder | FILE-04 (W1 proof) | Requires live Google Workspace Shared Drive + service-account membership; cannot be mocked without defeating the purpose | Set `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`; run `node scripts/ci-drive-smoke.mjs`; open the Shared Drive in Drive UI and confirm the uploaded test file exists with expected name and size |
| Migration applies cleanly on an existing database | FILE-02 | `prisma migrate deploy` needs a live PostgreSQL; no DB harness in repo | Run `prisma migrate deploy` against a copy of the dev DB; confirm `submission_files`, `file_upload_jobs` exist and `FieldType` contains `FILE` |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
