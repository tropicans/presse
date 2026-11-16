---
phase: 46-foundation-schema-field-plumbing-drive-client-credentials
plan: 02
subsystem: infra
tags: [google-drive, service-account, oauth2, server-only, instrumentation, healthcheck, docker, standalone]

requires:
  - phase: 46-foundation-schema-field-plumbing-drive-client-credentials
    plan: 01
    provides: "FormFile/SubmissionFile migration + raw form-builder storage tables"

provides:
  - "src/lib/env.ts getDriveConfig + DriveConfig (validated, single-unescape)"
  - "src/lib/drive.ts server-only Drive client, Shared-Drive probe, classifier, describeSafe, re-probe timer, getDriveState/getDriveClient"
  - "src/lib/health.ts HealthResult degraded union + bare {\"status\":\"ok\"} healthy contract"
  - "src/instrumentation.ts register() bootstrap that probes Drive at boot"
  - "@googleapis/drive, google-auth-library, file-type, server-only installed"
  - "Drive env documented in .env.example; Dockerfile build-time placeholders; compose ${VAR:?} required-substitution"
  - "Verified: standalone boot fires instrumentation, no serverExternalPackages entry needed (OQ-4 NO)"

affects:
  - 46-03 (drive smoke test needs the env names + boot probe)
  - phase 49 (file-type magic-byte validation)
  - phase 50 (any Drive file ops reuse getDriveClient)

tech-stack:
  added:
    - "@googleapis/drive@27.1.0"
    - "google-auth-library@11.3.4"
    - "file-type@22.3.0 (installed, unused this phase — A7)"
    - "server-only@0.0.1"
  patterns:
    - "globalThis-pinned singleton slot (client/state/timer) for HMR safety"
    - "Pure classifier + safe-string describer, unit-tested without network"
    - "Fail-fast PermanentDriveError vs degraded transient with 60s unref'd re-probe"
    - "Byte-exact healthy health body preserved; degraded is HTTP 200"

key-files:
  created:
    - "src/lib/drive.ts"
    - "src/lib/drive-probe.test.ts"
    - "src/lib/health.test.ts"
    - "src/instrumentation.ts"
  modified:
    - "package.json"
    - "package-lock.json"
    - "src/lib/env.ts"
    - "src/lib/env.test.ts"
    - "src/lib/health.ts"
    - ".env.example"
    - "Dockerfile"
    - "docker-compose.yml"

key-decisions:
  - "OQ-4 = NO: @googleapis/drive + google-auth-library need no serverExternalPackages entry; standalone build + boot succeeded without it"
  - "A3 = PROVEN: instrumentation register() fired under output:standalone ('[instrumentation] drive probe started' seen in stdout)"
  - "A1 = PROVEN: standalone .next/standalone/server.js booted with fake-but-shaped Drive creds, no MODULE_NOT_FOUND"
  - "Docker compose boot deferred to 46-03 because .env.production lacks the three real Drive vars; local standalone boot proved the build path + D-04/D-05"
  - "file-type installed but unused this phase, per A7 — keeps the pin alongside the others"

patterns-established:
  - "getDriveConfig: readRequiredEnv reuse, single .replace(/\\n/g,'\\n'), PEM header check, folder-id regex"
  - "describeSafe strips err.config/err.request/err.response.data — leak-canary test enforced"
  - "startDriveProbe throws permanent, returns degraded transient, scheduleReprobe guarded by g.__driveTimer + unref"

requirements-completed: [FILE-04, FILE-05]

coverage:
  - id: D1
    description: "Drive env vars documented in .env.example, placeholders in Dockerfile, compose ${VAR:?} required-substitution for all three"
    requirement: FILE-05
    verification:
      - kind: unit
        ref: "src/lib/env.test.ts#getDriveConfig"
        status: pass
      - kind: unit
        ref: "node -e Dockerfile/.env.example/compose placeholder checks"
        status: pass
    human_judgment: false
  - id: D2
    description: "getDriveConfig validates three vars, rejects bad PEM and malformed folder id with Indonesian errors"
    requirement: FILE-05
    verification:
      - kind: unit
        ref: "src/lib/env.test.ts#getDriveConfig (8 cases)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Drive client uses drive.file scope only, Shared-Drive probe refuses no-driveId and no-canAddChildren, classifier splits permanent vs transient"
    requirement: FILE-04
    verification:
      - kind: unit
        ref: "src/lib/drive-probe.test.ts#classifyError + #probe + #static guards (15 cases)"
        status: pass
    human_judgment: false
  - id: D4
    description: "/api/health returns byte-exact {\"status\":\"ok\"} on healthy and HTTP 200 degraded shape otherwise (never 503 for Drive)"
    requirement: FILE-04
    verification:
      - kind: unit
        ref: "src/lib/health.test.ts (4 cases, exact-string assertion)"
        status: pass
      - kind: manual_procedural
        ref: "standalone boot + Invoke-WebRequest /api/health -> 200 {status:degraded,drive:{state:degraded,reason:timeout}}"
        status: pass
    human_judgment: false
  - id: D5
    description: "Standalone build boots, instrumentation fires, no MODULE_NOT_FOUND (OQ-4 NO), image source has no real PEM"
    requirement: FILE-04
    verification:
      - kind: manual_procedural
        ref: "npm run build exit 0 + node .next/standalone/server.js stdout shows [instrumentation] drive probe started"
        status: pass
    human_judgment: false

duration: 65min
completed: 2026-11-16
status: complete
---

# Phase 46 Plan 02: Drive client credentials + degraded-health plumbing Summary

**Service-account Drive client with Shared-Drive-only startup probe, permanent-vs-transient classifier, 60s unref'd re-probe timer, and degraded /api/health branch — all behind a `drive.file` scope, a server-only import, and a byte-exact healthy body**

## Performance

- **Duration:** ~65 min
- **Completed:** 2026-11-16
- **Tasks:** 6/6 (Task 1 was the package-legitimacy gate, approved by operator)
- **Files modified:** 13 (4 created, 9 modified)

## Accomplishments
- Installed `@googleapis/drive@27.1.0`, `google-auth-library@11.3.4`, `file-type@22.3.0`, `server-only@0.0.1` after operator legitimacy approval.
- `getDriveConfig` validates the three Drive env vars with Indonesian errors, unescapes `\n` exactly once, rejects a non-PEM key and a malformed folder id (SSRF guard).
- `src/lib/drive.ts`: server-only Drive client on the `drive.file` scope, `files.get` probe asserting `driveId` (Shared Drive) and `capabilities.canAddChildren` (write), pure `classifyError`/`describeSafe`, globalThis-pinned state+client+timer, 60s unref'd re-probe.
- `/api/health` reports Drive state; the healthy body stays the byte-exact `{"status":"ok"}`, degraded is HTTP 200 with the documented shape, and only a DB throw is 503.
- Standalone build + boot proven: A1 (no `MODULE_NOT_FOUND`, OQ-4 = NO), A3 (instrumentation `drive probe started` fired), D-04/D-05 (degraded boot returned HTTP 200).

## Task Commits

Each task was committed atomically:

1. **Task 1: Package legitimacy gate** — checkpoint only, no commit (operator APPROVED all four)
2. **Task 2: Install packages + getDriveConfig + tests** — `c751c86` (feat)
3. **Task 3: Drive client + probe + classifier + timer** — `64a2307` (feat)
4. **Task 4: /api/health degraded branch + exact-string test** — `0c478e5` (feat)
5. **Task 5: instrumentation + env doc + Docker placeholders + compose** — `a3b1243` (feat)
6. **Task 6: standalone build + boot smoke (console.debug downgrade)** — `68c1ee2` (chore)

**Plan metadata:** _final commit below_ (docs: complete 46-02 plan)

_Note: `file-type@22.3.0` is ESM-only and installed-but-unused this phase (A7)._

## Files Created/Modified
- `src/lib/env.ts` — added `DriveConfig` + `getDriveConfig` (appended after `readRequiredEnvList`).
- `src/lib/env.test.ts` — added `describe('getDriveConfig')` with 8 cases (missing/blank/hostile/bad-PEM/single-unescape/no-double-unescape/valid).
- `src/lib/drive.ts` — new: server-only client, probe, classifier, describeSafe, timer, getDriveState/getDriveClient/getDriveClient, `__test__` helpers.
- `src/lib/drive-probe.test.ts` — new: classifier matrix, describeSafe leak-canary, probe Shared-Drive markers, static guards (15 cases).
- `src/lib/health.ts` — `HealthResult` union + degraded branch.
- `src/lib/health.test.ts` — new: 4 cases incl. byte-exact `{"status":"ok"}`.
- `src/instrumentation.ts` — new: `register()` guard + dynamic import + `startDriveProbe()`, `console.debug` boot line.
- `.env.example` — three Drive vars documented (Shared Drive only).
- `Dockerfile` — three build-time placeholder ENV lines before `npm run build`.
- `docker-compose.yml` — three `${VAR:?…}` entries on the shared app env anchor.
- `package.json` / `package-lock.json` — four packages pinned by npm.

## Decisions Made
- **OQ-4 = NO** — no `serverExternalPackages` entry needed; standalone build + boot passed without touching `next.config.ts`.
- **A3 = PROVEN** — the instrumentation hook fires under `output: "standalone"`; no lazy-probe fallback needed.
- **A1 = PROVEN** — standalone server booted with fake-but-shaped Drive creds, no `MODULE_NOT_FOUND`.
- **Docker boot deferred to 46-03** — `.env.production` lacks the three real Drive vars, so the compose `${VAR:?}` substitution would fail loudly by design (correct). The local `node .next/standalone/server.js` boot proved the build path, D-04, and D-05.
- **`file-type` installed but unused** — deliberate (A7); the pin is recorded now with the rest of the stack.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] `getDriveClient` first draft used a `(g.drivePaused as ...)` hack**
- **Found during:** Task 3 (drive.ts authoring, before commit)
- **Issue:** Initial `getDriveClient` tried to read a `client` field off `g.drivePaused` instead of a dedicated `__drive` slot — would have rebuilt the client per call and violated the singleton contract.
- **Fix:** Added `__drive?: drive_v3.Drive` to the global slot and made `getDriveClient` return `(g.__drive ??= buildClient())`; `startDriveProbe` now uses `getDriveClient()` so the singleton is shared.
- **Files modified:** `src/lib/drive.ts`
- **Verification:** `npx tsc --noEmit` green; drive-probe tests green; static guard confirms `globalThis` singleton present.
- **Committed in:** `64a2307` (Task 3 commit)

**2. [Rule 1 - Bug] Env idempotency test compared against the un-trimmed PEM**
- **Found during:** Task 2 (`env.test.ts` run)
- **Issue:** `readRequiredEnv` trims surrounding whitespace, so the trailing `\n` in the real-newline PEM was stripped before the unescape step — my assertion compared against the un-trimmed string and saw one fewer `\n`.
- **Fix:** Compare against `validPemReal.trim()`; assert the unescape step neither adds nor removes newlines.
- **Files modified:** `src/lib/env.test.ts`
- **Verification:** 18/18 env tests green.
- **Committed in:** `c751c86` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 bugs, both caught by the task's own verification before commit)
**Impact on plan:** Both were correctness bugs in freshly written executor code, not scope changes. No plan intent altered.

## Issues Encountered
- First boot smoke used stale DB creds (`isian_*`); the live container uses `jott_user` / `jott_attendance`. Retried with the correct `DATABASE_URL` and the boot produced a healthy degraded health response. No code change — operator-side credential correction.
- google-auth-library logs a deprecation notice for the `credentials` option ("use the `auth` object constructor instead"). Non-fatal for this plan; the `credentials: { client_email, private_key }` shape matches the plan and RESEARCH. Left as-is (scope-bounded); worth revisiting when the library drops the option.

## User Setup Required

External services require manual configuration (carried from plan frontmatter `user_setup`). Plan 03 fills real values and runs the upload proof. For 46-03 the operator must supply:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` — Google Cloud Console → IAM & Admin → Service Accounts → SA email.
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — SA JSON key `private_key` value verbatim (one line with `\n` escapes).
- `GOOGLE_DRIVE_FOLDER_ID` — Drive Shared Drive → folder → URL segment after `/folders/`.
- Add the SA to the Shared Drive as a member with role `writer` (`fileOrganizer` only if phase 50 needs delete-any-file). Service accounts cannot be owners.
- Verify egress from the app container to `oauth2.googleapis.com` and `www.googleapis.com`.

## Next Phase Readiness
- 46-03 can rely on: env names exactly `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID`; compose `${VAR:?<name> wajib diisi}` fails loudly on a missing var; `getDriveState()` shape `{state:'ok'|'degraded', driveId?|reason?}`; `getDriveClient()` singleton.
- 46-03 still owns: `scripts/ci-drive-smoke.mjs`, populating `.env.production`, the real Shared Drive upload proof, and the docker-boot gate that was deferred here.
- A5 (files.get driveId + canAddChildren is sufficient) remains the only unproven assumption — it needs a real Drive, so it stays a 46-03 human-verify checkpoint.

---
*Phase: 46-foundation-schema-field-plumbing-drive-client-credentials*
*Completed: 2026-11-16*

## Self-Check: PASSED

- All created files exist: drive.ts, drive-probe.test.ts, health.test.ts, instrumentation.ts
- All task commits exist: c751c86, 64a2307, 0c478e5, a3b1243, 68c1ee2

