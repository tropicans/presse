# Pitfalls Research

**Domain:** Adding file upload + Google Drive storage to an existing public-form app
**Project:** isian (Form) — Milestone v2.3 File Upload & Google Drive Storage
**Researched:** 2026-11-16
**Confidence:** HIGH (stack-specific, grounded in this repo's code; Drive/general-web facts verified against official docs)

Scope: pitfalls specific to **adding** anonymous public uploads + third-party cloud storage to the existing Next.js 16 standalone / Node 22 alpine / Docker + Postgres + `submission_jobs` worker stack. Generic OWASP items are included only where this stack makes them sharper.

---

## Critical Pitfalls

### Pitfall 1: Service-account Drive upload fails with quota/ownership error — files can never be created

**What goes wrong:**
The upload code is written as `files.create(...)` with the service-account credentials and no `supportsAllDrives` / shared-drive parent. Calls return `403 storageQuotaExceeded` (or "Service Accounts do not have storage quota") and every upload silently falls into the local-queue fallback forever. The feature "works" in dev (if any upload path is stubbed) and fails 100% in production.

**Why it happens:**
Service accounts **do not have storage quota and cannot own files**. Per Google's official Drive shared-drives doc: "Service accounts don't have storage quota and can't own files. Instead, they must upload files and folders into shared drives, or use OAuth 2.0 to upload items on behalf of a human user." Devs assume `GOOGLE_DRIVE_FOLDER_ID` pointing at a normal My-Drive folder is enough; it is not when the folder is owned by a user and the caller is a service account. `GOOGLE_DRIVE_FOLDER_ID` in PROJECT.md is ambiguous about whether that folder is in a shared drive.

**How to avoid:**
- Decide and document the storage model explicitly before coding: **Shared Drive folder** (preferred — service account added as Content Manager/member of the shared drive) **or** OAuth-on-behalf-of-a-human impersonation. Do not default to "service account into a My Drive folder."
- Always pass `supportsAllDrives: true` and `includeItemsFromAllDrives: true` on create/list/get; set `driveId` when creating into a shared drive. Shared drives also cap at **500,000 items** and **100 folder levels** — plan a per-form/year subfolder layout.
- Add a **startup/config validation probe** (see Pitfall 2) that fails fast and loudly if the configured folder is not writable by the service account.

**Warning signs:**
- 100% of uploads land in `PENDING`/local queue and never reach `SYNCED`.
- Worker logs contain `storageQuotaExceeded`, `insufficientFilePermissions`, or `The user does not have sufficient permissions for this file`.
- Works when run locally with a developer's personal creds, fails in container.

**Phase to address:**
Design/foundation phase (Drive client + service-account setup) — must be proven with an integration smoke test before any UI upload work begins.

---

### Pitfall 2: Service-account credentials mishandled — committed JSON key, key baked into image, or leaked to client

**What goes wrong:**
The service-account key (`client_email`, `private_key`) is pasted into a `credentials.json` committed to the repo, or copied into the Docker image, or logged in worker error output, or accidentally exported to the browser bundle. A leaked service-account key is a full Drive-account takeover.

**Why it happens:**
The project's only existing Google integration is **admin OAuth login** (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` in `src/lib/auth.ts`). Devs reuse that pattern and assume `GOOGLE_*` env vars are fine; but service-account auth needs a **separate** key, likely base64 in a single env var (`GOOGLE_DRIVE_SA_JSON_B64`) or mounted secret. The Dockerfile bakes **build-time placeholders** for `GOOGLE_CLIENT_*` (see `Dockerfile` lines 26-29) — a careless copy-paste can put a real SA key into a build `ENV`.

**How to avoid:**
- Store the SA key **only** as a runtime secret: base64 env var or a read-only mounted file; never in `Dockerfile`, never in `next.config.ts`, never in `docker-compose.yml` literals (keep `${VAR}`-only like existing env block).
- Never import the Drive client module from any `"use client"` file; keep it in `src/lib/drive.ts` (server-only), and add a lint/`"server-only"` guard.
- Ensure SA key never enters error strings that get written to `submission_jobs.last_error` (sanitize before persisting).
- Add a startup check that the SA key is present and parses, without logging its contents.

**Warning signs:**
- A `credentials.json` / `*.pem` / `service-account*.json` appears in `git status`.
- Drive client imported anywhere under `src/components/**`.
- Worker log lines contain `"private_key"` or `"BEGIN PRIVATE KEY"`.
- SA key visible via `docker inspect` env or image layers (`docker history`).

**Phase to address:**
Design/foundation phase (credentials & config), re-verified in the Docker/ops phase.

---

### Pitfall 3: Trusting client-declared MIME / extension — MIME spoofing and malicious uploads

**What goes wrong:**
The server accepts uploads purely on `file.type` (browser-supplied `Content-Type` in the multipart part) and/or filename extension. An attacker uploads `malware.exe` renamed `photo.jpg` with `Content-Type: image/jpeg`, or a `text/html` file labelled `x.pdf`. Later, if ever served inline, it executes in the admin's browser (see Pitfall 6).

**Why it happens:**
`file.type` is attacker-controlled and trivially forged with `curl -F`. Existing validation in this repo is **text-only** (`src/lib/form-validation.ts`, signature-as-PNG-data-URL) — there is no binary content inspection yet, so devs reach for the easy check.

**How to avoid:**
- Validate on **magic bytes / real content**, not the declared type: read the first bytes and confirm PDF `%PDF-`, PNG `\x89PNG`, JPEG `\xFF\xD8\xFF`. Use a small lib (e.g. `file-type`) server-side or a hand-rolled sniffer.
- Enforce an **allowlist** (only image/png, image/jpeg, application/pdf per milestone), reject everything else with 400.
- Enforce **size** from the actual received bytes, not `Content-Length` header or client claim (max 10 MB).
- Re-derive the stored content type from sniffed bytes; ignore client `Content-Type` entirely.
- Optionally re-encode images server-side to strip embedded payloads.

**Warning signs:**
- Validation code reads `file.type` / file extension as the only gate.
- No test feeding a `.jpg` whose bytes are actually a ZIP/HTML.
- Any file passes when sent via `curl -F "file=@x.exe;type=image/jpeg"`.

**Phase to address:**
Upload validation phase (public upload API) — must ship the magic-byte check + allowlist + size check together, with negative tests.

---

### Pitfall 4: Multipart body size limit in Next.js route handler / standalone server — 10 MB uploads rejected or worse, buffered whole

**What goes wrong:**
Devs assume "10 MB max" just works. In Next.js, **Server Actions default to a 1MB body limit** (`experimental.serverActions.bodySizeLimit`), so any upload routed through a Server Action fails silently at >1MB. For **Route Handlers** (`app/api/**/route.ts`) there is no default 1MB cap, but the handler does `await request.formData()` which **buffers the entire file into memory** — five concurrent 10 MB uploads = 50 MB+ RSS spike on a Node 22 alpine container; more concurrent anonymous uploads = OOM kill. Also the front proxy/path is not configured for large bodies.

**Why it happens:**
The existing upload-adjacent code uses `request.json()` (small payloads) — no multipart handling exists in the repo. Next's docs explicitly warn Server Actions default to 1MB and that the limit applies to the raw multipart body incl. boundary overhead (10–20 KB extra). The bench Nginx (`infra/nginx/benchmark.conf`) has no `client_max_body_size`/upload tuning and caches JSON paths — uploads need a non-cached, larger-body location.

**How to avoid:**
- Use a **Route Handler** (not a Server Action) for uploads. If any Server Action path is used, set `experimental.serverActions.bodySizeLimit` explicitly.
- Prefer **streaming** the request body over `request.formData()` full buffering where feasible, or hard-cap concurrency and enforce size while streaming; reject early once >10 MB read.
- Add `client_max_body_size` (e.g. 12m to allow overhead) and `proxy_request_buffering`/timeout tuning to the Nginx config; ensure the upload route is **excluded from cache** and not counted under the cached JSON `location` blocks.
- Set container memory limits and verify behavior at limit; align with the existing 10 MB product cap.

**Warning signs:**
- Uploads >1MB inexplicably fail (Server Action) or `413`/`413 Request Entity Too Large` from Nginx.
- Memory climbs per concurrent upload; container restarts/OOMKilled under loadtest.
- `request.formData()` called with no size guard before reading.
- Bench config still has no `client_max_body_size` for upload path.

**Phase to address:**
Upload API + infra phase — size limit config and streaming/backpressure must be validated with the k6 load test before go-live.

---

### Pitfall 5: Serving private files — IDOR on file ID, path traversal, inline execution (XSS), unsafe `Content-Disposition`

**What goes wrong:**
`/api/files/[id]` serves files by opaque ID with weak or absent authz. Failure modes: (a) **IDOR** — any authenticated (or even anonymous) caller swaps `id` and downloads another submission's files; (b) **path traversal** — a local-fallback implementation uses a `filename`/`path` from the DB or request in `fs.readFile(path.join(uploadDir, userInput))` and `../` escapes the upload dir; (c) **XSS via inline SVG/HTML** — file served with `Content-Type: image/svg+xml` or `text/html` inline lets script run in the admin's session origin; (d) **`Content-Disposition` missing `attachment`** or with unsanitized filename → header injection / browser sniffing.

**Why it happens:**
The route is described as "serve private files only for authenticated admin, with local fallback" — the local fallback is exactly where traversal and content-type trust creep in. Devs treat "admin session required" as sufficient, but a non-superadmin admin must still not read files they shouldn't; and any auth-only check still allows inline SVG execution because the browser trusts the served `Content-Type`.

**How to avoid:**
- Authorize on **resource ownership/scope**, not just "is logged in": look up the file record, verify the requesting admin may access that submission/form. Never serve by raw Drive file id or raw disk path from the request.
- For local fallback: store files under a fixed dir with **server-generated opaque names (uuid)**; never join request-derived path; resolve and confirm the realpath stays within the upload root.
- **Force download**: `Content-Disposition: attachment; filename="<sanitized>"` and `Content-Type: application/octet-stream` (or a safe explicit type) — never inline-render attacker content. Serve SVG only as `attachment` or not at all.
- Sanitize the filename in the header (strip CR/LF/quotes).
- Add `X-Content-Type-Options: nosniff`.
- Prefer a **two-step**: authenticated redirect/mint of a short-lived signed URL OR proxied stream — never forward the raw Drive URL (PROJECT.md wants app URLs, not Drive URLs).

**Warning signs:**
- Route does `if (!session) 401` and then serves whatever `id` says, no ownership lookup.
- `fs.readFile(join(uploadRoot, params.filename))` or `path.resolve` with request data unchecked.
- Response sets `Content-Type` from the stored/declared type and no `Content-Disposition: attachment`.
- A crafted `id=../../etc/passwd` or another submission's id returns a file.

**Phase to address:**
Private file-serving phase — authz + traversal + forced-download + nosniff + negative tests (IDOR swap, `../`, SVG inline) all in one phase.

---

### Pitfall 6: Docker filesystem is ephemeral — local fallback files vanish on redeploy/restart

**What goes wrong:**
The local queue/fallback writes files to the container filesystem (e.g. `./uploads` or `/tmp`). On `docker compose up --build` / redeploy / crash restart, the container is recreated and **all pending/unsynced files are gone** — meanwhile DB rows still reference them, so `/api/files/[id]` 404s and the worker can never sync them. Data loss of user submissions.

**Why it happens:**
The current `Dockerfile` copies app into an ephemeral image layer; the only persisted volume in `docker-compose.yml` is `pgdata` (Postgres). There is **no volume for app/worker storage**, and app + worker are **separate containers** — even a named volume must be **shared and mutually mounted** or the worker can't see the app's written file. Devs test on a long-lived dev container and never notice.

**How to avoid:**
- Add a **named volume** (e.g. `filedata:/app/uploads`) mounted into **both `app` and `worker`**, not just one. Document the mount.
- Write fallback files to a fixed configured dir (`UPLOAD_DIR=/app/uploads`), with the non-root `nextjs` user owning it (the image runs `USER nextjs`).
- Make the worker's sync read the **shared** path; do not rely on the app's ephemeral filesystem from the worker.
- Consider making DB-only the source of truth (store bytes in DB for fallback) if a shared volume is undesirable — decide explicitly.

**Warning signs:**
- No upload volume in `docker-compose.yml` (only `pgdata`).
- Fallback files land under `/tmp` or container-local `./uploads`.
- After `docker compose up -d --build`, queued files disappear but DB rows persist; `/api/files/[id]` returns 404 for pending items.
- Worker and app do not both mount the same path.

**Phase to address:**
Queue/local-fallback + Docker/ops phase — volume wiring is part of "local queue fallback" done correctly.

---

### Pitfall 7: Queue/retry semantics — infinite retry, duplicate Drive uploads, orphaned pending rows

**What goes wrong:**
The Drive-sync queue is bolted onto `submission_jobs` with naive semantics: a file upload that succeeds on Drive but crashes before the DB row is marked `SYNCED` gets **re-uploaded on retry** (duplicate Drive files); or a permanently failing upload (bad key, quota) **retries forever** and starves the real submission worker; or two worker replicas (bench profile has 4 apps + 4 workers) both pick the same file and upload twice. Result: Drive duplicates, storage leak, backlog.

**Why it happens:**
`submission_jobs` already claims jobs with `FOR UPDATE SKIP LOCKED` and backoff (`src/lib/forms.ts` ~2384-2446, `attempts`, `available_at`, status PENDING/PROCESSING/COMPLETED/FAILED, 5 attempt cap). Reusing it naively for Drive sync is tempting, but the **create-on-Drive + update-DB is not atomic**; the existing job also has `submission_jobs_submission_id_key` UNIQUE, which will conflict if one submission has multiple files mapped to one job. And the existing retry has **no dead-letter distinction** for a permanently-broken Drive config.

**How to avoid:**
- Use a **separate `file_upload_jobs` (or `submission_files`) table** for file sync, not `submission_jobs` (avoids the unique-submission constraint and keeps submission processing isolated).
- Make Drive upload **idempotent**: store the Drive `fileId` on the row as soon as Drive responds and before marking `SYNCED`; on retry, if a `driveFileId` already exists, verify rather than re-create. Optionally upload with a deterministic name + app-tag to dedupe.
- Keep `FOR UPDATE SKIP LOCKED` claim pattern; cap attempts and move to a `FAILED`/dead state after N; expose `last_error` (sanitized).
- Separate the **Drive-sync worker loop** from the submission-processing loop (or clearly partition by job type) so a stuck Drive config doesn't block submissions.
- Handle the atomicity window: mark row `UPLOADING` with claim, set `driveFileId` in same transaction as status, roll to `PENDING` with backoff on error only if no `driveFileId`.

**Warning signs:**
- Same user file appears twice/thrice in Drive.
- `submission_jobs` unique-constraint errors when a submission has multiple files.
- Worker loop pinned on one bad job (`attempts` climbing, others starve).
- `FAILED` rows never surface in admin; backlog grows unbounded.
- Two workers upload identical file concurrently in bench setup.

**Phase to address:**
Queue/worker sync phase — idempotent design + separate table + attempt cap + tests for "crash after Drive upload, retry".

---

### Pitfall 8: Orphaned files & storage leaks — abandoned uploads, deleted submissions, deleted forms

**What goes wrong:**
A public user uploads a file (stored on Drive or as pending local), then abandons the form / never submits. The file is now orphaned: consumes Drive quota / shared-drive item count / local volume forever. Same on deleting a submission or a form: DB rows cascade (`ON DELETE CASCADE` on `submissions`, `form_fields`), but the **actual file bytes on Drive/disk are never deleted** → slow leak.

**Why it happens:**
Anonymous, no-login flow means uploads happen **before** a real submission exists; there is no hook tying a pre-submission upload to cleanup. The existing schema cascades remove DB rows but nothing deletes external blobs. Devs ship the happy path (upload → submit → view) and never write the GC path.

**How to avoid:**
- Give every upload an **`expires_at` / `status=ORPHANED`** lifecycle. On submit, link file rows to `submission_id`; anything unlinked past a TTL (e.g. 24h) is garbage-collected by the worker (delete Drive file + local + row).
- On submission delete / form delete, the deletion path must enumerate `submission_files` and delete Drive/disk blobs (the `ON DELETE CASCADE` only clears rows — add explicit cleanup or a scheduled reconciler).
- Add a **reconciliation job**: DB rows referencing Drive files vs. Drive files with app-tag not referenced by DB → delete leaked blobs.
- Warn about shared-drive **500,000 item limit** — leaked orphans accelerate hitting it.

**Warning signs:**
- No `expiresAt`/TTL on unlinked file rows.
- Drive folder size / item count grows without matching submission count.
- Deleting a submission leaves the Drive file behind.
- `uploads` volume or Drive keeps growing with no GC job.

**Phase to address:**
Queue/worker phase (GC + reconciler) and admin-submission-delete phase (delete blobs on delete).

---

### Pitfall 9: Rate-limit bypass on the upload endpoint — in-memory limiter is not per-IP across replicas and doesn't cap bytes

**What goes wrong:**
Upload endpoint reuses `rateLimit()` from `src/lib/rate-limit.ts` with a request-count limit. Attacks that slip through: (a) **multi-instance bypass** — the limiter is a per-process `Map`; behind Nginx's 4 `app-bench` replicas, an attacker gets 4× the limit; (b) **IP spoofing** — `getClientIp` trusts `x-forwarded-for` first hop unconditionally; a client sending its own `X-Forwarded-For` header can rotate IPs and bypass; (c) **byte-based abuse** — a request-count limit still allows N × 10 MB in the window, filling Drive/local; there is no **bytes-per-window cap**; (d) the assert only fires when `NODE_ENV=production` and env not set (`RATE_LIMIT_SINGLE_INSTANCE_OK`).

**Why it happens:**
The existing limiter was built for small JSON submissions (5/min POST). Upload amplifies the same weaknesses: anonymous, no session, so IP is the only identity; and the current doc-comment already flags "do not treat as multi-instance protection." It's easy to reuse it unaware, and signature data URLs already bypass size expectations elsewhere.

**How to avoid:**
- Strip/ignore client-supplied `X-Forwarded-For`; only trust the value the **trusted proxy** (Nginx) sets. Fix `getClientIp` to read the correct hop.
- Add **byte/megabyte-per-window** limiting in addition to request-count for uploads; enforce max file size **per request and per total**.
- If running multi-instance/bench, use a **shared limiter** (Postgres/Redis) for upload, or accept single-instance only with `RATE_LIMIT_SINGLE_INSTANCE_OK` set deliberately and the proxy not fanning out uploads.
- Consider a lightweight proof-of-work / captcha on the upload endpoint for anonymous abuse.

**Warning signs:**
- Upload endpoint rate limiter identical to JSON submit config with no byte accounting.
- `getClientIp` returns `unknown` or lets spoofed XFF through in container behind Nginx.
- Bench profile (4 apps) shows ~4× rate accepted.
- Drive/local fills up under a single-source flood at the request-count limit.

**Phase to address:**
Upload API phase — IP-trust fix + byte-limit + shared/proxy-aware limiter together.

---

### Pitfall 10: Excel export contains raw URLs / breaks on file columns

**What goes wrong:**
The export code (`src/app/api/admin/forms/[id]/export/route.ts`, `lib/forms.ts`) renders file answers into `.xlsx`. Two failures: (a) it writes the **raw Drive URL** (or a signed URL that expires) instead of the app URL, violating PROJECT.md ("kolom file menampilkan nama file dan URL aplikasi, bukan URL Drive") and leaking a Drive identifier; (b) it writes the app file URL but the URL is relative/underscoped, or the cell picks up `=HYPERLINK(...)`/auto-formula from an attacker-controlled **filename** (CSV/Excel formula injection), or long URLs blow the 500-row split/file logic, or the column is treated as date/timezone (see Pitfall 11). The `submission_answers.value_text` index now uses `left(...,512)` — values longer than 512 chars may still be stored but export/display logic assumes text.

**Why it happens:**
The export was built for text/signature answers; adding a `FILE` value means multi-file, multi-URL content in a single answer cell — the file-answer shape (array of files) doesn't fit `value_text`/`value_json` naively, and devs concatenate URLs directly. Existing `Content-Disposition` filenames are already server-built (safe) but **cell content** from user filenames is not sanitized.

**How to avoid:**
- Render file answers as **`Nama File — <app file URL>`** using the app's `/api/files/[id]` URL (never Drive). Decide one URL per row vs multiple files in the cell explicitly.
- Sanitize **filenames** before writing cells: strip leading `=`, `+`, `-`, `@` to prevent formula injection; treat as plain text.
- Keep the existing 500-row-per-file split working with larger content; don't let the file column break chunking.
- Store file metadata (array of `{id,name,contentType,size}`) in `submission_answers.value_json`, not a raw concatenated URL string in `value_text`.

**Warning signs:**
- Export cell content is a `drive.google.com/...` or a signed URL.
- A filename starting with `=` becomes a live formula in the exported sheet.
- Multi-file answers only export the first file or a broken JSON string.
- Chunked export count differs once file rows are added.

**Phase to address:**
Export/display integration phase — after file model exists, with a test that file answers export app URLs and filenames are sanitized.

---

### Pitfall 11: Timezone & PII in stored files — EXIF/location leakage and drifted timestamps

**What goes wrong:**
Uploaded photos carry **EXIF GPS + device info + creation timestamp** that the app stores and can expose to admins (privacy/PII leak, especially for anonymous public users of government forms). File `created_at` / expiry / export dates use `new Date()` in different places (app container TZ vs Postgres `NOW()` vs `TIMESTAMP(3)` without TZ) causing **retention GC to run too early/late**, appended-date in export filename (currently `new Date().toISOString().split('T')[0]` = UTC) mismatching local dates, and PII (ID-card scans, selfies) retained indefinitely with no stated retention policy.

**Why it happens:**
Existing schema uses `TIMESTAMP(3)` (no tz) with DB-side `CURRENT_TIMESTAMP` in some places and Node `new Date()` in others; the export already stamps UTC dates in filenames. Adding user photo/PDF uploads introduces real PII (KTP/ID scans, signatures) and EXIF metadata not present in prior text-only answers. Devs don't think of photos as PII or of EXIF as data.

**How to avoid:**
- **Strip EXIF** (and any embedded metadata) on image upload server-side before storing; especially GPS.
- Define a **retention policy** for files (how long after submission / after form close) and implement it in the GC job; document it.
- Standardize on **UTC in DB** (`TIMESTAMPTZ` or explicit `now()` in one place), compute expiry consistently; never mix `new Date()` and DB `NOW()` for the same field.
- For the export filename date, use a single, documented timezone (state whether UTC or local, e.g. `Asia/Jakarta`), not silent `toISOString()`.
- Treat file metadata as PII: limit who can download (admin only, per Pitfall 5), and avoid logging filenames/URLs to `last_error` or console.

**Warning signs:**
- Stored image still returns GPS/EXIF on inspection.
- GC deletes files that should be kept or keeps expired ones (off-by-hours).
- Export filename date differs by a day from the submission's displayed local date.
- ID-scan/selfie uploads with no retention/expiry defined.

**Phase to address:**
Upload validation phase (EXIF strip) + retention/GC phase (policy, UTC consistency) + export phase (single timezone).

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Reuse `submission_jobs` for file sync | No new table, same worker | Unique-submission constraint clashes, files block submissions, retry semantics wrong | Never — use a dedicated file/job table |
| Buffer full upload via `request.formData()` | Simple code | Memory spikes/OOM under concurrent anonymous uploads | Only if concurrency is hard-capped and files ≤ small cap |
| Per-process in-memory upload limiter | Reuses existing module | Multi-instance bypass, byte abuse | Only single-instance with explicit `RATE_LIMIT_SINGLE_INSTANCE_OK` and proxy not fanning out |
| Store raw Drive URL in DB/export | Fewer app endpoints | Private-file guarantee broken, links expire, Drive ID leak, violates PROJECT.md | Never |
| Serve files inline with stored content-type | "Preview works" | XSS via SVG/HTML in admin origin | Never — force `attachment` |
| Local fallback in container FS without volume | Quickest to ship | Data loss on redeploy | Never (mount a shared volume in app+worker) |
| Keep EXIF in uploaded images | No image processing | GPS/PII leak | Never for PII-bearing forms |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Google Drive (service account) | Upload into a My-Drive folder as SA → quota error | Use a **Shared Drive** folder; SA added as member; `supportsAllDrives: true`, `driveId` on create |
| Google Drive | Reusing `GOOGLE_CLIENT_*` OAuth creds for Drive | Separate SA key (`GOOGLE_DRIVE_SA_JSON_B64` or mounted file); keep in server-only module |
| Google Drive | Servicing admin download by forwarding Drive URL | Proxy/sign via `/api/files/[id]` after authz; never expose Drive URL |
| Google Drive | Ignoring shared-drive 500k item / 100-level limits | Per-form/year subfolders, GC orphans |
| Next.js Route Handler | `request.formData()` without size guard | Stream + early reject >10MB; hard-cap concurrency |
| Next.js Server Action | Assuming 10MB works | Default limit is 1MB; set `bodySizeLimit` or avoid Server Action for uploads |
| Nginx (bench proxy) | Upload route hits cached JSON location, no `client_max_body_size` | Dedicated non-cached upload location with 12m body + tuned timeouts |
| Postgres `submission_jobs` | Mixing file jobs into submission jobs | Separate table, `SKIP LOCKED`, attempt cap, idempotent Drive create |
| Docker | Worker can't see app's files | Named volume mounted in **both** `app` and `worker`; non-root ownership |
| `getClientIp` / XFF | Trusting client XFF | Trust only proxy-set hop |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Full-file buffering in route handler | RSS spikes per concurrent upload; OOMKill at alpine memory limit | Stream + size guard + concurrency cap | ~5+ concurrent 10MB uploads on a small container |
| Synchronous Drive upload in submit request | Public submit latency tied to Google API/latency; timeout | Write file row PENDING → background worker syncs | Any Drive delay/outage |
| Drive list/get per file on every admin view | Slow submissions page, Drive rate-limit/quota per user | Cache metadata in DB; don't call Drive for display | Hundreds of files / many admins |
| One folder per app with 500k+ items | Shared drive item-limit, slow listing | Per-form/year subfolders + GC | Approaching shared-drive cap |
| GC/reconciler scanning whole Drive each tick | Drive API quota burn, slow worker | Incremental, DB-driven with `app-tag`, bounded batches | Large existing folders |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| SA key in repo/image/logs | Full Drive takeover | Runtime secret only; sanitize logs; server-only module |
| Trusting client `Content-Type`/extension | Malware/phishing stored & served | Magic-byte sniff + allowlist |
| IDOR on `/api/files/[id]` | Cross-submission file disclosure | Ownership/scope check per request |
| Path traversal in local fallback | Arbitrary file read | UUID names, fixed root, realpath check |
| Inline SVG/HTML serving | Stored XSS in admin origin | `attachment`, `octet-stream`, `nosniff` |
| Unsanitized filename in header/cell | Header injection / Excel formula injection | Sanitize filename for headers and cells |
| Raw Drive URL in export/UI | Private-file guarantee broken, leak | Only app URLs |
| Spoofable XFF + in-memory limiter | Rate-limit bypass, storage flood | Proxy-trusted IP + byte limit + shared store |
| EXIF GPS in images | PII/location leak | Strip metadata on upload |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Upload succeeds but submit has no file → silent loss | User thinks file attached | Block submit until upload resolves; show per-file state |
| Upload fails on Drive → generic error | User retries endlessly | Show "tersimpan sementara, akan disinkronkan" status; still allow submit |
| No progress/preview/remove before submit | Re-upload confusion | Drag-drop + progress + preview + remove (per PROJECT.md) |
| Admin sees raw Drive or broken link | Can't access/leaks | Admin panel with app URL, download via protected redirect |
| Oversized/wrong file no clear message | Frustration | Client-side early size/type check mirroring server allowlist |

## "Looks Done But Isn't" Checklist

- [ ] **Drive upload:** Real service-account upload into a **Shared Drive** folder verified (not just mocked); `supportsAllDrives`/`driveId` set — verify a real file appears in Drive.
- [ ] **Credentials:** SA key loads only at runtime; not in git/image/`docker inspect`; Drive module never imported by client — verify `npm run build` bundle has no key.
- [ ] **MIME:** Server rejects a spoofed `.jpg` (real ZIP/HTML) — verify with `curl -F` negative test.
- [ ] **Body limits:** Uploading exactly 10 MB works; >10 MB rejected cleanly; Nginx `client_max_body_size` and non-cached upload path configured — verify in compose.
- [ ] **Memory:** Concurrent uploads don't OOM the alpine container — verify under k6 load.
- [ ] **Files serving:** Admin-only; other submission's file id rejected; `../` rejected; response is `attachment` + `nosniff`; SVG not inline — verify each.
- [ ] **Persistence:** App restart with pending file → file still present (shared volume on app+worker) — verify with `docker compose up -d --build`.
- [ ] **Queue:** Crash-after-Drive-upload doesn't duplicate; bad config doesn't starve submissions; attempts cap to FAILED — verify with induced failure test.
- [ ] **Orphans:** Abandoned upload GC'd after TTL; deleting submission/form deletes blob — verify counts before/after.
- [ ] **Rate limit:** Behind bench proxy, spoofed XFF and multi-instance don't multiply — verify.
- [ ] **Export:** File column shows **app URL + name**, filename with `=` not a formula, 500-row split intact — verify exported `.xlsx`.
- [ ] **EXIF/timezone:** Uploaded photo has no GPS; expiry/GC and export dates consistent — verify.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Drive quota/ownership error | MEDIUM | Move SA into shared drive + `supportsAllDrives`; re-run worker for PENDING files |
| Leaked SA key | HIGH | Disable/rotate SA key, audit Drive access logs, purge from git history & images |
| MIME spoof accepted | MEDIUM | Quarantine affected files, add sniff, notify if served inline |
| OOM under load | MEDIUM | Add streaming/size guard, raise memory, add concurrency cap |
| IDOR/path traversal exposure | HIGH | Patch authz/traversal, audit access logs for other ids, rotate links |
| Ephemeral file loss | HIGH (data loss) | Restore from DB if bytes stored there; otherwise unrecoverable — prevent via volume |
| Duplicate Drive files | LOW | Reconciler with app-tag to dedupe; keep latest |
| Storage leak | MEDIUM | Run one-off orphan scan, delete unreferenced blobs, add GC |
| Excel formula injection | LOW | Re-export sanitized, review suspicious files |
| PII/EXIF exposure | HIGH | Strip/replace files, retention policy, disclosure if ID scans leaked |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Drive quota/ownership (P1) | Foundation: Drive client + SA/shared-drive setup | Real file created in shared drive via smoke test |
| SA credential handling (P2) | Foundation: credentials/config | Key absent from git/image/bundle; parse check passes without logging |
| MIME spoofing (P3) | Upload validation | `curl -F` spoofed file rejected 400 |
| Multipart/body limits & buffering (P4) | Upload API + infra | 10MB passes, >10MB rejected, no OOM under k6, Nginx body limit set |
| Private file serving — IDOR/traversal/XSS/D-disposition (P5) | Private file-serving | Negative tests: id swap, `../`, inline SVG force-downloaded |
| Docker ephemeral FS (P6) | Queue/local fallback + Docker ops | File survives `up -d --build`; app+worker share volume |
| Queue/retry/duplicate sync (P7) | Queue/worker sync | Crash-after-upload retry test: no duplicate, no starvation |
| Orphans/storage leak (P8) | Queue/worker GC + submission-delete | Abandoned file GC'd; delete submission removes blob |
| Rate-limit bypass (P9) | Upload API | Bench multi-instance + spoofed XFF blocked; byte cap enforced |
| Excel export URLs/formula (P10) | Export/display integration | Export shows app URL+name; filename `=` neutralized; split intact |
| Timezone/PII/EXIF (P11) | Upload validation (EXIF strip) + retention/GC + export | No GPS in stored image; GC/export dates consistent; policy documented |

## Sources

- Google Drive API — Shared drives overview (official): service accounts have no storage quota and cannot own files; must upload into shared drives or use OAuth on behalf of a user; shared drive 500,000-item / 100-level limits. https://developers.google.com/workspace/drive/api/guides/about-shareddrives
- Next.js `serverActions` config (official): default body size limit 1MB; applies to raw multipart incl. boundary overhead. https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions
- Repo evidence (this codebase):
  - `src/lib/rate-limit.ts` — per-process in-memory limiter, `getClientIp` trusts XFF, `RATE_LIMIT_SINGLE_INSTANCE_OK` guard
  - `src/lib/forms.ts` ~2379-2454 — `submission_jobs` `FOR UPDATE SKIP LOCKED`, attempts cap 5, unique `submission_id`
  - `prisma/migrations/20260406160000_add_submission_jobs/migration.sql` — job schema + unique indexes
  - `prisma/migrations/20260506120000_limit_submission_answer_value_index/migration.sql` — `left(value_text, 512)` index
  - `prisma/migrations/20260401062000_add_form_builder_v1/migration.sql` — `submission_answers` shape, `ON DELETE CASCADE`
  - `Dockerfile` — ephemeral image, `USER nextjs`, build-time GOOGLE_* placeholders
  - `docker-compose.yml` — only `pgdata` volume; app + worker separate; bench profile 4 apps/4 workers
  - `infra/nginx/benchmark.conf` — cached JSON paths, no `client_max_body_size`
  - `src/app/api/admin/forms/[id]/export/route.ts`, `src/app/api/attendance/export/route.ts` — XLSX + `Content-Disposition` filenames
  - `src/lib/auth.ts`, `src/app/api/public/forms/[slug]/submit/route.ts` — OAuth admin only; anonymous public submit with rate limiter

---
*Pitfalls research for: file upload + Google Drive storage on existing Next.js/Docker public-form app (isian v2.3)*
*Researched: 2026-11-16*
