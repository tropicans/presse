---
phase: 46-foundation-schema-field-plumbing-drive-client-credentials
plan: 03
subsystem: infra
tags: [google-drive, shared-drive, service-account, smoke-test, blocked]

requires:
  - phase: 46-foundation-schema-field-plumbing-drive-client-credentials
    plan: 01
  - phase: 46-foundation-schema-field-plumbing-drive-client-credentials
    plan: 02

provides: []

affects:
  - 46-03 (incomplete — blocker must be resolved by operator, then re-run)

tech-stack:
  added: []
  patterns:
    - "Evidence-first probe: token → tokeninfo → about → files.get at both drive and drive.file scopes"

key-files:
  created: []
  modified: []

key-decisions:
  - "STOPPED at Task 1 verification: the configured folder is NOT in a Shared Drive (files.get returns no driveId at any scope), so W1 cannot be proven"
  - "Did NOT write scripts/ci-drive-smoke.mjs — the plan's own Task 1 gate says 'do not let the executor proceed to Task 2 on a partial pass'"

requirements-completed: []

duration: 25min
completed: 2026-11-16
status: blocked
---

# Phase 46 Plan 03: Real Shared Drive proof — BLOCKED at Task 1

**Blocked: the folder ID in `.env.production` resolves to a My Drive folder owned by `kelehhadari@gmail.com`, not a Shared Drive. The SA has `writer` on it, but `files.get` returns no `driveId`, and under the production `drive.file` scope it returns 404. W1 (Shared Drive non-negotiable) cannot be satisfied, so Phase 46 cannot be proven complete.**

## What happened

Task 1 is a `checkpoint:human-verify` gate. The operator reported all seven prerequisites satisfied. The executor still ran the verification programmatically, as instructed. Two of the seven do not hold.

### Verified true

| Check | Result |
|---|---|
| `.env.production` exists | yes (2799 bytes) |
| `.env.production` git-ignored | yes — `git check-ignore -v` → `.gitignore:34:.env*` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` present | yes — `<sa>@form-514904.iam.gserviceaccount.com` |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` present + shaped | yes — 1704 chars, PEM header/footer intact, literal `\n` escapes (unescapes to 28 real newlines) |
| `GOOGLE_DRIVE_FOLDER_ID` present + regex-valid | yes — 33 chars, `^[A-Za-z0-9_-]{10,}$` passes |
| OAuth2 token exchange | yes — `getAccessToken()` succeeded, 1024-char token |
| Granted scope | yes — `tokeninfo` → `https://www.googleapis.com/auth/drive.file` (exactly the production scope) |
| SA identity | yes — `about.get` → `form-upload@form-514904.iam.gserviceaccount.com`, `permissionId 04855010963479557742` |
| SA has no My Drive quota (W1) | confirmed — `storageQuota.limit: "0"` |
| SA is `writer` on the folder | yes — `permissions.list` → SA `role: writer` (OQ-2 answerable: Editor/`writer` grants the ACL entry) |

### Verified false — the blockers

**Blocker 1: the folder is not in a Shared Drive.**

`files.get(folderId, fields: 'id,name,mimeType,driveId,...')` at broad `drive` scope:

```
status=200 body={"id":"1JFVg1xu4jfFj3ZnOJgP3ShFFiT8dc6r0","name":"submissions","mimeType":"application/vnd.google-apps.folder","capabilities":{"canAddChildren":true}}
```

No `driveId` field in the response. Drive only populates `driveId` for items that live in a Shared Drive. Absent = My Drive.

`drives.list` (broad scope) returns zero drives the SA can see:

```
status=200 body={"drives":[],"kind":"drive#driveList"}
```

`about.get` → `canCreateDrives: false`.

Folder ownership:

```
{"id":"1JFVg1xu4jfFj3ZnOJgP3ShFFiT8dc6r0","name":"submissions","owners":[{"emailAddress":"kelehhadari@gmail.com"}]}
```

A Shared Drive item is owned by the Shared Drive, never by a personal address. This folder is owned by a Gmail account = My Drive.

**Blocker 2: even in My Drive, the production scope cannot see it.**

Because the SA never created this folder, `drive.file` (the production scope, deliberately the narrowest) grants no access to it. HTTP 404 at both `supportsAllDrives=true` and `false`:

```
status=404 body={"error":{"code":404,"message":"File not found: 1JFVg1xu4jfFj3ZnOJgP3ShFFiT8dc6r0.",...}}
```

`drive.file` only grants access to files the app created or that were explicitly opened with the app (Picker). A folder merely shared to the SA is invisible to that scope. This is not a bug — it is the scope working as designed.

Even if the folder were reachable, the SA has `storageQuota.limit: "0"`, so any `files.create` without a Shared Drive parent would fail `403 storageQuotaExceeded`. That is exactly the W1 failure mode RESEARCH.md called out.

## Why the executor stopped here

The plan's own Task 1 gate, verbatim:

> "Anything short of all seven halts the plan — do not let the executor proceed to Task 2 on a partial pass."

And the plan's prohibitions:

> "No My Drive fallback — a folder without driveId aborts the script."

Writing `scripts/ci-drive-smoke.mjs` now would produce a script that fails exit 2 (`folder <id> bukan Shared Drive`) on the first real run. That is a correct script against a broken environment — no value, and it would put a green-looking commit in the history for a gate that never passed. So Task 2 was not started. No code was written, nothing was committed.

## Task-by-task

| Task | Status | Output |
|---|---|---|
| 1 — Prerequisite (Shared Drive + SA writer + `.env.production`) | **FAILED** | 5 of 7 checks pass; folder is My Drive, so 2 of 7 fail |
| 2 — Write `scripts/ci-drive-smoke.mjs` | **NOT STARTED** | Plan gates Task 2 behind Task 1 |
| 3 — Real Shared Drive proof | **NOT STARTED** | Depends on Task 2 |

**Commits:** none. Working tree unchanged (`git status --short` shows only the pre-existing untracked `.planning/milestones/v2.2-research/`).

## A5 verdict

**Cannot be evaluated.** A5 ("`files.get` with `driveId` + `canAddChildren` is sufficient to prove Shared Drive write access") requires a real Shared Drive folder. There is no Shared Drive folder in the environment — `drives.list` returns empty and the target folder has no `driveId`. The assertion path is untested because its precondition does not exist. Do not read this as a pass.

## OQ-2 verdict

**Editor role is sufficient at the ACL level — yes.** `permissions.list` shows the SA with `role: writer` on the folder, and `capabilities.canAddChildren: true`. Adding the SA as Editor would satisfy `canAddChildren` if the folder were in a Shared Drive. The problem is not the role; it is the folder's location.

## What the operator must do

The environment, not the code, is wrong. Three options, in order of preference:

**Option A (recommended) — create a real Shared Drive, as the plan intended.**

1. Google Drive UI → left sidebar → **Shared drives** → **New** → name it `Form Uploads`.
   - Creating a Shared Drive requires a Google Workspace account. `kelehhadari@gmail.com` is a Gmail account and **cannot** create Shared Drives. This likely explains the current state: the operator tried, could not, and used My Drive instead.
   - If there is no Workspace tenant available, **this milestone's W1 non-negotiable cannot be met as written** and the plan needs a decision, not a workaround.
2. Inside that Shared Drive, create a folder `submissions`.
3. Shared Drive → **Manage members** → add `form-upload@form-514904.iam.gserviceaccount.com` as **Content manager** (or **Editor**).
4. Copy the new folder ID from the URL after `/folders/`.
5. Update `.env.production`: `GOOGLE_DRIVE_FOLDER_ID=<new id>`.
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` are already correct — leave them.
6. Re-run 46-03.

**Option B — verify the setup with a fresh probe before touching anything.**

Save this as `probe-folder.mjs` in the repo root (needs repo `node_modules`), then:
`node --env-file=.env.production probe-folder.mjs`

```js
import { GoogleAuth } from 'google-auth-library'
const auth = new GoogleAuth({
  credentials: {
    client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: (process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  scopes: ['https://www.googleapis.com/auth/drive'],
})
const tok = await auth.getAccessToken()
const r = await fetch(
  `https://www.googleapis.com/drive/v3/files/${process.env.GOOGLE_DRIVE_FOLDER_ID}` +
    '?fields=id,name,driveId,owners(emailAddress),capabilities(canAddChildren)&supportsAllDrives=true',
  { headers: { Authorization: 'Bearer ' + tok } },
)
console.log(r.status, JSON.stringify(await r.json()))
```

Pass condition: response contains a non-empty `driveId`. Anything else means the folder is still My Drive — do not re-run 46-03, the same exit 2 will occur.

**Option C — change the approach.** If no Workspace tenant exists, the `drive.file`-only design in 46-02 cannot work against My Drive (quota `0`), and the milestone needs a scope or storage-backend decision. That is a Rule 4 architectural change — escalate, do not patch.

## Deviations

**1. [Rule 4 - Architectural] Did not write the smoke script.**

- **Found during:** Task 1 verification.
- **Issue:** Task 1 is a blocking human-verify gate; the environment fails it. The plan explicitly forbids proceeding.
- **Action:** Halted and reported. No code written. Escalating because the only remedies (create a Shared Drive, or widen the scope / change storage backend) are operator actions or architectural decisions, not auto-fixable bugs.
- **Impact:** Phase 46 remains unproven. FILE-04's real-world proof is still outstanding.

**2. [Verification] Used the broad `drive` scope for diagnosis only.**

- **Why:** the production `drive.file` scope returns 404 for a folder it never created, which is indistinguishable from "folder does not exist". The broad scope was needed to distinguish "wrong location" from "wrong permissions".
- **Note:** no production code changed. `src/lib/drive.ts` still uses `drive.file` only. The diagnostic script was deleted; nothing was committed.

## Verification results

No source files were touched, so the full gate was not re-run (it was green at the end of 46-02). The checks that were run:

| Command | Result |
|---|---|
| `git check-ignore -v .env.production` | exit 0 — `.gitignore:34:.env*` |
| `node --env-file=.env.production -e "<env presence>"` | 3/3 vars present, key shape valid |
| `getAccessToken()` + `tokeninfo` | token OK, scope = `drive.file` |
| `about.get` | SA identity OK, `storageQuota.limit: "0"` |
| `files.get` folder @ `drive.file` | **404** |
| `files.get` folder @ `drive` | **200, no `driveId`** |
| `drives.list` @ `drive` | **200, `[]`** |
| `permissions.list` folder | SA `writer` |

Docker boot gate: **not attempted.** It would start a container whose instrumentation `startDriveProbe()` throws `PermanentDriveError` ("Folder … bukan Shared Drive (tidak ada driveId)") at boot — by design (D-01 fail-fast). Booting it now only reproduces Blocker 1 in a slower way.

## Security notes

- The private key was never printed. Evidence lines show only length (1704), header presence, and newline counts.
- `.env.production` was never `cat`-ed. Individual values were read via targeted `node --env-file` probes that emit booleans/lengths.
- No credential appears in this summary, in any command output above, or in git.
- The diagnostic script used a token in memory only and was deleted; it was never committed and never echoed the token.

## Self-Check

- `scripts/ci-drive-smoke.mjs` — NOT created (deliberate, see Deviation 1)
- Working tree clean apart from pre-existing untracked planning dir — PASSED
- No commits made — PASSED
