# Feature Research

**Domain:** File upload fields in online forms + private object storage (Google Drive via service account)
**Project:** isian (Next.js 16 App Router, Prisma/PostgreSQL, public `/f/[slug]` + admin dashboard)
**Milestone:** v2.3 File Upload & Google Drive Storage
**Researched:** 2026-11-16
**Confidence:** MEDIUM-HIGH (industry patterns well established; Drive-specific latency/quotas are the least certain area)

## Scope Guard

Only NEW capability is covered. Assumed already built and NOT re-researched: form builder engine, validation pipeline (`src/lib/form-validation.ts`, `validateFormSubmission`), public form renderer (`AttendanceForm.tsx`), editor (`AdminFormEditor.tsx`), submissions dashboard (`AdminFormSubmissions.tsx`), analytics (`getFormAnalytics`), Excel export (`exportAdminFormSubmissionsWorkbook`), job queue (`submission_jobs` table + `processQueuedSubmissionJobs` + worker script), rate limiting (`src/lib/rate-limit.ts`).

## Feature Landscape

### Table Stakes (Users Expect These)

Missing any of these and the field feels broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| `FILE` field type in builder picker | Admin must be able to add the field at all | LOW | Add to `FieldType`/`FormFieldType` enum + `AdminFormEditor` type list + collapsed-card summary label. Follows exact pattern of `CHECKBOX` in v2.2. |
| Per-field config: required toggle | Universal form field expectation; already exists for every other type | LOW | Reuse existing `required` flag semantics in `validateFormSubmission`. |
| Per-field config: max size (MB) | Admins must cap abuse/storage cost | LOW | Default 10 MB. Must be enforced server-side, not only client. |
| Per-field config: allowed types (image/pdf) | Prevent junk/executables; core to the milestone goal | LOW-MEDIUM | Store MIME allowlist. Normalize to a small preset set (`image/*`, `application/pdf`) plus explicit MIME list rather than free-text extensions. |
| Per-field config: max file count | "Jumlah file" is in the milestone target; users expect control | MEDIUM | Count interacts with validation, upload API, and partial-upload cleanup. |
| Server-side type + size validation | Client validation is bypassable; public form has no login | MEDIUM | Magic-number sniffing for images/PDF, not just `Content-Type` header and not just extension. Existing form is rate-limit-only, so this is the real security gate. |
| Drag-and-drop + file picker | Universal upload affordance in every form product | LOW-MEDIUM | Native HTML5 drag events + `<input type="file">`. PROJECT.md explicitly forbids heavy DnD libs — use native, consistent with `Zero External DND/Animation Libs` decision. |
| Per-file upload progress | Users abandon silent uploads, especially on mobile/spotty networks | MEDIUM | Needs `XMLHttpRequest.upload.onprogress`, not `fetch` (fetch has no upload progress). This is the single biggest technical constraint against the existing `fetch`-only convention in `src/components/**`. |
| Preview before submit (image thumbnail / PDF icon+name) | Confidence the right file was picked | LOW-MEDIUM | `URL.createObjectURL` for local preview; revoke object URLs on removal to avoid memory leaks. |
| Remove file before submit | Basic mistake recovery; absence is a hard blocker | LOW | Client state removal. Does NOT require server-side deletion if upload is deferred. |
| Replace file before submit | Users pick wrong file constantly | LOW | Implement as remove+add, not a dedicated "replace" mode. |
| Inline validation error states (type/size/count/required) | Consistency with existing hybrid error UX (error on submit, auto-clear) | LOW | Must reuse `form-validation.ts` conventions and auto-scroll/focus-to-first-error behavior. |
| Show chosen files in submission detail | Admin needs to see what was attached | MEDIUM | Attachment list panel in `AdminFormSubmissions` detail view. |
| Admin download of attachments | The entire point of storing them | MEDIUM | Redirect through app URL (`/api/files/[id]`), never raw Drive URL. Protected by `getAdminSession()`. |
| Private access only | Milestone hard requirement; "anyone with link" is a data leak | MEDIUM-HIGH | Auth-gated download route, no public Drive sharing, `webViewLink` never surfaced. |
| Excel export shows filename + app URL, not Drive URL | Milestone requirement; export must stay usable after Drive URLs rotate/expire | LOW-MEDIUM | Modify `exportAdminFormSubmissionsWorkbook` file-column formatting. URL must be app-relative/labeled, not a live tokenized Drive link. |
| Submissions table cell shows filename(s) | Table must not dump raw JSON/URL blobs | LOW-MEDIUM | Change file-answer formatter in `AdminFormSubmissions` (mirror the `CHECKBOX` badge pattern). |
| Drive failure must not block submission | Milestone hard requirement | MEDIUM-HIGH | Local queue row + `status=pending`; submission succeeds regardless. Reuses existing job-queue idea but needs its own table/status, not `submission_jobs` (different lifecycle, no dedupe key semantics). |
| Queued retry/sync worker | Required by milestone for the failure path | MEDIUM | Extend or parallel `scripts/submission-worker.mjs` calling an internal route with `x-worker-token`. Needs idempotency to avoid duplicate Drive uploads. |
| Orphan/abandoned upload cleanup | Unbounded storage growth otherwise | MEDIUM | Required if uploads are eager (uploaded on pick, before submit). If uploads are deferred to submit, far simpler: no orphan window except crashed uploads. |
| Submission deletion deletes its files | Users expect delete to actually delete | MEDIUM | Hook into `deleteAdminFormSubmission`; handle both Drive and local fallback copies. Could be soft-delete + queue for async purge. |

### Differentiators (Competitive Advantage)

Aligned with Core Value: reliable, fast, safe, premium visual.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Drive-failure graceful degradation with visible per-file status (`pending sync` / `tersinkron`) | Most simple forms apps just fail the upload. This is the milestone's headline differentiator. | MEDIUM | Status badge in admin attachment panel; do not surface technical jargon to participants. |
| Local fallback serving (`/api/files/[id]` serves local file when Drive not yet synced) | Attachments remain downloadable the instant submission lands, even during Drive outage | MEDIUM | Route chooses Drive proxy vs local disk based on DB `storage_status`. |
| Client-side pre-validation before upload starts (size/type/count) | Saves bandwidth and gives instant feedback; matters a lot at 10 MB | LOW | Cheap, high perceived-quality win, mirrors existing instant-feedback philosophy. |
| Admin can add extra attachments to an existing submission | Field officers/"petugas" often collect documents after the fact | MEDIUM | Reuses the same upload/storage pipeline with admin auth instead of public slug. |
| Image compression/downscale before upload | Cuts 10 MB photos to ~1 MB; big win on mobile networks and Drive quota | MEDIUM | Client-side canvas resize for images only; do NOT re-encode PDFs. Must respect max-size semantics (validate after compression). |
| Bulk download attachments (per submission or per form) | Admin real-world need when processing many submissions | MEDIUM-HIGH | Requires server-side zip streaming; likely defer. |
| Orphan sweep report / storage usage dashboard | Ops confidence, cost control with Drive quota | MEDIUM | Admin-visible counts of pending/errored/orphaned files. |

### Anti-Features (Commonly Requested, Often Problematic)

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Public/unauthenticated file URLs ("anyone with link") | Convenient sharing | Direct violation of milestone privacy requirement; permanent leak vector that survives unsharing | App-auth redirect route `/api/files/[id]` |
| Storing Drive `webViewLink` in DB/export/UI | "Just link to the file" | Drive URLs leak access, expire, and break the "private" guarantee | Store Drive file `id` only; construct app URL from local file record |
| Resumable/chunked uploads | Robust on bad networks | Large complexity jump (session protocol, tus/multipart, server state); 10 MB cap makes it unnecessary | Single-request upload with progress + retry button |
| Arbitrary user-supplied allowlist (any extension, any size) | "Flexible" | Admin foot-guns: executables, huge files, quota exhaustion | Preset type groups + capped max size (e.g. hard ceiling ~25 MB) |
| Virus scanning | Security-minded admins ask | AV engine + definitions + ops burden is a whole subsystem, out of scope for a 10 MB image/PDF allowlist | Strict MIME allowlist + magic-number sniff + private serving; note as future hardening |
| Preview/render documents inline (PDF viewer, office docs) | "View without downloading" | PDF/office rendering in-browser is a large surface; office docs need conversion | Image thumbnails only; PDFs = name + icon + download |
| Versioning/replacing attachments post-submission with audit trail | Data integrity purists | Full CRUD + history model dwarfs the feature | Allow add-only extra attachments; record who/when; keep originals |
| Inline editing of already-submitted file answers | "Let participants fix mistakes" | Public forms have no identity; editing post-submit is a security/hijack risk | Participants remove/replace before submit only |
| Reusing `submission_jobs` for file sync | "It's already a queue" | Different lifecycle, dedupe semantics, and payload; conflation creates confusing retries | Dedicated `submission_files` table with its own `storage_status` + sync queue |
| Cross-form global file browser | "One place to see all files" | Adds listing/search/permissions scope; marginal value | Per-submission attachment panel; per-form export |
| Fire-and-forget delete without cleanup job | Simplicity | Silent storage leaks when Drive delete fails | Soft-delete + queued purge with retry |

## Feature Dependencies

```
FILE field type (enum + builder UI)
    └──requires──> per-field config model (required, maxSizeMb, allowedTypes, maxCount)
                        └──requires──> validation in validateFormSubmission (server)
                                            └──requires──> magic-number type sniffing

Public upload UX (drag-drop, progress, preview, remove)
    └──requires──> FILE field type
    └──requires──> public upload API (rate limit + size/type/count validation)
                        └──requires──> storage layer (Drive service account OR local fallback)
                                            └──requires──> DB records for uploaded files

Admin attachment panel
    └──requires──> submission detail data including file records
    └──requires──> /api/files/[id] protected download route
                        └──requires──> storage layer

Drive sync worker
    └──requires──> storage_status on file records
    └──requires──> queue table + internal token route (pattern: submission_jobs)

Excel export filename+URL
    └──requires──> file records linked to submission answers
    └──requires──> deterministic app URL scheme

Submission delete → file purge
    └──requires──> deleteAdminFormSubmission hook
    └──requires──> Drive delete + local delete with failure queueing

Analytics file answering ──enhances──> submissions view (count of attachments per response)
Admin extra-attachment upload ──requires──> admin upload API (mirrors public API, admin auth)
Image compression ──enhances──> upload UX (reduces payload)
Orphan cleanup ──requires──> eager upload OR upload-session records
    (Only needed if uploads happen before submit; deferred upload removes most need)
```

### Dependency Notes

- **FILE field type requires enum migration + `forms.ts` type mapping:** identical pattern to `AGREE-01` (`'CHECKBOX'`). The raw SQL form-builder tables and `src/lib/forms.ts` must both change; Prisma-schema-only edits do not touch form-builder tables (per AGENTS.md).
- **Upload API requires storage layer abstraction:** a thin interface (`put/get/delete`) with Drive and local-disk implementations keeps the failure-fallback path clean and testable.
- **`/api/files/[id]` requires auth + storage-status awareness:** route must call `getAdminSession()` and pick Drive proxy vs local file from the record.
- **Worker requires `storage_status` states:** at minimum `pending | syncing | stored | failed | deleted`. Without explicit states, idempotency and cleanup are impossible.
- **Export requires file records, not inline answer blobs:** the answer value in the submission row should reference file records; the export formatter then resolves names + app URLs.
- **Progress UI conflicts with codebase `fetch`-only convention:** codebase uses native `fetch` everywhere (per AGENTS.md). Upload progress needs `XMLHttpRequest` (or `ReadableStream` upload via `fetch` which is not broadly supported). This is an intentional, documented deviation limited to the upload component.
- **Client compression conflicts with "validate size" semantics:** validate the original file against the admin's max size BEFORE compression, otherwise admins can't reason about the limit. Validate again after compression defensively.
- **Admin extra-attachment conflicts with immutability:** decide and document that extra attachments are additive only (no replace/delete of participant files by admin beyond submission deletion).

## Per-Surface Behavior Notes

### Participant-side (public `/f/[slug]`)
- Drop zone + "Pilih file" button, both keyboard accessible (Tab + Enter/Space), matching existing checkbox a11y standard.
- Accept attribute reflects allowed types; do not rely on it for validation.
- Show file name, size, type icon/thumbnail, and a remove (×) control per file.
- Enforce `maxCount` by disabling add after limit; show helper text "Maksimal N file".
- Error states must reuse hybrid clear-on-change pattern from v1.6 validation.
- Do not require a Drive popup/consent — service account means straight server upload, no user Google login.
- If upload fails mid-submit: allow retry of just the failed files; do not require re-filling the form.

### Admin-side (submission detail)
- Attachment panel lists: filename, size, uploaded-at, storage status badge.
- Download = plain link to `/api/files/[id]`; server redirects/proxies to Drive or local file.
- Extra attachment upload uses the same validation UI; record `uploaded_by` admin identity.
- Annotate origin ("peserta" vs "admin") where extra attachments are allowed.
- Drive-failure rows display `Menunggu sinkronisasi` and auto-refresh or are polled lightly; do not block the rest of the detail view.

### Export & analytics
- Excel: file column = `[N file] nama1.pdf; nama2.jpg` plus app URL(s); never Drive links.
- Analytics: file questions have no meaningful "distribution". Table stakes pluralistic answer: show count of responses with attachments and total files (coverage), not pie charts. Explicitly exclude file questions from answer-distribution charts.

### Lifecycle
- Preferred model: **deferred upload** (files uploaded at submit time, transaction-adjacent), which nearly eliminates orphan windows. If eager upload is chosen for smoother UX, require upload-session records + expiry sweep.
- Replacement before submit = delete local client state + delete any eager-uploaded server record.
- Submission deletion → best-effort Drive delete, local delete, and queued purge entry on failure.
- Orphan sweep: scheduled job deleting file records with no linked submission older than N hours.
- Drive quota/rate limits: define max retries and a terminal `failed` state surfaced to admin; never infinite retry.

## MVP Definition

### Launch With (v1)
- [ ] `FILE` field type in builder with required, maxSizeMb (default 10), allowedTypes preset (image/PDF), maxCount — essential to any upload feature.
- [ ] Public upload field with drag-drop, picker, progress, preview, remove/replace, inline errors — table stakes UX.
- [ ] Public upload API with server-side MIME magic-sniff + size + count validation — essential security gate.
- [ ] Private download route `/api/files/[id]` with admin session + local fallback — privacy requirement + Drive-failure resilience.
- [ ] Admin attachment panel with listing + download + extra upload — core admin value.
- [ ] Drive sync worker / queue with `storage_status` — the milestone's headline reliability promise.
- [ ] Export + submissions-table file formatting using app URL — milestone requirement.
- [ ] Submission delete → file purge — prevents obvious storage leak.
- [ ] Basic orphan cleanup for failed/crashed uploads — prevents runaway storage.

### Add After Validation (v1.x)
- [ ] Client image compression/downscale — add when real mobile uploads show size pain or Drive quota pressure.
- [ ] Admin bulk download (zip) per form — add when admin workflows show manual download fatigue.
- [ ] Storage usage/orphan dashboard — add when Drive quota becomes an ops concern.
- [ ] Per-file retry button in admin panel — add if sync failures are observed in practice.

### Future Consideration (v2+)
- [ ] Virus scanning — only if regulatory/security requirements demand it.
- [ ] Document preview/inline rendering — high surface area, defer until asked loudly.
- [ ] Multi-provider storage abstraction beyond Drive+local (S3/etc.) — defer until Drive limitations actually bite.
- [ ] Resumable uploads — defer; 10 MB cap makes it unnecessary.

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| FILE field type + config | HIGH | LOW | P1 |
| Public drag-drop + progress + preview + remove | HIGH | MEDIUM | P1 |
| Server MIME/size/count validation | HIGH | MEDIUM | P1 |
| Private `/api/files/[id]` (auth + local fallback) | HIGH | MEDIUM | P1 |
| Admin attachment list + download | HIGH | MEDIUM | P1 |
| Drive sync queue/worker + storage_status | HIGH | MEDIUM-HIGH | P1 |
| Submission-delete file purge | MEDIUM | MEDIUM | P1 |
| Export filename+app URL | MEDIUM | LOW-MEDIUM | P1 |
| Submissions table file cell | MEDIUM | LOW-MEDIUM | P1 |
| Orphan cleanup | MEDIUM | MEDIUM | P2 |
| Admin extra-attachment upload | MEDIUM | MEDIUM | P2 |
| Client image compression | MEDIUM | MEDIUM | P2 |
| Analytics attachment counts | LOW-MEDIUM | LOW | P2 |
| Bulk zip download | MEDIUM | MEDIUM-HIGH | P3 |
| Storage/orphan dashboard | LOW-MEDIUM | MEDIUM | P3 |
| Virus scanning | LOW (for this use case) | HIGH | P3 |

## Competitor Feature Analysis

| Feature | Google Forms | Typeform | Jotform | Our Approach |
|---------|--------------|----------|---------|--------------|
| File field config | Type + max size + count | Multiple files + size limit | Type, size, count, storage | Preset types + capped MB + max count, all server-enforced |
| Participant upload UX | Basic picker, no progress | Polished dropzone + progress | Dropzone + progress + preview | Native dropzone + XHR progress + preview + remove |
| Upload timing | At submit | At submit | At submit (with progress) | Deferred upload at submit; no orphan window |
| Storage privacy | Uploader-owned Drive | Their CDN | Their storage | Private, service-account Drive + app-auth download |
| Failure handling | Fails on error | Retries internally | Fails on error | Queue + local fallback + auto-sync (differentiator) |
| Export of file answers | Drive link (public-ish) | File URLs | File links | Filename + app URL only |
| Admin extra attachments | No | No | Limited | Yes, additive, tagged origin (differentiator) |

## Sources

- Google Forms, Typeform, Jotform upload-field docs and public UI (feature comparison, accessed 2026-11-16)
- OWASP File Upload Cheat Sheet (magic-number validation, private serving)
- MDN: `XMLHttpRequest.upload`, `URL.createObjectURL`, HTML5 drag-and-drop events
- Google Drive API v3 docs (service-account upload, permissions, delete) — MEDIUM confidence on quotas/retry specifics
- Internal: `.planning/PROJECT.md` v2.3 target features, `AGENTS.md` conventions, `src/lib/forms.ts` export surface, v2.2 `CHECKBOX` milestone pattern

---
*Feature research for: file upload fields + private Google Drive storage*
*Researched: 2026-11-16*
