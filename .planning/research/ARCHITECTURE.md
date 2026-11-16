# Architecture Research — File Upload & Google Drive Storage (v2.3)

**Domain:** Public form builder + submission platform (Next.js 16 App Router, Docker Compose, raw-SQL form engine on PostgreSQL)
**Researched:** 2026-11-16
**Confidence:** MEDIUM-HIGH (integration points HIGH — read from live code; Drive API patterns MEDIUM — standard OAuth2 service-account flow)

Scope: integration points and new components ONLY. Existing `Attendance` / form-builder / worker architecture is taken as-is and must not be redesigned.

---

## Standard Architecture

### System Overview

```
┌──────────────────────────────────────────────────────────────┐
│                         Browser (client)                      │
│  AttendanceForm.tsx  (FILE field render + pre-submit upload)   │
│  AdminFormSubmissions.tsx (attachments panel + admin upload)   │
└───────────────┬───────────────────────────────┬───────────────┘
                │ multipart/form-data            │ GET /api/files/:id
                │ (file bytes)                   │ (admin-gated proxy)
┌───────────────▼───────────────────────────────▼───────────────┐
│                    Next.js app (port 3456)                     │
│  POST /api/public/files/upload        ← new public multipart   │
│  POST /api/admin/files/upload         ← new admin multipart    │
│  GET  /api/files/[id]                 ← new private serving    │
│  POST /api/internal/submission-jobs/process  (existing, +ext)  │
│                                                                │
│  src/lib/file-storage.ts   ← NEW domain module (raw SQL)       │
│  src/lib/google-drive.ts   ← NEW service-account client        │
│  src/lib/file-spool.ts     ← NEW local filesystem spool        │
└───────────┬──────────────────┬──────────────────┬─────────────┘
            │ $queryRaw/$exec  │ local fs (volume) │ Google Drive API
┌───────────▼───────┐  ┌───────▼──────────┐  ┌────▼─────────────┐
│   PostgreSQL      │  │  /data/spool     │  │ Google Drive     │
│   submission_files│  │  volume (shared) │  │ (service acct)   │
│   file_sync_jobs  │  │  app + worker    │  │ private folder   │
└───────────────────┘  └──────────────────┘  └──────────────────┘
            ▲
            │ status=PENDING rows claimed
┌───────────┴───────────────────────────────────────────────────┐
│              worker container (scripts/)                       │
│  submission-worker.mjs (existing)                              │
│  file-sync-worker.mjs  ← NEW polling loop (same token model)   │
│  OR: extend submission-worker to call both endpoints           │
└────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `src/lib/google-drive.ts` (NEW) | Service-account auth, upload/resolve/stream to Drive folder | `googleapis` `drive_v3` with `google.auth.JWT` from `GOOGLE_SERVICE_ACCOUNT_JSON` + `GOOGLE_DRIVE_FOLDER_ID` |
| `src/lib/file-spool.ts` (NEW) | Read/write/delete local spool files, path scheme, atomic rename | `node:fs/promises`, path `${FILE_SPOOL_DIR}/<submissionId>/<fileId>` |
| `src/lib/file-storage.ts` (NEW) | Domain: record upload, list by submission, serve lookup, queued processing, sync state | Raw SQL via `prisma.$queryRaw/$executeRaw` (mirrors `forms.ts` style) |
| `src/lib/forms.ts` (MODIFIED) | Wire FILE field into validation + submission answer persistence | Add `'file'` to `FormFieldType` union; branch in `validateFormSubmission` |
| `src/app/api/public/files/upload/route.ts` (NEW) | Public multipart intake, rate-limit by IP, validate, spool, enqueue | `request.formData()`, reuse `rateLimit`/`getClientIp` |
| `src/app/api/files/[id]/route.ts` (NEW) | Private file serving; admin session gate; proxy/stream | `getAdminSession()`, stream from spool or pipe Drive download |
| `src/app/api/admin/files/upload/route.ts` (NEW) | Admin extra attachment upload bound to existing submissionId | `getAdminSession()`, same validation |
| `scripts/file-sync-worker.mjs` (NEW) or extended `scripts/submission-worker.mjs` (MODIFIED) | Poll file sync endpoint, retry with backoff | Same `x-worker-token` + batch pattern as submission worker |
| `src/app/api/internal/file-sync-jobs/process/route.ts` (NEW) | Claim `file_sync_jobs` with `FOR UPDATE SKIP LOCKED`, push to Drive, update status | Mirrors `submission-jobs/process/route.ts` |
| `src/components/FileUploadField.tsx` (NEW) | Drag-drop + picker + progress + preview + remove-before-submit | Native `<input type="file">`, `XMLHttpRequest` for upload progress (fetch lacks upload progress) |
| `src/components/FileAttachmentsPanel.tsx` (NEW) | Admin submission detail: list files, download links, add-file upload | `fetch` + list from `GET /api/admin/forms/[id]/submissions` (extended payload) |
| `AdminFormEditor.tsx` (MODIFIED) | FILE field config: label, required, maxSize, accepted types, maxFiles | Add FILE to type selector + config card |

---

## Recommended Project Structure (additions only)

```
src/
├── lib/
│   ├── google-drive.ts        # NEW — service-account Drive client (cached JWT)
│   ├── file-spool.ts          # NEW — local fs spool helpers
│   ├── file-storage.ts        # NEW — raw-SQL file domain logic
│   ├── forms.ts               # MODIFIED — FILE field in validation + submission flow
│   └── rate-limit.ts          # unchanged (reused)
├── app/api/
│   ├── public/files/upload/route.ts     # NEW
│   ├── admin/files/upload/route.ts      # NEW
│   ├── files/[id]/route.ts              # NEW
│   └── internal/file-sync-jobs/process/route.ts  # NEW
├── components/
│   ├── FileUploadField.tsx               # NEW
│   └── FileAttachmentsPanel.tsx          # NEW
prisma/
└── migrations/
    └── 2026XXXXXXXXXX_add_submission_files/migration.sql  # NEW
scripts/
├── submission-worker.mjs      # MODIFIED (or unchanged) — see worker section
└── file-sync-worker.mjs       # NEW (if separate loop chosen)
```

### Structure Rationale

- **`src/lib/file-storage.ts` mirrors `forms.ts`:** same raw-SQL style keeps the domain engine centralized and avoids a second ORM access pattern. `file-*.ts` split keeps Drive SDK (heavy, external) isolated from spool fs and from SQL.
- **Route handlers stay thin:** public/admin/internal split matches the existing `/api/public`, `/api/admin`, `/api/internal` convention. No new patterns.
- **Spool lives in `src/lib`, not `scripts`:** both app (write during upload) and worker (read during sync) touch it → it is app code, not ops-only.

---

## Data Flow

### Flow 1 — Public participant uploads a FILE (deferred-upload pattern)

```
Participant picks file
    ↓
FileUploadField → POST /api/public/files/upload (multipart)
    ↓
validate mime + size (server, allowlist from field config)
    ↓
rateLimit(`upload:${ip}`)  ← reuse existing in-memory limiter
    ↓
write to spool: ${FILE_SPOOL_DIR}/spool/<fileId>.bin  (atomic: .part → rename)
    ↓
INSERT submission_files (status=PENDING_UPLOAD, local_path, checksum, mime, size)
    ↓
INSERT file_sync_jobs (status=PENDING)
    ↓
return { fileId }  → client holds fileId in form state
    ↓
Form submit (existing JSON POST) includes fileId for that field name
    ↓
validateFormSubmission: field type 'file' → verify fileId exists & unbound, link submissionId
```

**Key decision — deferred upload, not single mega-multipart-submit.**
Upload files FIRST to `/api/public/files/upload`, get back `{fileId}` per file, then submit the existing JSON form payload with `fieldName → [fileId, ...]`. Reasons:
- The existing submit route is `JSON.stringify(formData)` and `request.json()`. A single multipart submit would force rewriting the entire public form submit path (client + server + validation). Deferred upload touches only a NEW endpoint.
- Preserves "Drive failure must not block submission": files are already spooled + queued before submit; submit itself never waits on Drive.
- Enables remove-before-submit (client just drops the fileId; orphan spool row cleaned by worker sweep).

Orphan safety: files uploaded but never attached to a submission stay `status=ORPHANED_PENDING`; a sweep deletes spool files + rows after TTL (e.g. 24h) with no `submission_id`. Prevents spool growth from abandoned forms.

### Flow 2 — Drive sync (existing worker pattern extension)

```
Worker loop → POST /api/internal/file-sync-jobs/process?batch=N  (x-worker-token)
    ↓
Claim: SELECT ... FROM file_sync_jobs WHERE status='PENDING' AND available_at<=NOW()
       FOR UPDATE SKIP LOCKED  (exact mirror of submission jobs)
    ↓
For each: read spool file → upload to Drive (googleapis) → get drive_file_id
    ↓
UPDATE submission_files SET status='SYNCED', drive_file_id=...
UPDATE file_sync_jobs SET status='COMPLETED'
    ↓
On error: attempts++, status stays PENDING with exponential backoff,
          status='FAILED' after 5 attempts + last_error
```

The worker container already exists with the token + batch model. Two options (recommend Option A):

- **A — Extend `scripts/submission-worker.mjs`:** after `processBatch()` for submissions, call the file endpoint too. One container, one loop, no compose service churn. Slightly higher coupling.
- **B — New `scripts/file-sync-worker.mjs` + new compose service:** cleaner separation, but adds a 5th compose service and must be added to `docker-compose.yml` (app/worker/bench). More changes to rebuild protocol.

Recommend **A** for v2.3: minimal compose/Dockerfile changes, reuses `scripts/` copy in Dockerfile already present.

### Flow 3 — Private file serving (admin only)

```
Admin clicks file in FileAttachmentsPanel → GET /api/files/[id]
    ↓
getAdminSession()  ← redirect/401 if null
    ↓
SELECT submission_files WHERE id → check status
    ├─ SYNCED      → stream Drive download via googleapis (keep creds server-side)
    └─ NOT SYNCED  → stream local spool file (readable until synced AND)
    ↓
Response: stream with Content-Type, Content-Disposition: attachment; filename=...
```

**Key decision — proxy/stream through app, NOT redirect-to-Drive.**
- Requirement says "no anyone-with-link" + "akses hanya via aplikasi (redirect terproteksi)". A Drive "webViewLink" or short-lived redirect would leak the Drive-hosted URL and requires per-file Drive permission management for the admin's Google account — the service account owns the file, so granting the admin is an extra `permissions.create` round-trip per request.
- Streaming through the app keeps Drive credentials server-side, works identically for NOT-YET-SYNCED local files (single code path), and keeps auth logic in one place (`getAdminSession`). Cost: file bytes traverse app. Acceptable for ≤10 MB admin downloads.
- Public participants never fetch files back, so app bandwidth is admin-only.

---

## DB Schema

New migration `prisma/migrations/<ts>_add_submission_files/migration.sql` + mirror the model in `prisma/schema.prisma` (keep both in sync — project rule). Raw SQL in `file-storage.ts` is the actual access path; Prisma model is for types/migrations parity.

```sql
-- Enum for file lifecycle
CREATE TYPE "FileStorageStatus" AS ENUM ('PENDING_UPLOAD','QUEUED','SYNCED','FAILED','ORPHANED');
CREATE TYPE "FileSyncStatus"   AS ENUM ('PENDING','PROCESSING','COMPLETED','FAILED');

CREATE TABLE IF NOT EXISTS "submission_files" (
  "id"             TEXT NOT NULL,
  "submission_id"  TEXT,                       -- NULL until attached to a submit (orphan window)
  "form_id"        TEXT NOT NULL,
  "field_id"       TEXT,                       -- which FILE field; NULL for admin-added extras
  "original_name"  TEXT NOT NULL,
  "mime_type"      TEXT NOT NULL,
  "size_bytes"     BIGINT NOT NULL,
  "checksum_sha256" TEXT NOT NULL,
  "storage_status" "FileStorageStatus" NOT NULL DEFAULT 'PENDING_UPLOAD',
  "drive_file_id"  TEXT,                        -- Google Drive file id once SYNCED
  "drive_folder_id" TEXT,                       -- for diagnostics / re-resolution
  "local_path"     TEXT,                        -- spool path; NULLed after Drive confirm (optional)
  "uploaded_by"    TEXT,                        -- 'public' | admin email (for admin extras)
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "submission_files_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "submission_files_submission_fkey" FOREIGN KEY ("submission_id")
    REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "submission_files_form_fkey" FOREIGN KEY ("form_id")
    REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "submission_files_field_fkey" FOREIGN KEY ("field_id")
    REFERENCES "form_fields"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "submission_files_submission_idx" ON "submission_files"("submission_id");
CREATE INDEX IF NOT EXISTS "submission_files_status_idx"     ON "submission_files"("storage_status");
CREATE INDEX IF NOT EXISTS "submission_files_form_idx"       ON "submission_files"("form_id");

CREATE TABLE IF NOT EXISTS "file_sync_jobs" (
  "id"          TEXT NOT NULL,
  "file_id"     TEXT NOT NULL,
  "status"      "FileSyncStatus" NOT NULL DEFAULT 'PENDING',
  "attempts"    INTEGER NOT NULL DEFAULT 0,
  "last_error"  TEXT,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "file_sync_jobs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "file_sync_jobs_file_fkey" FOREIGN KEY ("file_id")
    REFERENCES "submission_files"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "file_sync_jobs_file_id_key" ON "file_sync_jobs"("file_id");
CREATE INDEX IF NOT EXISTS "file_sync_jobs_status_available_idx"
  ON "file_sync_jobs"("status", "available_at", "created_at");
```

Why this shape:
- Separate `storage_status` (file) and `file_sync_jobs.status` (queue) mirrors the existing `submissions` vs `submission_jobs` split — same mental model, same `FOR UPDATE SKIP LOCKED` claim.
- `submission_id NULL` supports both deferred-upload orphan window AND admin-added attachments on existing submissions.
- `field_id NULL` allows admin "lampiran tambahan" not tied to a configured FILE field.
- `local_path` retained after sync is optional; keep until Drive confirms, then null or leave for rollback. Recommend keep (cheap) — enables re-sync if Drive file is deleted.

Also modify role: add `'FILE'` to `FieldType` enum + `FieldType` type union in `forms.ts` + `mapFieldType`/`mapFormFieldTypeToDb` + `FormField` union + `validateFormSubmission` branch. New field config (`maxSizeBytes`, `acceptedMimeTypes`, `maxFiles`) stores in the existing `settings`/field JSON path — inspect how CHECKBOX stored its extra config; follow the same mechanism (likely a `settingsJson` sub-key or field JSON, not new columns).

---

## Docker / Volume Decision

**Spool must be a shared named volume mounted into BOTH `app` and `worker`:**

```yaml
# docker-compose.yml (MODIFIED)
services:
  app:
    volumes:
      - filespool:/data/spool
  worker:
    volumes:
      - filespool:/data/spool
volumes:
  filespool:
```

Rationale:
- **Named volume over bind mount:** works identically on Windows dev (Docker Desktop) and Linux prod, survives container recreate, no host-path permission drift with the `nextjs` UID 1001 user. Bind mount to a host dir is fragile on Windows and breaks the "targeted rebuild without touching data" pattern.
- **Must be shared:** app writes spool on upload; worker reads spool to push to Drive. If only app-mounted, worker can't read; if only worker-mounted, upload fails. Both.
- Env: `FILE_SPOOL_DIR=/data/spool` in shared `x-app-env` anchor. Dockerfile `runner` stage must `RUN mkdir -p /data/spool && chown nextjs:nodejs /data/spool` so UID 1001 can write (volume inherits image dir ownership on first mount).
- Size/cleanup: worker sweeps ORPHANED + FAILED-old spool files; document volume growth expectation (10 MB × files).
- **bench profile:** bench app replicas share the same volume only if each app-bench-N gets `- filespool:/data/spool`. Add it to the `*benchmark-app` anchor if bench uploads are tested; otherwise file upload is excluded from bench (acceptable — load test targets submit, not file).

---

## Integration Points

### Existing files — MODIFIED (explicit)

| File | Change | Risk |
|------|--------|------|
| `src/lib/forms.ts` | Add `'file'` to `FormFieldType` union (line 31) + `FieldType` union (line 27); `mapFieldType` + `mapFormFieldTypeToDb` + `FILE` cases; `FileField` interface; `validateFormSubmission` branch (insert around line 1851); link fileIds to submission on submit; `listAdminFormSubmissions`/`getAdminFormSubmissions` return attached files per answer | MEDIUM — core engine; keep raw SQL style |
| `prisma/schema.prisma` | Add `SubmissionFile` + `FileSyncJob` models + `FileStorageStatus`/`FileSyncStatus` enums; add `FILE` to `FieldType` | LOW |
| `prisma/migrations/<new>/migration.sql` | NEW table DDL + `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE'` (follow `20261001000000_add_checkbox_field_type` pattern) | LOW |
| `docker-compose.yml` | Add `filespool` volume + mounts on `app`/`worker`; add `FILE_SPOOL_DIR`, `GOOGLE_SERVICE_ACCOUNT_JSON`/path, `GOOGLE_DRIVE_FOLDER_ID` to `x-app-env`; optionally bench mount | MEDIUM — env required-when-file-enabled; use `${VAR:-}` default-empty to not break non-file deploys |
| `Dockerfile` | `RUN mkdir -p /data/spool && chown nextjs:nodejs /data/spool`; add build-time placeholder envs for Google/Drive (so `npm run build` module-eval doesn't throw) | MEDIUM — build-time env pattern already established |
| `.env.example` | Document `GOOGLE_SERVICE_ACCOUNT_JSON` (or `..._FILE` path), `GOOGLE_DRIVE_FOLDER_ID`, `FILE_SPOOL_DIR`, `FILE_UPLOAD_MAX_BYTES` | LOW |
| `scripts/submission-worker.mjs` | Option A: after submission batch, call `/api/internal/file-sync-jobs/process` | LOW |
| `src/components/AttendanceForm.tsx` | Render `FileUploadField` for `field.type === 'file'`; collect fileIds into formData as JSON array under field name; block submit until uploads settle in client | MEDIUM — big component, add minimal branching |
| `src/components/AdminFormEditor.tsx` | FILE option in field-type selector + config (label/required/maxSize/acceptedTypes/maxFiles) | MEDIUM |
| `src/components/AdminFormSubmissions.tsx` | File column rendering (name + app download link), mount `FileAttachmentsPanel` for detail | MEDIUM |
| `src/lib/forms.ts` export | File column exports app URL (`/api/files/<id>`) not Drive URL | LOW |
| `next.config.ts` | No change needed (googleapis resolved at runtime; add to `serverExternalPackages` if bundling issues — likely add `"googleapis"`) | LOW |

### Existing files — read/reuse, NOT modified

- `src/lib/rate-limit.ts` → import `rateLimit`/`getClientIp` in upload route (do not change it).
- `src/lib/auth.ts` → `getAdminSession()` gate in `/api/files/[id]` and admin upload.
- `src/app/api/internal/submission-jobs/process/route.ts` → template to copy for file-sync route.
- `src/lib/env.ts` → `readRequiredEnv` in Drive config.
- `src/lib/prisma.ts` → shared client.

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Google Drive API v3 | `googleapis` `drive_v3` + `google.auth.JWT({scopes:['https://www.googleapis.com/auth/drive']})` from service-account JSON | Service account creates files in `GOOGLE_DRIVE_FOLDER_ID`; folder must be shared with the SA email (Editor). Files owned by SA, private. Cache JWT/scoped client at module level (global, like Prisma). `googleapis` is a heavy dep — install; confirm it works with Next standalone (add to `serverExternalPackages` if needed). |
| Drive folder layout | Optional subfolders per form: `<root>/<formId>/<submissionId>/<file>` — resolve-or-create with a cached folderId map | Keep flat in root for v2.3 simplicity; subfolders = deferred optimization |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Public upload route ↔ `file-storage` | direct fn call | route validates http/multipart only; domain validates business rules |
| `file-storage` ↔ `google-drive` | direct fn call, only from sync processor (worker path) | Never call Drive from upload route (Drive failure must not block upload → spool+queue) |
| Sync route ↔ `submission_files`/`file_sync_jobs` | raw SQL `FOR UPDATE SKIP LOCKED` | identical claim semantics to submission jobs |
| App ↔ Worker ↔ spool | shared named volume | single source of bytes between write (app) and Drive push (worker) |
| `/api/files/[id]` ↔ storage | stream | must handle two backends (spool file / Drive stream) behind one response |

---

## Anti-Patterns

### Anti-Pattern 1: Direct browser → Drive upload
**What people do:** mint a signed upload URL / use Drive API from the browser with a token.
**Why it's wrong:** service-account creds must never reach the browser; Drive V3 has no clean browser resumable upload for SA-owned private files without exposing tokens; bypasses server-side mime/size validation and rate limiting; breaks the local-queue fallback (browser can't spool server-side). Violates "validasi tipe & ukuran server-side".
**Do this instead:** browser → app (`/api/public/files/upload`), app validates + spools + queues, worker syncs to Drive.

### Anti-Pattern 2: Blocking submit on Drive success
**What people do:** upload to Drive synchronously inside the submit handler; fail the submission if Drive errors.
**Why it's wrong:** violates explicit requirement "Kegagalan Drive tidak boleh memblokir submission"; Drive latency/outage becomes form outage.
**Do this instead:** spool + enqueue, submit immediately, worker syncs with retry/backoff; UI shows `PENDING` vs `SYNCED`.

### Anti-Pattern 3: Redirect-to-Drive for private serving
**What people do:** return Drive `webViewLink` or a redirect after granting per-request permissions.
**Why it's wrong:** leaks Drive URL, requires per-file permission grants, two code paths (synced via Drive / unsynced via local), inconsistent auth.
**Do this instead:** proxy/stream through `/api/files/[id]` behind `getAdminSession()`; one download path for both synced and pending files.

### Anti-Pattern 4: Bind-mount spool to host path
**What people do:** mount `./spool:/data/spool` for easy inspection.
**Why it's wrong:** Windows Docker permission quirks with UID 1001, breaks targeted rebuild safety, host-path coupling.
**Do this instead:** named volume `filespool` shared app+worker.

### Anti-Pattern 5: New storage engine separate from `forms.ts` patterns
**What people do:** introduce Prisma `create/update` ORM calls or a second ORM just for files.
**Why it's wrong:** project rule — form-builder tables are migration-managed SQL via `$queryRaw`; mixing paradigms causes schema drift.
**Do this instead:** `file-storage.ts` raw SQL mirroring `forms.ts`; Prisma schema kept only for migration/type parity.

---

## Suggested Build Order

Dependency-ordered; each step independently verifiable with `npm run lint && npx tsc --noEmit && npm run build`.

1. **Schema + enums foundation** — migration SQL (`submission_files`, `file_sync_jobs`, `ALTER TYPE FieldType ADD 'FILE'`) + `prisma/schema.prisma` models; `npx prisma generate`. Depends on: nothing. Unblocks everything.
2. **Field type plumbing** — `forms.ts` union members, `mapFieldType`/`mapFormFieldTypeToDb`, `FileField` interface, form-editor FILE selector + config, preview render. Depends on (1). Lets a FILE field exist & render.
3. **Spool + Drive clients** — `file-spool.ts`, `google-drive.ts` (with JWT cache, folder resolve), env wiring in `.env.example` + Dockerfile placeholders. Depends on nothing (pure helpers). Testable in isolation.
4. **Public upload route + client component** — `POST /api/public/files/upload` (validate/rate-limit/spool/INSERT/enqueue), `FileUploadField.tsx` (progress via XHR), integrate into `AttendanceForm.tsx`, deferred-upload → submit linking + `validateFormSubmission` file branch. Depends on (1)(2)(3). Core public flow.
5. **Sync worker + queue processing** — `POST /api/internal/file-sync-jobs/process` (claim/upload/update) + extend `submission-worker.mjs`; Dockerfile/compose `filespool` volume + env. Depends on (1)(3). Pending → SYNCED.
6. **Private serving route** — `GET /api/files/[id]` with `getAdminSession()`, dual backend (spool/Drive stream). Depends on (1)(3)(5) for synced path; local path testable at (4).
7. **Admin surfaces** — `AdminFormSubmissions.tsx` file column + `FileAttachmentsPanel.tsx` + `POST /api/admin/files/upload`; export column shows app URL. Depends on (5)(6).
8. **Hardening + QA** — orphan sweep, retry/backoff tuning, `filespool` cleanup, bench decision, Docker targeted rebuild (`app`, `worker`), health check, tests (`forms.test.ts` + new `file-storage.test.ts`). Depends on all.

Critical path: 1 → 2/3 (parallel) → 4 → 5 → 6 → 7 → 8. Phases 2 and 3 are parallelizable; 4 needs both.

---

## New vs Modified — Quick Index

**NEW (10):**
- `prisma/migrations/<ts>_add_submission_files/migration.sql`
- `src/lib/google-drive.ts`
- `src/lib/file-spool.ts`
- `src/lib/file-storage.ts`
- `src/app/api/public/files/upload/route.ts`
- `src/app/api/admin/files/upload/route.ts`
- `src/app/api/files/[id]/route.ts`
- `src/app/api/internal/file-sync-jobs/process/route.ts`
- `src/components/FileUploadField.tsx`
- `src/components/FileAttachmentsPanel.tsx`

**MODIFIED (9):**
- `prisma/schema.prisma`
- `src/lib/forms.ts`
- `src/components/AttendanceForm.tsx`
- `src/components/AdminFormEditor.tsx`
- `src/components/AdminFormSubmissions.tsx`
- `scripts/submission-worker.mjs`
- `docker-compose.yml`
- `Dockerfile`
- `.env.example`
- (conditional) `next.config.ts` if `googleapis` needs `serverExternalPackages`

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Current (single app, in-memory rate limit) | Named volume spool + in-process/worker queue is sufficient. `RATE_LIMIT_SINGLE_INSTANCE_OK=true`. |
| Multi-instance (`bench` profile) | In-memory rate limit already unsafe (existing caveat). Spool volume must be mounted per replica or uploads land on the wrong node — either keep file upload off bench, or move spool to shared storage. Drive sync worker per app is fine (SKIP LOCKED dedupes). |
| High volume | Drive API quota (per-SA ~12k req/100s) becomes limit; batch + backoff already in sync processor. Consider N workers with SKIP LOCKED. |

### Scaling Priorities

1. **First bottleneck:** in-memory upload rate limit across replicas → replace with shared limiter (already a known project caveat, not new to v2.3).
2. **Second bottleneck:** spool volume size from orphans → TTL sweep mandatory (build step 8).
3. **Third:** Drive API quota → batch size tuning on `file_sync_jobs`.

---

## Sources

- Existing codebase (HIGH): `src/lib/forms.ts`, `src/app/api/public/forms/[slug]/submit/route.ts`, `src/app/api/internal/submission-jobs/process/route.ts`, `scripts/submission-worker.mjs`, `src/lib/auth.ts`, `src/lib/rate-limit.ts`, `src/lib/prisma.ts`, `src/lib/env.ts`, `prisma/schema.prisma`, `prisma/migrations/*`, `Dockerfile`, `docker-compose.yml`, `next.config.ts`, `.env.example`
- Google Drive API v3 (MEDIUM — standard pattern): service-account JWT with `drive` scope, `googleapis` `drive.files.create` with multipart media, folder shared to SA email
- Project rules (HIGH): AGENTS.md — raw-SQL form tables, thin routes, worker token pattern, targeted rebuild protocol, Docker named volumes

---

*Architecture research for: File Upload & Google Drive Storage milestone v2.3*
*Researched: 2026-11-16*
