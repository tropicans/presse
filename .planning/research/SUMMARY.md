# Project Research Summary

**Project:** isian (Form) — Form Builder & Administration
**Domain:** Public form submission platform; new: anonymous file upload + private object storage
**Milestone:** v2.3 File Upload & Google Drive Storage
**Researched:** 2026-11-16
**Confidence:** MEDIUM-HIGH

## Executive Summary

v2.3 adds a `FILE` field type (image/PDF, ≤10 MB) to an existing Next.js 16 / Prisma / Postgres public-form platform, storing bytes in Google Drive via a service account and serving them back through the app, admin-gated. Experts build this as: browser → app upload endpoint (server-side validation) → object storage, with the submit path never depending on third-party storage availability.

Recommended approach: **deferred upload** — files hit a new `POST /api/public/files/upload` first and return IDs; the existing JSON submit payload then references those IDs. Bytes go to Drive on the fast path; on Drive failure the bytes sit in a **Postgres `bytea` spool** and a dedicated queue/worker syncs them later. Everything is served through one private route `/api/files/[id]`. New deps are three small packages (`@googleapis/drive`, `google-auth-library`, `file-type`) — not the 246 MB `googleapis` monolith.

Top risks, in order: (1) **a service account cannot own files in My Drive — there is no storage quota**; the target must be a **Shared Drive folder** with `supportsAllDrives: true` + `driveId`, or every upload 403s forever; (2) anonymous upload endpoint is a memory/OOM and rate-limit-bypass surface (buffered multipart, per-process limiter, spoofable XFF); (3) a filesystem fallback is neither shared nor durable in this deploy topology — Postgres is the only shared, durable state; (4) file-serving route is an IDOR/path-traversal/XSS surface. All four are pre-solved below as explicit decisions.

## Key Findings

### Recommended Stack

Small, server-only additions. Full detail: `.planning/research/STACK.md`.

- `@googleapis/drive@27.1.0` — Drive v3 client (2.5 MB unpacked vs `googleapis` 246 MB).
- `google-auth-library@11.3.4` — service-account `GoogleAuth`/JWT; node ≥22, matches runtime; transitive but pin explicitly.
- `file-type@22.3.0` — magic-byte MIME sniffing (ESM-only, node ≥22).
- Scope: **`drive.file`** only (least privilege; SA creates/manages only files it made). No domain-wide delegation, no `anyone` permission.
- Upload: multipart for ≤5 MB, resumable for 5–10 MB. Buffer bytes (10 MB fits).
- `sharp` **deferred** (native dep + ~30 MB + libvips-on-alpine churn) unless thumbnails/EXIF re-encode become hard requirements.

### Expected Features

Full detail: `.planning/research/FEATURES.md`.

**Table stakes:** `FILE` field type in builder; config (required, max MB default 10, allowed MIME presets, max file count); server-side magic-sniff + size + count validation; native drag-drop + picker + XHR progress + preview + remove-before-submit; inline error states reusing v1.6 conventions; admin attachment list + gated download; submissions-table filename cell; Excel export with filename + **app URL**; Drive failure must not block submission (queue + retry); submission-delete purges files.

**Differentiators:** graceful Drive-outage degradation with visible per-file status (`Menunggu sinkronisasi` / `Tersinkron`); local-fallback serving the instant a submission lands; client-side pre-validation; admin add-extra-attachment (additive, tagged origin).

**Anti-features (do not build):** public/`anyone` links; storing Drive `webViewLink`; resumable/chunked upload (10 MB cap makes it moot); arbitrary allowlist; virus scanning (v2+); inline PDF/office rendering; post-submit editing; **reusing `submission_jobs` for file sync**; global file browser; fire-and-forget delete.

### Architecture Approach

Full detail: `.planning/research/ARCHITECTURE.md`. Domain module `src/lib/file-storage.ts` with raw SQL mirroring `forms.ts`; `src/lib/google-drive.ts` (server-only, cached client on `globalThis`); thin routes under existing `/api/public|admin|internal` conventions.

**Major components:**
1. `POST /api/public/files/upload` + `POST /api/admin/files/upload` — multipart intake, rate-limit, validate, spool, enqueue.
2. `src/lib/file-storage.ts` + two tables: `submission_files` (lifecycle/`storage_status`) and `file_sync_jobs` (queue) — **separate from `submission_jobs`**.
3. `src/lib/google-drive.ts` — service-account upload/stream/delete.
4. `POST /api/internal/file-sync-jobs/process` — `FOR UPDATE SKIP LOCKED` claim, idempotent Drive push, retry/backoff → `FAILED` at 5 attempts; driven by extended `scripts/submission-worker.mjs`.
5. `GET /api/files/[id]` — single private serving route (Drive stream or spool bytes) behind `getAdminSession()`.

### Critical Pitfalls

Full detail: `.planning/research/PITFALLS.md`.

1. **Service account cannot own My Drive files** → use a **Shared Drive** folder, `supportsAllDrives`/`driveId`, SA as member; prove with a real integration smoke test before UI work.
2. **SA credential leakage** → runtime secret only (base64 env / mounted file); never commit/mount-into-image/log; `server-only` module; sanitize `last_error`.
3. **MIME spoofing** → validate on magic bytes (`file-type`), re-derive content type, allowlist, size from received bytes.
4. **Multipart buffering/OOM + Nginx body limits** → Route Handler (not Server Action; SA default 1 MB), size guard before/while reading, `client_max_body_size` + non-cached upload location.
5. **IDOR / path traversal / inline XSS on `/api/files/[id]`** → ownership check per request, UUID names + fixed root + realpath, forced `attachment` + `octet-stream` + `nosniff`, sanitized filename.

---

## Stack Additions

```bash
npm install @googleapis/drive@^27.1.0 google-auth-library@^11.3.4 file-type@^22.3.0
# optional, only if thumbnails/EXIF re-encode required:
# npm install sharp@^0.35.5
```

New env (add to `.env.example`, `.env.production`, compose `app-env` anchor, Dockerfile build-time placeholders):

```
GOOGLE_SA_CLIENT_EMAIL=...@....iam.gserviceaccount.com
GOOGLE_SA_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_DRIVE_FOLDER_ID=<shared-drive folder id>
GOOGLE_DRIVE_SHARED_DRIVE_ID=<shared drive id>
MAX_UPLOAD_BYTES=10485760
```

Note: `.replace(/\\n/g, '\n')` on `private_key` or auth fails with `PEM routines` error. No changes to `serverExternalPackages` needed (all pure JS) unless `sharp` is added.

**Do NOT add / use:**

| Avoid | Why | Use instead |
|---|---|---|
| `googleapis` full (246 MB) | image/trace/`npm ci` bloat | `@googleapis/drive` |
| `multer`, `busboy` | Express / true-streaming-only middleware | `await request.formData()` (with size guard) |
| Full `drive` scope / domain-wide delegation | over-privileged, admin setup | `drive.file` scope |
| `permissions.create({type:'anyone'})` | public leak, violates privacy req | `/api/files/[id]` auth-gated |
| Trusting `Content-Type`/extension | attacker-controlled | `file-type` sniff |
| Local FS spool / PG `lo_*` | not shared/durable / awkward via Prisma raw | Postgres `bytea` spool (below) |
| External DnD/animation lib | project rule (Zero External DND/Animation Libs) | native `<input type=file>` + drag events |

---

## Table Stakes Features

- `FILE` field type in builder picker + collapsed-card summary (mirror v2.2 `CHECKBOX` enum pattern across `FieldType`/`FormFieldType` + `forms.ts` mapping).
- Per-field config: `required`, `maxSizeMb` (default 10), allowed MIME preset (image/*, `application/pdf`), `maxCount`.
- Server-side magic-sniff + size + count validation (bypassable client checks are not the gate).
- Public upload UX: native drag-drop + picker (keyboard accessible), XHR `upload.onprogress` progress (documented, intentional deviation from `fetch`-only convention), preview (`URL.createObjectURL` + revoke), remove/replace, inline hybrid clear-on-change errors.
- Admin attachment panel: filename/size/date/status badge, download via `/api/files/[id]`, extra add-only attachment tagged origin.
- Submissions table file cell (filename badge, no raw JSON/URLs); Excel export = `[N file] name;name` + **app URL** only.
- Drive-failure non-blocking: spool + queue, submission returns success, worker syncs with capped retry/backoff.
- Submission delete → purge Drive + spool bytes (soft-delete + queued purge on failure).

**Differentiators:** visible per-file sync status; instant local-fallback serving; client pre-validation; admin extras.
**Anti-features:** see list under Expected Features — notably resumable uploads, virus scanning, inline doc rendering, `submission_jobs` reuse.

---

## Architecture Decisions

**AD-1 — Deferred upload, not mega-multipart-submit.** Files hit `POST /api/public/files/upload`, return `{fileId}`; existing JSON submit carries `fieldName → [fileId,...]`. Rationale: existing submit route is `request.json()`; rewriting it to multipart is high-risk; deferred upload gives remove-before-submit and keeps submit independent of storage. Orphans only from abandoned *uploads* (TTL sweep), not abandoned submits.

**AD-2 — Postgres `bytea` spool is the authoritative local fallback. [CONFLICT RESOLVED — STACK wins on evidence]**
ARCHITECTURE.md proposed a named Docker volume `filespool` on `app`+`worker`. **Rejected.** Repo evidence (STACK.md) + independent confirmation (PITFALLS.md): compose defines `app-bench-1..4` under `bench` AND `docker compose up -d --no-deps app worker` recreates containers; a filesystem spool is neither shared across instances nor durable; only `pgdata` persists. **Postgres is the only shared, durable state.** Decision: a `file_upload_jobs` table with `payload bytea`, `status (PENDING|PROCESSING|DONE|FAILED)`, `attempts`, `last_error`, `payload_mime`; on successful Drive upload set `status='DONE'`, `payload=NULL`, write `drive_file_id` to `submission_files`. Accepted trade-off: each unsynced file costs up to 10 MB in the DB, bounded by per-submission file count × pending backlog; acceptable because only unsynced files carry payload and the cap is hard. Filesystem-volume alternative documented and rejected: requires identical mounts on app + every `app-bench-*` + worker, orphan cleanup on recreate, UID-1001 permission handling, and extra ops surface for zero benefit at 10 MB.

**AD-3 — Separate file and job tables.** `submission_files` (lifecycle `storage_status`: `PENDING_UPLOAD|QUEUED|SYNCED|FAILED|ORPHANED`) + `file_upload_jobs` (queue). **Never reuse `submission_jobs`** — its `UNIQUE(submission_id)` clashes when one submission has many files, and its retry/starvation semantics differ. (`submission_files` may carry `submission_id NULL` for the orphan window and `field_id NULL` for admin extras.)

**AD-4 — Extend the existing worker, no new container.** `scripts/submission-worker.mjs` adds a second `fetch` to `POST /api/internal/file-upload-jobs/process?batch=N` with the same `x-worker-token`; sync runs inside the app process. No compose service churn.

**AD-5 — One private serving route.** `GET /api/files/[id]`: `getAdminSession()` → ownership/scope check → if `drive_file_id` present stream Drive `alt=media`, else stream spool `bytea`; response `Content-Disposition: attachment; filename="<sanitized>"`, `application/octet-stream`, `nosniff`. Never redirect to / expose a Drive URL. Single code path for synced + pending.

**AD-6 — Raw-SQL domain module.** All file tables accessed via `prisma.$queryRaw/$executeRaw` in `file-storage.ts` (mirrors `forms.ts`, AGENTS.md rule); Prisma schema models only for migration/type parity. `FOR UPDATE SKIP LOCKED` claim identical to submission jobs; Drive upload idempotent (persist `drive_file_id` before marking SYNCED; on retry verify not re-create); attempts cap 5 → `FAILED`.

---

## Watch Out For

Each blocker names the phase that must close it.

| # | Blocker | Prevention | Phase |
|---|---|---|---|
| **W1** | **A service account cannot own My Drive files (no storage quota).** `GOOGLE_DRIVE_FOLDER_ID` into a My-Drive folder 403s `storageQuotaExceeded`, all uploads stuck in spool. **[NON-NEGOTIABLE FINDING — ARCHITECTURE.md's client sketch omits this]** | Target a **Shared Drive folder**; SA added as member; pass `supportsAllDrives: true`, `includeItemsFromAllDrives: true`, and `driveId` on create. Startup config probe fails fast if folder not writable. Real smoke test (file actually appears) before any UI work. Plan per-form/year subfolders (shared drive caps: 500k items, 100 levels). | Foundation |
| **W2** | Anonymous upload = memory/OOM + rate-limit bypass. `request.formData()` buffers whole body; Server Actions default 1 MB; in-memory limiter is per-process (bench ×4); `getClientIp` trusts spoofable XFF; no byte cap. | Route Handler (not Server Action), size guard before/while reading + concurrency cap; `client_max_body_size 12m` + non-cached upload location in Nginx; trust only proxy-set XFF; add bytes-per-window cap; shared limiter or explicit `RATE_LIMIT_SINGLE_INSTANCE_OK`. Verify under k6. | Upload API + infra |
| **W3** | Volume-less fallback semantics. No `filespool` volume exists; any container-FS spool vanishes on redeploy and is invisible to other `app-bench-*` instances / worker. | Spool = Postgres `bytea` (AD-2). File survives `docker compose up -d --no-deps app worker` because it lives in `pgdata`. Document that the DB is the fallback store; do not add an upload volume. | Storage/queue |
| **W4** | `/api/files/[id]` IDOR / path traversal / inline XSS. Auth-only check lets admin swap ids to another submission's file; request-derived path escapes root; inline SVG/HTML executes in admin origin. | Per-request ownership/scope lookup; UUID names + fixed root + realpath containment; forced `attachment` + `octet-stream` + `nosniff`; sanitized header filename. Negative tests: id swap, `../`, inline SVG. | Serving |
| **W5** | Export leaks Drive links / formula injection. Raw Drive URL breaks privacy + PROJECT.md; filename `=` becomes live formula; multi-file answers break 500-row split. | Export `Nama File — <app /api/files/[id] URL>`; store file metadata `{id,name,type,size}` in `value_json`; strip leading `= + - @` from filenames; verify chunking. | Admin/export |
| **W6** | MIME trust over extension. `file.type` forged with `curl -F "file=@x.exe;type=image/jpeg"`. | Magic-byte sniff (`file-type`) + allowlist + size from received bytes; re-derive stored content type. Negative test with spoofed `.jpg`. | Upload validation |
| **W7** | EXIF/PII + timezone drift. Photo GPS/device data stored and exposed; GC/expiry uses mixed `new Date()` (UTC) vs DB `NOW()`; export filename date off-by-day. | Strip EXIF on image upload; retention policy in GC; single UTC convention (`TIMESTAMPTZ`/one `now()`); single documented export timezone. | Upload validation + GC |
| **W8** | Orphan / storage leak. Abandoned uploads + deleted submissions/forms leave Drive blobs (cascade only clears rows); shared-drive item cap. | `expires_at`/`ORPHANED` TTL sweep; submission/form delete enumerates blobs → Drive+spool delete or queued purge; DB↔Drive reconciler by `appProperties` tag. | GC + submission-delete |
| **W9** | Duplicate Drive files / starvation. Crash after Drive upload but before SYNCED re-uploads; permanent failure retries forever blocking real submit jobs. | Separate queue table, idempotent create (persist `drive_file_id` first), capped attempts → `FAILED`, partition sync loop from submission loop. | Queue/worker |
| **W10** | SA credential leak. Committed JSON/pem, baked into image `ENV`, logged, or bundled to client. | Runtime secret only; `server-only` guard on `google-drive.ts`; sanitize `last_error`; verify `npm run build` bundle has no key. | Foundation (re-verify in ops) |

---

## Suggested Phase Structure

Derived from the three source build orders (ARCHITECTURE build order 1→8, FEATURES dependency graph, PITFALLS phase mapping). Critical path: F1 → (F2 ∥ F3) → F4 → F5 → F6 → F7 → F8.

### Phase F1 — Foundation: schema, field plumbing, Drive client & credentials
**Rationale:** Unblocks everything; the Shared Drive + credential model must be proven before any UI/upload work — otherwise the whole feature silently falls to spool forever (W1, W10).
**Delivers:** Migration (`submission_files`, `file_upload_jobs`, `ALTER TYPE FieldType ADD 'FILE'`) + Prisma models; `FILE` in `forms.ts` unions/mappers + `FileField`; `google-drive.ts` (cached client, `drive.file` scope, Shared-Drive create with `supportsAllDrives`/`driveId`, startup probe); env wiring + Dockerfile placeholders.
**Covers:** FILE-01 (schema/domain) partial; stack + env; SA auth.
**Watch:** **W1 non-negotiable** (real smoke test → file appears in Shared Drive), W10.

### Phase F2 — Field config & builder/editor/renderer
**Rationale:** A `FILE` field must be configurable and render in editor + preview before an upload component can bind to it.
**Delivers:** `AdminFormEditor` FILE option + config card (required, max MB, MIME preset, max count); `AdminFormPreview` + `AttendanceForm` render an (inert) file field placeholder; collapsed-card summary label.
**Covers:** FILE field type + per-field config table stakes.
**Watch:** config stored via existing `settings`/field-JSON path (CHECKBOX precedent), not new columns.

### Phase F3 — Storage abstraction & spool (parallel with F2)
**Rationale:** Pure helpers, independently unit-testable; the `bytea` spool decision lands here (AD-2/W3).
**Delivers:** `file-storage.ts` (raw SQL: record upload, list-by-submission, link-to-submission, serve lookup, claim, sync-state) over `submission_files` + `file_upload_jobs` (`payload bytea`); file/job table access; checksum; status transitions.
**Covers:** storage layer + DB records.
**Watch:** W3 (Postgres is fallback store, no volume), W7 (UTC timestamp convention).

### Phase F4 — Public upload API + client upload component
**Rationale:** Core public flow; needs F1 + (F2 ∥ F3).
**Delivers:** `POST /api/public/files/upload` (Route Handler, multipart, magic-sniff + size + count, rate/byte limit, spool-to-DB, enqueue, `{fileId}`, 200 even on Drive-down); `FileUploadField.tsx` (native DnD, XHR progress, preview, remove); `AttendanceForm` integration (deferred-upload → submit links fileIds, block submit until settled); `validateFormSubmission` file branch; orphan TTL marker. Nginx upload location config.
**Covers:** public UX, upload API, server validation, count/size.
**Watch:** W2 (buffering/OOM/XFF/byte cap — verify k6), W6 (magic sniff), W7 (EXIF strip).

### Phase F5 — Sync worker, queue processing & retry/GC
**Rationale:** Turns `PENDING` → `SYNCED`; independent of client UI; needs F1 + F3 (+ F4 for real files).
**Delivers:** `POST /api/internal/file-upload-jobs/process` (SKIP LOCKED claim, idempotent Drive push, persist `drive_file_id` pre-SYNCED, backoff, 5-attempt → `FAILED`, null payload on DONE); extend `scripts/submission-worker.mjs` (same token, second fetch); orphan TTL sweep + reconciler skeleton.
**Covers:** Drive sync worker, queued retry, orphan cleanup (base).
**Watch:** W9 (no duplicates, no starvation), W8 (GC), W3 (payload nulled on sync keeps DB bounded).

### Phase F6 — Private serving route
**Rationale:** Single download path for synced + pending files; needs F5 for the synced branch (local branch testable at F4).
**Delivers:** `GET /api/files/[id]` — `getAdminSession()`, ownership/scope check, Drive `alt=media` stream or `bytea` stream, forced `attachment` + `octet-stream` + `nosniff`, sanitized filename.
**Covers:** FILE-06 private serving.
**Watch:** **W4** (IDOR/traversal/inline XSS; negative tests).

### Phase F7 — Admin surfaces & export integration
**Rationale:** Needs a working serving route (F6) and synced/unsynced files (F5).
**Delivers:** `FileAttachmentsPanel.tsx` (list, status badge `Menunggu sinkronisasi`/`Tersinkron`, download, extra add-only upload, origin tag); `POST /api/admin/files/upload`; `AdminFormSubmissions` file cell + detail panel; Excel export = filename + app URL (`value_json` metadata); analytics attachment counts (exclude from distribution charts); submission-delete → purge.
**Covers:** admin panel, extra attachment, export, delete-purge.
**Watch:** W5 (app URLs only, formula sanitize, 500-row split), W8 (delete blobs).

### Phase F8 — Hardening, GC tuning & QA
**Rationale:** Cross-cutting verification after all paths exist.
**Delivers:** retry/backoff + reconciler tuning; shared/bench limiter decision; Docker targeted rebuild (`app`, `worker`) + `/api/health`; unit tests (`forms.test.ts`, new `file-storage.test.ts`: valid PNG/PDF, spoofed ext, oversize, Drive-down→spool→sync, crash-retry no-dup, GC TTL); lint + `tsc --noEmit` + standalone build; k6 memory check.
**Covers:** FILE-07 QA; pitfalls checklist from PITFALLS.md "Looks Done But Isn't".
**Watch:** full checklist re-verification (W1–W10).

### Phase Ordering Rationale
- Shared-Drive + credential proof is first because it is the highest-cost-to-discover-late failure (W1).
- F2/F3 parallel: editor rendering and DB/storage are independent; F4 needs both.
- Serving (F6) before admin UI (F7) so the panel has a real endpoint to link to; keeps the private-serving security work in its own auditable phase (W4).
- Worker (F5) extended in place — no new container — mirroring the proven `submission_jobs` pattern while keeping tables separate (W9).
- Postgres spool (AD-2) threads through F3–F5 so no phase assumes a filesystem volume (W3).

### Research Flags
**Needs deeper research during planning:**
- **F1 (Drive/Shared-Drive setup):** Shared Drive provisioning + SA membership + `supportsAllDrives`/`driveId`/`appProperties` specifics; confirm against live Google Workspace before coding.
- **F4 (upload memory/rate):** exact Next.js 16 Route Handler streaming behavior + Nginx body/buffering tuning under the `bench` profile — validate with k6.

**Standard patterns (skip research-phase):**
- **F2:** enum + editor config mirrors v2.2 `CHECKBOX` exactly.
- **F6:** auth-gated route + `Content-Disposition` are well-documented; PITFALLS.md gives the full recipe.
- **F7:** export/table formatting follows existing `forms.ts` formatter patterns.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Versions from npm registry; Drive upload/download from official docs; `@googleapis/drive` vs `googleapis` size verified. |
| Features | MEDIUM-HIGH | Industry patterns well established; Drive latency/quota specifics least certain. |
| Architecture | MEDIUM-HIGH | Integration points HIGH (read from live code); Drive patterns MEDIUM (standard SA flow). Volume decision overridden by STACK/PITFALLS evidence → resolved to Postgres `bytea`. |
| Pitfalls | HIGH | Stack-specific, grounded in repo code; Drive shared-drive facts from official docs. |

**Overall confidence:** MEDIUM-HIGH.

### Gaps to Address
- **Shared Drive existence:** PROJECT.md's `GOOGLE_DRIVE_FOLDER_ID` is ambiguous about My-Drive vs Shared-Drive. Resolve at F1 — if no Shared Drive exists, provision one or pick OAuth-on-behalf-of-human (heavier); do not ship assuming My Drive (W1).
- **Rate-limit topology:** whether file upload is exposed under the `bench` profile (multi-instance limiter unsafe). Decide at F4/F8; either exclude upload from bench or adopt a shared limiter.
- **DB spool size ceiling:** accepted (10 MB × pending files); monitor backlog; ensure payload nulled on sync and GC bounds orphans. Revisit only if a real >10 MB or high-concurrency need appears.
- **Existing `next.config.ts`:** confirm `@googleapis/drive` needs no `serverExternalPackages` entry (pure JS); add only if bundling fails.

## Sources

### Primary (HIGH confidence)
- Google Drive API — manage-uploads / manage-downloads / about-shareddrives (official): SA has no quota / cannot own files; must use Shared Drives; 500k-item / 100-level caps.
- npm registry metadata — package versions, sizes, `engines`, ESM flags.
- Codebase: `prisma/migrations/*`, `src/lib/forms.ts`, `src/lib/rate-limit.ts`, `src/lib/auth.ts`, `scripts/submission-worker.mjs`, `Dockerfile`, `docker-compose.yml`, `infra/nginx/benchmark.conf`.
- Next.js `serverActions` docs — 1 MB default body limit.
- OWASP File Upload Cheat Sheet — magic-number validation, private serving.

### Secondary (MEDIUM confidence)
- `github.com/googleworkspace/node-samples` — SA + `files.create({requestBody, media})` pattern.
- Google Forms / Typeform / Jotform upload-field docs — competitor feature comparison.
- MDN — `XMLHttpRequest.upload`, `URL.createObjectURL`, drag-and-drop.

### Tertiary (LOW confidence)
- Drive quota/retry specifics (per-SA request rates, latency) — verify at F1.

---
*Research completed: 2026-11-16*
*Ready for roadmap: yes*
