# Stack Research

**Domain:** File upload (image/PDF, ≤10 MB) + Google Drive storage for Next.js 16 App Router app
**Researched:** 2026-11-16
**Confidence:** HIGH

Scope: NEW capabilities for milestone v2.3 only. Existing stack (Next.js 16, React 19, Prisma 7, PostgreSQL, NextAuth 4, Docker node:22-alpine standalone, Vitest, `scripts/submission-worker.mjs` + internal job route) is fixed — not re-researched.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `@googleapis/drive` | 27.1.0 | Drive v3 client (upload, get, delete, permissions) | Only Drive v3 typings + client needed. Unpacked **2.5 MB** vs full `googleapis` **246 MB** — 100× smaller. Standalone build copies only what's traced; full package would bloat image and `npm ci` time. |
| `google-auth-library` | 11.3.4 | `GoogleAuth` / `JWT` service-account credential + token refresh | Required for service-account auth. Already pulled in transitively by `@googleapis/drive` (via `googleapis-common`), so declare explicitly to pin + import directly. `engines: node >=22` — matches runtime exactly. |
| `googleapis` (full) | — | ❌ NOT used | See What NOT to Use. |

Service account flow (verified against googleworkspace/node-samples, Drive v3 docs):

```ts
// src/lib/drive.ts — instantiate ONCE per process, cache the client
import { GoogleAuth } from 'google-auth-library'
import { drive, type drive_v3 } from '@googleapis/drive'

let cached: drive_v3.Drive | null = null

export function getDriveClient(): drive_v3.Drive {
  if (cached) return cached
  const auth = new GoogleAuth({
    // Service-account JSON from env. Prefer split fields over a JSON blob
    // because .env.production multi-line values are painful in compose.
    credentials: {
      client_email: process.env.GOOGLE_SA_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_SA_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })
  cached = drive({ version: 'v3', auth })
  return cached
}
```

Key auth facts (HIGH confidence — official docs):
- **Scope `drive.file`** is enough: lets the SA create/manage only files it created. Do NOT request full `drive` scope — `drive.file` is the least-privilege scope that still allows create/update/delete of app-owned files.
- **No domain-wide delegation needed.** Files land in the SA's own Drive (or a Shared Drive folder the SA is added to as member). Set `GOOGLE_DRIVE_FOLDER_ID` + share that folder with the SA's `client_email` (Editor). This is the standard "upload to a company folder via SA" pattern without impersonation.
- **Private access**: SA-created files are owned by the SA and have **no `anyone` permission** by default. Do NOT call `permissions.create` with `type: 'anyone'`. Download stays server-proxied through our own `/api/files/[id]` route. Fits the milestone's "no anyone-with-link" requirement natively.
- **`private_key` newline escaping**: env-stored PEM keys carry literal `\n`. Must `.replace(/\\n/g, '\n')` before constructing credentials, else auth fails with `error:0909006C:PEM routines`.
- `GoogleAuth` instances self-refresh access tokens; cache the single `Drive` client module-scoped (Next.js dev hot-reload caveat below).

### Upload Strategy

Drive v3 upload types (verified: developers.google.com/drive/api/guides/manage-uploads):

| Type | Limit | Use when |
|------|-------|----------|
| Simple `uploadType=media` | ≤5 MB | No metadata, throwaway name — not needed |
| **Multipart `uploadType=multipart`** | **≤5 MB** | File + metadata in one request — **use for files ≤5 MB** |
| Resumable `uploadType=resumable` | any, resumable | Files >5 MB, flaky nets, progress bars |

**Recommendation: multipart for `size ≤ 5 MB`, resumable for `5 MB < size ≤ 10 MB`.** Our cap is 10 MB, so both paths exist. `@googleapis/drive` handles the two automatically: pass `media.body` as a Buffer/stream and it defaults multipart for small, or set `uploadType` implicitly. For files >5 MB it is safer to explicitly request resumable.

```ts
const drive = getDriveClient()
const res = await drive.files.create({
  requestBody: {
    name: storageName,                        // e.g. `${uuid}.pdf`
    parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
    mimeType,
    appProperties: { submissionId, fieldId }, // lets us locate orphaned files later
  },
  media: { mimeType, body: bufferOrStream },
  fields: 'id,name,size,mimeType,webViewLink',
})
```

- Buffer vs stream: 10 MB max fits comfortably in a Buffer. Use Buffer for ≤10 MB — simpler, no stream lifecycle. Stream only if we ever raise the cap.
- **Do not** use `webContentLink`/`webViewLink` in the UI — those expose Drive. Store only `drive_file_id`; UI links point to our `/api/files/[id]`.
- Delete: `drive.files.delete({ fileId })`. SA can delete files it owns; fine for cleanup.

### Download / Serving (app-proxied, private)

Verified Node pattern (developers.google.com/drive/api/guides/manage-downloads):
```ts
const res = await drive.files.get(
  { fileId, alt: 'media' },
  { responseType: 'stream' }
)
return new Response(res.data as unknown as ReadableStream, {
  headers: { 'Content-Type': mimeType, 'Content-Disposition': `inline; filename="..."` },
})
```
App Router route handlers return a `Response` — piping the Drive `Readable` stream works. Local fallback reads the spooled file from disk with `fs.createReadStream`.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `file-type` | 22.3.0 | Magic-byte MIME sniffing (not trusting `Content-Type`) | Validate uploads server-side before Drive. **ESM-only** (`"type": "module"`) — import inside route handlers/`src/lib`, already ESM-compatible. `engines: node >=22`. |
| `sharp` | 0.35.5 | (Optional) image re-encode / strip EXIF / generate thumbnails | Only if we re-encode images for safety or need preview thumbnails. Heavy native dep — adds ~30 MB + libvips to alpine. **Defer** unless thumbnails are a hard requirement; `file-type` alone suffices for validation. |

Validation logic (`file-type`):
```ts
import { fileTypeFromBuffer } from 'file-type'
const sniffed = await fileTypeFromBuffer(buffer) // { ext, mime } | undefined
const ALLOWED = new Set(['image/jpeg','image/png','image/webp','application/pdf'])
if (!sniffed || !ALLOWED.has(sniffed.mime)) throw new ValidationError('Tipe file tidak didukung')
```
`Content-Type` header and filename extension are attacker-controlled — never trust them; sniff bytes.

### Local Spool / Queue Storage — Decision

Requirement: "Drive failure must not block submission — file goes to local queue and syncs later."

**Two candidate stores: filesystem volume vs Postgres bytea/large objects.**

| Store | Verdict | Rationale for THIS app |
|-------|---------|------------------------|
| **Postgres `bytea` column** | ✅ **RECOMMENDED** | App runs multi-instance (`app-bench-1..4` in `docker-compose.yml` `bench` profile) with **no shared FS volume**. A filesystem spool on `app` would be invisible to other instances and lost on `--no-deps` container recreate. Postgres is the only state all instances + worker already share. Files ≤10 MB fit `bytea` trivially (TOAST compresses/offloads). Query-then-upload in the same worker keeps everything one datastore. |
| Filesystem volume | ❌ | Requires new named volume mounted identically into `app` + all `app-bench-*` + `worker`; breaks the "shared nothing, only DB" topology; orphan-file cleanup on container recreate; `nextjs` uid 1001 writes must own the mount. Extra ops surface for zero benefit at 10 MB. |
| PG large objects (`lo_*`) | ❌ | 2 GB ceiling irrelevant (cap is 10 MB); lo API needs transaction-scoped handles, painful via Prisma raw SQL; streaming benefit unused. Plain `bytea` is simpler. |

Spool table (raw SQL migration, consistent with existing form-builder tables in `prisma/migrations/`):
```sql
CREATE TABLE file_upload_jobs (
  id              text PRIMARY KEY,
  file_id         text NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'PENDING', -- PENDING | PROCESSING | DONE | FAILED
  attempts        int  NOT NULL DEFAULT 0,
  last_error      text,
  payload         bytea NOT NULL,        -- raw bytes while PENDING; NULLed after Drive sync
  payload_mime    text NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX file_upload_jobs_status_idx ON file_upload_jobs (status, created_at);
```
After successful Drive upload: set `status='DONE'`, `payload=NULL`, store `drive_file_id` on `uploaded_files`. This gives automatic cleanup (no payload accrues for synced files) and a bounded backlog (unsynced only).

**Sync worker**: extend the existing job-processing pattern — add `processQueuedFileUploadJobs(batch)` in `src/lib/forms.ts` (or a new `src/lib/file-sync.ts`), expose `POST /api/internal/file-upload-jobs/process` guarded by the same `x-worker-token`, and have `scripts/submission-worker.mjs` call it in the same polling loop (add a second `fetch` per tick). This reuses the proven worker infra — the worker is already a thin HTTP trigger, so file sync runs inside the app process, no new process, no new token. No change to the worker's launch contract.

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| `file-type` | Byte-sniffing in unit tests + runtime | Add Vitest cases: valid PNG, PDF, spoofed extension (exe renamed .png), oversize (>10 MB). |
| Vitest | Existing suite (4.1.5) | Keep. No new test runner. |
| `googleapis` typed client in tests | Mock `drive.files.create/get/delete` | Use `vi.mock('@/lib/drive')`; never hit real Drive in CI. |

---

## Installation

```bash
# Core (Drive upload + auth)
npm install @googleapis/drive@^27.1.0 google-auth-library@^11.3.4

# Supporting (server-side MIME validation)
npm install file-type@^22.3.0

# # Optional — only if image re-encode/thumbnails required
# npm install sharp@^0.35.5
```

No dev-dependency changes required.

New env vars (extend `.env.example`, `.env.production`, `docker-compose.yml` `app-env`, and Dockerfile build-time placeholders):
```
GOOGLE_SA_CLIENT_EMAIL=...@....iam.gserviceaccount.com
GOOGLE_SA_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
GOOGLE_DRIVE_FOLDER_ID=1AbC...
MAX_UPLOAD_BYTES=10485760
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `@googleapis/drive` (2.5 MB) | `googleapis` full (246 MB) | Never for this app — only rationale is familiarity, cost is image size + `npm ci` time. |
| `@googleapis/drive` typed client | `google-auth-library` + raw `fetch` to Drive REST | If you want zero gaxios dependency. Loses typings, retry, auto-`alt=media`, multipart boundary handling. Not worth it here. |
| Postgres `bytea` spool | Filesystem volume (`local-uploads/`) | Only if app were single-instance and image had a persistent mount. Current `bench` profile (4 instances) rules it out. |
| Multipart+resumable by size | Always-resumable | Resumable costs one extra request; fine to always use if you later add >10 MB or progress UI. At 10 MB cap, size-based split is optimal. |
| Server-proxied download (`/api/files/[id]`) | `webViewLink` / signed "anyone" link | Never — violates "private, no anyone-with-link" requirement. |

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `googleapis` full package | 246 MB unpacked; bloats standalone image + trace + `npm ci`; includes dozens of unused APIs (Sheets, Gmail, YouTube…) | `@googleapis/drive` + `google-auth-library` |
| `drive` full scope / domain-wide delegation | Over-privileged; SA impersonation needs Workspace admin setup; violates least-privilege | `drive.file` scope + SA added to the target folder as Editor |
| `permissions.create({ type: 'anyone' })` | Makes files public — violates milestone "file private, no anyone-with-link" | Server-proxied `/api/files/[id]` guarded by `getAdminSession()` |
| Trusting `Content-Type` / extension | Attacker-controlled; PDF/HTML/SVG smuggling | `file-type` magic-byte sniff + allowlist |
| `multer` | Express middleware; not for Web `Request`/Route Handlers | `await request.formData()` in App Router route handler |
| `busboy` | Only needed for true streaming parse of huge uploads | `request.formData()` (Web File API) — 10 MB fits memory fine |
| Local FS spool under `/app/uploads` | Not shared across `app-bench-1..4`; lost on container recreate; perms churn | Postgres `bytea` queue table |
| PG large objects (`lo_*`) | 2 GB ceiling irrelevant; transaction-scoped handles awkward with Prisma raw SQL | Plain `bytea` column |
| `sharp` unless needed | Native build, ~30 MB + libvips on alpine, slows rebuilds | `file-type` alone; add `sharp` only for real re-encode/thumbnail needs |
| External DnD lib for upload UI | Project rule: "Zero External DND/Animation Libs" | Native `<input type="file">` + drag events + `File`/`DataTransfer` API |

---

## Stack Patterns by Variant

**If upload succeeds immediately (Drive reachable):**
- Validate → write `uploaded_files` row with `drive_file_id` → return app file URL.
- No queue row. Fast path.

**If Drive fails (network/429/5xx/403):**
- Validate → write `uploaded_files` row (`drive_file_id = NULL`) → insert `file_upload_jobs` (`status='PENDING'`, `payload=buffer`).
- Response still 200/201 — submission not blocked. Worker syncs later.
- Retry policy: `attempts < 5` with exponential backoff via `updated_at` gating; on success `DONE` + null payload; on exhaustion `FAILED` + surface in admin panel.

**If serving a not-yet-synced file:**
- `/api/files/[id]` → if `drive_file_id` present, stream from Drive; else read `payload` from `file_upload_jobs`, stream from DB. Both behind `getAdminSession()`.

**If file is an image and preview needed:**
- Either embed via `/api/files/[id]` (covers both Drive + spool) or add `sharp` to produce a thumbnail in the upload step. Prefer the former to avoid `sharp` on alpine until proven necessary.

**If Next.js dev hot-reload resets the cached Drive client:**
- `let cached` must be pinned to `globalThis` in dev (same pattern as Prisma singleton) to avoid re-auth churn across HMR:
  ```ts
  const g = globalThis as { __drive?: drive_v3.Drive }
  export const getDriveClient = () => g.__drive ??= buildDriveClient()
  ```

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `@googleapis/drive@27.1.0` | `google-auth-library@^11.0.0` (transitive via `googleapis-common@^9`) | Declare `google-auth-library` explicitly; version 11.x is what the client expects. |
| `google-auth-library@11.3.4` | Node `>=22` | Matches `node:22-alpine` runtime exactly. |
| `file-type@22.3.0` | Node `>=22`, ESM-only | Must be imported in ESM/route-handler context; do not `require()`. |
| `sharp@0.35.5` | Node `>=20.9` | Optional. On `node:22-alpine`, needs `vips`/`libc6-compat` in Dockerfile if adopted — another reason to defer. |
| All above | Next.js `16.2.4`, `output: "standalone"` | Standalone tracing picks up `@googleapis/drive` + `google-auth-library` automatically once imported from server code. Add none to `serverExternalPackages` (pure JS, no native bindings) unless `sharp` is added — if so, add `sharp` there. |
| Spool `bytea` | Prisma 7 raw SQL + `@prisma/adapter-pg` | Read/write via `prisma.$queryRaw`/`$executeRaw` (Buffer ↔ `bytea`), consistent with existing form-builder tables. |

---

## Docker / Build Integration Notes

1. **Dockerfile builder**: add build-time placeholders so route module evaluation succeeds (already the pattern for `GOOGLE_CLIENT_ID` etc.):
   ```dockerfile
   ENV GOOGLE_SA_CLIENT_EMAIL="build-time-placeholder@build.iam.gserviceaccount.com"
   ENV GOOGLE_SA_PRIVATE_KEY="build-time-placeholder"
   ENV GOOGLE_DRIVE_FOLDER_ID="build-time-placeholder"
   ```
   These do not embed real secrets — build never calls Drive.
2. **No new volume** — spool lives in Postgres. `docker-compose.yml` `app-env` block gets the 3 new env vars (propagate via `<<: *app-env` to `worker` and `app-bench-*` automatically).
3. **Worker**: extend `scripts/submission-worker.mjs` to also POST `/api/internal/file-upload-jobs/process?batch=N` each tick; same `x-worker-token`. No new container.
4. **Rebuild trigger**: changes to `package.json`, `Dockerfile`, `docker-compose.yml`, `src/**`, `prisma/**` → Smart Container Rebuild Protocol applies per AGENTS.md.
5. **`npm ci --no-audit --no-fund`** in `deps` stage picks up new packages; image size grows ~<10 MB (Drive client + auth + file-type are all small) vs ~250 MB if full `googleapis` were used.

---

## Sources

- `https://developers.google.com/workspace/drive/api/guides/manage-uploads` — upload types (simple/multipart ≤5 MB, resumable >5 MB), error handling, pre-generated IDs (HIGH)
- `https://developers.google.com/workspace/drive/api/guides/manage-downloads` — `files.get alt=media`, Node `responseType: 'stream'` piping (HIGH)
- `https://github.com/googleworkspace/node-samples` (drive_v3 snippets) — `GoogleAuth` + `files.create({requestBody, media})` service-account pattern (HIGH)
- npm registry (`npm view`): `@googleapis/drive@27.1.0` (2.47 MB unpacked), `googleapis@190.0.0` (246 MB unpacked, `node>=22`), `google-auth-library@11.3.4` (`node>=22`), `file-type@22.3.0` (`node>=22`, ESM), `googleapis-common@^9` deps, `sharp@0.35.5` (HIGH — authoritative package metadata)
- Codebase: `package.json`, `Dockerfile`, `docker-compose.yml`, `scripts/submission-worker.mjs`, `src/app/api/internal/submission-jobs/process/route.ts`, `src/lib/env.ts`, `prisma/migrations/` (10 migrations) — integration points (HIGH)

---

*Stack research for: file upload + Google Drive storage (v2.3)*
*Researched: 2026-11-16*
