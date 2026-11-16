# Project Roadmap

## Completed Milestones

- [Milestone v2.2: Agreement & Terms Checkbox Field Support (Shipped: 2026-10-01)](milestones/v2.2-ROADMAP.md) — Phases 41-45
- [Milestone v2.1: Admin Invitation System & Google OAuth Access Delegation (Shipped: 2026-09-28)](milestones/v2.1-ROADMAP.md) — Phases 37-40
- [Milestone v2.0: UI/UX Density & Information Hierarchy Refactor (Shipped: 2026-09-27)](milestones/v2.0-ROADMAP.md) — Phases 31-36
- [Milestone v1.9: Interactive Analytics & Submission Data Visualization (Shipped: 2026-09-27)](milestones/v1.9-ROADMAP.md) — Phases 28-30
- [Milestone v1.8: Editorial Minimalist Monochrome Transformation (Shipped: 2026-09-27)](milestones/v1.8-ROADMAP.md) — Phases 24-27
- [Milestone v1.7: Performance, Infrastructure Hardening & Real User Observability (Shipped: 2026-09-26)](milestones/v1.7-ROADMAP.md) — Phases 19-23
- [Milestone v1.6: Interactive Form Live Preview with Real-Time Draft Synchronization (Shipped: 2026-09-26)](milestones/v1.6-ROADMAP.md) — Phases 14-18
- [Milestone v1.5: Dynamic Multi-Page Forms, Likert Scales, Quiz Engine & Conditional Branching (Shipped: 2026-09-26)](milestones/v1.5-ROADMAP.md) — Phases 9-13
- [Milestone v1.4: Universal Attendance Form Migration & Dynamic Builder (Shipped: 2026-09-25)](milestones/v1.4-ROADMAP.md) — Phases 6-8
- [Milestone v1.3: Dynamic Form Builder MVP (Shipped: 2026-09-25)](milestones/v1.3-ROADMAP.md) — Phases 1-5

## Current Milestone

**Milestone v2.3: File Upload & MinIO Object Storage** — Phases 46-53 (planning)

**Milestone Goal:** Memungkinkan peserta form publik dan admin mengunggah file (gambar/PDF, maks 10 MB) yang tersimpan di object storage S3-compatible (MinIO, self-hosted di compose yang sama), dengan akses file private melalui aplikasi saja.

**Granularity:** standard — phases derive from `research/SUMMARY.md` F1-F8, which already reflected three independent build orders.

**Critical constraint:** Object storage MUST be reachable at boot, but an outage MUST NOT block submissions — bytes land in the Postgres `bytea` spool first, then sync to MinIO asynchronously. Bucket stays private; no public URLs, no presigned links handed to clients.

**Architecture revision (2026-11-16):** The original plan targeted Google Drive via service account into a Shared Drive. Proven infeasible: the operator has no Google Workspace tenant, service accounts cannot create Shared Drives, and a service account has zero My-Drive quota (`storageQuota.limit: "0"`), so My-Drive uploads 403. Phase 46-03's live proof caught this before any feature code shipped. Storage backend replaced with MinIO (S3-compatible); the Drive client, credentials, probe, and packages are removed.


## Phases

- [x] **Phase 46: Foundation - Schema, Field Plumbing, MinIO Client & Credentials** - Prove real MinIO upload works end-to-end before any feature code
- [x] **Phase 47: File Field Config, Builder, Editor & Renderer** - Admin can add and configure a file field; it renders in editor, preview, and public form
- [ ] **Phase 48: Storage Abstraction & Postgres bytea Spool Layer** - Raw-SQL domain module owns file records, queue records, and bytea spool lifecycle
- [ ] **Phase 49: Public Upload API & Client Upload Component** - Anonymous participants upload files on `/f/[slug]` without blocking on storage availability
- [ ] **Phase 50: Sync Worker, Queue Processing, Retry & Orphan GC** - Queued files sync to MinIO idempotently with capped retry; orphans expire
- [ ] **Phase 51: Private File Serving Route** - Authenticated admins download files through the app only, never via storage links
- [ ] **Phase 52: Admin Surfaces & Export Integration** - Attachment panel, extra admin uploads, submissions table, and Excel export use app URLs
- [ ] **Phase 53: Hardening, GC Tuning & QA** - OOM-safe limits, EXIF stripping, full test suite, and container rebuild verified

## Phase Details

### Phase 46: Foundation — Schema, Field Plumbing, MinIO Client & Credentials

**Goal**: The feature's storage backbone is real and proven: `FILE` field type exists in PostgreSQL and TypeScript, both file tables exist via migration, and an S3-compatible client demonstrably uploads a real file into a private MinIO bucket and reads it back byte-identical.
**Depends on**: Nothing (first phase of v2.3; builds on Phase 45 state)
**UI hint**: no
**Requirements**: FILE-01, FILE-02, FILE-03, FILE-04, FILE-05
**Success Criteria** (what must be TRUE):

  1. A migration creates `submission_files` (id, submission_id nullable, field_id nullable, original/sanitized filename, mime, size, checksum, storage status, object_key, bucket, timestamps) and `file_upload_jobs` (`payload bytea`, status PENDING/CLAIMED/DONE/FAILED, attempt counter, next_attempt_at), and `ALTER TYPE "FieldType" ADD VALUE 'FILE'` applies cleanly on an existing database
  2. `FILE` is recognized end-to-end in `src/lib/forms.ts` unions, mappers, and the domain form-field model, alongside the Prisma schema parity models
  3. A smoke test uploads a real file through the storage client, reads it back byte-identical, and proves the bucket rejects anonymous access — not merely returns HTTP 200
  4. A connectivity probe runs at boot and reports degraded state (never a silent failure) when MinIO is unreachable, without preventing the app from booting into spool-only mode
  5. New env vars (`MINIO_ENDPOINT`, `MINIO_PORT`, `MINIO_USE_SSL`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`) are documented in `.env.example` and validated at boot; the secret key is never reachable from the client bundle or logs

**Plans:** 4/4 plans complete (46-01, 46-02, 46-04); 46-03 closed as blocked, superseded by the MinIO architecture revision
Plans:

- [x] 46-01-PLAN.md — Migration (FILE enum + submission_files + file_upload_jobs + bytea spool), Prisma parity, `FILE` field plumbing in `src/lib/forms.ts`, `src/lib/file-jobs.ts` bytea helpers; live-DB `prisma migrate deploy` proof
- [x] 46-02-PLAN.md — ~~Drive client, credentials, probe, health branch, instrumentation wire~~ **superseded**: the Drive client, credentials, probe, health branch and instrumentation wire were removed in the MinIO revision; only the `FILE`-independent build/boot lessons carry forward
- [x] 46-03-PLAN.md — ~~Shared Drive prerequisites + live upload proof~~ **blocked and closed**: live API probe returned `NOT_SHARED_DRIVE` (folder `1JFVg1xu4jfFj3ZnOJgP3ShFFiT8dc6r0` has no `driveId`, owned by `kelehhadari@gmail.com`, `drives.list` empty, `canCreateDrives: false`, `storageQuota.limit: "0"`). No Workspace tenant exists, so the requirement cannot be met as written.
- [x] 46-04-PLAN.md - **MinIO replacement** (complete): Drive client/credentials/probe/packages removed; `src/lib/storage.ts` (S3 client, path-style, private bucket, put/get/delete/head, deterministic `buildObjectKey`), `src/lib/storage-probe.ts` + boot wire with degrade-never-crash 60 s re-probe, `/api/health` storage branch, in-place column swap migration, `minio` compose service (digest-pinned, no host port) with a persisted `minio_data` volume, and `scripts/ci-storage-smoke.mjs` — live round-trip byte-identical, anonymous GET refused (`SMOKE_EXIT=0`)

**Research flag**: yes — MinIO container pinning, S3 client package choice (`@aws-sdk/client-s3` + presigner), path-style addressing requirement, and the private-bucket ACL model must be confirmed against a live container before coding (SUMMARY.md Research Flags: F1, rewritten).
**Threats closed**: W1 (real storage round-trip proof — non-negotiable), W10 (credential leak: secret key server-only, never in client bundle or image layers).

### Phase 47: File Field Config, Builder, Editor & Renderer

**Goal**: Admins can add and configure a `File Upload` field, and it appears consistently in the editor, live preview, and public form as an inert placeholder matching the monochrome design system.
**Depends on**: Phase 46
**Requirements**: FILE-06, FILE-07
**Success Criteria** (what must be TRUE):

  1. Admin can pick `File Upload` from the field-type options in `AdminFormEditor` and configure label, required toggle, max size (capped at 10 MB), allowed MIME preset (images + PDF), and max file count
  2. The configured field renders in `AdminFormPreview` and `AttendanceForm` as a dropzone/picker placeholder styled consistently with the existing monochrome design system
  3. The collapsed field card and outline panel show a coherent summary (type pill, required badge, file-count and size-limit hints)
  4. Field config round-trips through the existing field-JSON/settings path (CHECKBOX precedent) — saved, reloaded, and previewed without data loss

**Plans:** 2 plans
Plans:
- [x] 47-01-PLAN.md — Domain model, serialization parity, and Admin Form Editor builder controls
- [x] 47-02-PLAN.md — Monochrome inert dropzone renderer in live preview, public form, and automated tests
**Research flag**: no — mirrors the proven v2.2 `CHECKBOX` enum + editor-config pattern.

### Phase 48: Storage Abstraction & Postgres bytea Spool Layer

**Goal**: A single raw-SQL domain module owns every file record, queue record, and spool byte transition, so no later phase invents its own persistence semantics.
**Depends on**: Phase 46 (parallelizable with Phase 47)
**Requirements**: (supports FILE-02, FILE-03 — no standalone requirement; delivers the storage contract both rely on)
**Success Criteria** (what must be TRUE):

  1. `file-storage.ts` exposes record-upload, list-by-submission, link-to-submission, serve-lookup, claim, mark-synced, mark-failed, and spool-discard operations implemented with `prisma.$queryRaw/$executeRaw`
  2. Storage-status transitions are a defined state machine (`PENDING_UPLOAD → QUEUED → SYNCED`, or `→ FAILED`, or `→ ORPHANED`) and cannot skip a state or resurrect a terminal one
  3. File bytes live in `file_upload_jobs.payload bytea` only — no filesystem path, no volume mount, and a record survives a container recreate because the bytes are in Postgres
  4. All timestamps are stored and compared in a single UTC/TIMESTAMPTZ convention, so expiry and GC decisions do not drift by a day

**Plans**: TBD
**Research flag**: no — raw-SQL module mirrors the existing `src/lib/forms.ts` pattern.
**Threats closed**: W3 (Postgres is the fallback store — no volume), W7 (single UTC convention).

### Phase 49: Public Upload API & Client Upload Component

**Goal**: An anonymous participant can upload a file on `/f/[slug]`, see progress and a preview, remove it before submitting, and still complete their submission when object storage is down.
**Depends on**: Phase 46, Phase 47, Phase 48
**Requirements**: FILE-08, FILE-09, FILE-10, FILE-11, FILE-12
**Success Criteria** (what must be TRUE):

  1. Participant can drag-and-drop or use the file picker on `/f/[slug]`, see upload progress, view an image/PDF preview, and remove a file before submitting — no external drag-and-drop library used
  2. `POST /api/public/files/upload` returns HTTP 400 with a clear message for a file whose bytes contradict its extension (magic-byte mismatch), for size over the configured cap, and for count over the field's maximum — and returns `{fileId}` on success
  3. Upload returns HTTP 200 and a usable `{fileId}` even when MinIO is unreachable; the submission still goes through and the file lands in the local spool queue
  4. Server-side submit validation rejects a submission whose required file field is empty and rejects a `fileId` that does not belong to that upload session
  5. Upload is limited by rate and by bytes-per-window per client IP, and a spoofed `X-Forwarded-For` does not grant a fresh allowance

**Plans**: TBD
**Research flag**: yes — exact Next.js 16 Route Handler body handling and Nginx body/buffering tuning under the `bench` profile must be validated under k6 load (SUMMARY.md Research Flags: F4).
**Threats closed**: W2 (Route Handler, byte caps, spoofable XFF), W6 (magic-byte sniff, not extension), W7 (EXIF strip on images).
**UI hint**: yes

### Phase 50: Sync Worker, Queue Processing, Retry & Orphan GC

**Goal**: Files that landed in the local spool reach MinIO automatically, survive crashes and retries without duplicating, and abandoned uploads stop consuming storage.
**Depends on**: Phase 48, Phase 49
**Requirements**: FILE-13, FILE-14, FILE-15, FILE-16, FILE-25
**Success Criteria** (what must be TRUE):

  1. A queued file is claimed with `FOR UPDATE SKIP LOCKED` and pushed to MinIO exactly once; a crash after the object upload but before the SYNCED marker does not create a duplicate object on the next attempt (deterministic `object_key` + idempotent PUT)
  2. A failing job retries with exponential backoff, gives up at 5 attempts and becomes `FAILED`, and a permanently failing job does not starve other queued jobs
  3. The existing `scripts/submission-worker.mjs` drives file sync automatically alongside submission processing using the same `x-worker-token` — no new container or compose service added
  4. After a file reaches `SYNCED`, its `bytea` payload is nulled so database size stays bounded
  5. A file uploaded but never attached to a submission is swept to `ORPHANED` after its TTL, and its MinIO object and spool bytes are cleaned up

**Plans**: TBD
**Research flag**: no — mirrors the proven `submission_jobs` claim loop while keeping tables separate.
**Threats closed**: W9 (no duplicate objects, no starvation), W8 (orphan/TTL sweep).

### Phase 51: Private File Serving Route

**Goal**: Authenticated admins can retrieve any submission file through the application, and nobody else can — including by guessing IDs, escaping the path, or relying on browser content sniffing.
**Depends on**: Phase 50 (synced branch), Phase 49 (spool branch)
**Requirements**: FILE-17, FILE-18, FILE-19
**Success Criteria** (what must be TRUE):

  1. `GET /api/files/[id]` serves the file for a valid admin session, streaming from MinIO when synced and from the spool when still pending — both paths behind one route
  2. Responses always carry `Content-Disposition: attachment` with a sanitized filename and `X-Content-Type-Options: nosniff`, so an uploaded HTML/SVG cannot execute in the admin origin
  3. A request without a session, with a nonexistent ID, with an ID belonging to a file outside the admin's scope, or with a traversal attempt (`../`) is rejected
  4. No file URL ever points at MinIO or any storage host; the bucket stays private and files are reachable only through the app

**Plans**: TBD
**Research flag**: no — auth-gated route + `Content-Disposition` recipe is documented in PITFALLS.md.
**Threats closed**: W4 (IDOR, traversal, inline-XSS — negative tests required).

### Phase 52: Admin Surfaces & Export Integration

**Goal**: Admins see, download, and add attachments on a submission, and exported spreadsheets carry filename plus app URL — never a storage link, never a live formula.
**Depends on**: Phase 51 (working serving route), Phase 50 (synced and unsynced states)
**Requirements**: FILE-20, FILE-21, FILE-22, FILE-23, FILE-24
**Success Criteria** (what must be TRUE):

  1. The submission detail attachment panel lists each file with name, type, size, an origin tag (participant / admin), a status badge (`Menunggu sinkronisasi` / `Tersinkron`), and a download that goes through `/api/files/[id]`
  2. Admin can add an extra attachment via `POST /api/admin/files/upload` without altering any participant answer
  3. The submissions table shows a file answer as a clickable filename pointing at the app URL, not raw JSON and not a storage URL
  4. Excel export writes `filename + app URL`, prefixes filenames starting with `=`, `+`, `-`, or `@` to defuse formula injection, and the existing 500-row split still holds
  5. Deleting a submission or form removes its file records, spool payloads, and MinIO objects

**Plans**: TBD
**Research flag**: no — export/table formatting follows existing `forms.ts` formatter patterns.
**Threats closed**: W5 (app URLs only, formula sanitize, 500-row split), W8 (delete purges blobs).
**UI hint**: yes

### Phase 53: Hardening, GC Tuning & QA

**Goal**: The whole upload stack is proven safe under load and cheap to operate, and every guard from Phases 46-52 is verified rather than assumed.
**Depends on**: Phases 46-52
**Requirements**: FILE-26, FILE-27, FILE-28, FILE-29
**Success Criteria** (what must be TRUE):

  1. Concurrent large uploads do not OOM the app: body size is bounded explicitly in the route handler and in Nginx, and a parallel-load memory check stays within budget
  2. EXIF/GPS metadata is absent from stored images
  3. Unit tests cover a valid PNG, a valid PDF, a spoofed extension, an oversize file, storage-down → spool → sync, retry with no duplication, and GC TTL — and `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` all pass
  4. `app` and `worker` rebuild per the AGENTS.md protocol (including the new `minio` service with a persisted volume) and `/api/health` returns `status: ok` with the feature live

**Plans**: TBD
**Research flag**: no — cross-cutting verification pass.
**Threats closed**: full W1-W10 re-verification, especially W2 (memory under parallel load) and W7 (EXIF).

## Progress

**Execution Order:**
Phases execute in numeric order: 46 → 47 ∥ 48 → 49 → 50 → 51 → 52 → 53

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 46. Foundation - Schema, Field Plumbing, MinIO Client & Credentials | 4/4 | Complete (46-03 closed; 46-04 delivered MinIO) | 2026-11-16 |
| 47. File Field Config, Builder, Editor & Renderer | 2/2 | Complete | 2026-11-16 |
| 48. Storage Abstraction & Postgres bytea Spool Layer | 0/TBD | Not started | - |
| 49. Public Upload API & Client Upload Component | 0/TBD | Not started | - |
| 50. Sync Worker, Queue Processing, Retry & Orphan GC | 0/TBD | Not started | - |
| 51. Private File Serving Route | 0/TBD | Not started | - |
| 52. Admin Surfaces & Export Integration | 0/TBD | Not started | - |
| 53. Hardening, GC Tuning & QA | 0/TBD | Not started | - |

## Coverage

| Phase | Requirements | Count |
|-------|--------------|-------|
| 46 | FILE-01, FILE-02, FILE-03, FILE-04, FILE-05 | 5 |
| 47 | FILE-06, FILE-07 | 2 |
| 48 | (supports FILE-02, FILE-03 — no standalone requirement) | 0 |
| 49 | FILE-08, FILE-09, FILE-10, FILE-11, FILE-12 | 5 |
| 50 | FILE-13, FILE-14, FILE-15, FILE-16, FILE-25 | 5 |
| 51 | FILE-17, FILE-18, FILE-19 | 3 |
| 52 | FILE-20, FILE-21, FILE-22, FILE-23, FILE-24 | 5 |
| 53 | FILE-26, FILE-27, FILE-28, FILE-29 | 4 |

**Total mapped:** 29/29 v1 requirements. No orphans, no duplicates.

---
*Milestone v2.3 roadmap added: 2026-11-16*
