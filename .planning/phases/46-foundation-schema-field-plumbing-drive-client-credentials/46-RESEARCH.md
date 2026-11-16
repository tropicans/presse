# Phase 46: Foundation — Schema, Field Plumbing, Drive Client & Credentials - Research

**Researched:** 2026-11-16
**Domain:** PostgreSQL schema migration + raw-SQL form-builder plumbing + Google Drive v3 service-account client + boot-time credential/probe wiring in a Next.js 16 standalone container
**Confidence:** HIGH on repo-internal facts (every claim line-referenced against checked-in code); MEDIUM on Google Workspace tenant facts (unverifiable from the repo — see Open Questions)

## Summary

Phase 46 is four independent-but-ordered bodies of work, all landing in code that already exists and already has a precedent to copy:

1. **Migration** — one new Prisma migration folder that (a) `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE'`, copying `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql` verbatim in shape, and (b) `CREATE TABLE IF NOT EXISTS` for `submission_files` and `file_upload_jobs`, copying the DDL style of `prisma/migrations/20260406160000_add_submission_jobs/migration.sql` (pkey + named composite index + `IF NOT EXISTS` everywhere).
2. **Field plumbing** — `FILE` must be added to *two* vocabularies (`FieldType` at `src/lib/forms.ts:27` and `FormFieldType` at `src/lib/forms.ts:31`) plus one new field interface in the `FormField` union at `src/lib/forms.ts:78`, and to three mappers that each fail differently: `mapFieldType` (`:499`) silently returns `null` (no compile error — easy to miss), `mapFormFieldTypeToDb` (`:2670`) is an exhaustive switch with **no `default`** so a missing case is a hard `tsc` error (good), and `mapPublicFormRowsToDefinition` (`:1731`) falls through to a **text-shaped default branch** at `:1799` that injects `maxLength` and `placeholder` into any unhandled type (so a `FILE` field would silently be mis-shaped unless a branch is added). A fourth site, the `allowedTypes` Set at `:2815`, silently rejects the new type at admin save time if not updated.
3. **Drive client** — module-level cached `drive_v3.Drive` built from `GoogleAuth` with a service-account credential and the `drive.file` scope, uploading into a **Shared Drive** with `supportsAllDrives: true` + `driveId` in both `requestBody` and the request params. `drive.file` is sufficient scope for this, and it is the only scope compatible with the locked decision (see Architectural Responsibility Map note on `drives.get`).
4. **Boot wiring** — three new env vars validated through the existing `readRequiredEnv` helper (`src/lib/env.ts`), a startup probe that classifies permanent vs transient errors, a background 60s re-probe, and `/api/health` extended to a degraded shape **without changing the healthy body byte-for-byte**.

**Primary recommendation:** Put the startup probe in `src/instrumentation.ts` (`register()`), because Next.js 16 makes `instrumentation` stable and `register()` is guaranteed to complete before the server accepts requests — which is exactly the fail-fast semantic D-01/D-02 need, and it survives `output: "standalone"` (the file is traced and executed by `server.js`). Keep `/api/health` returning `{status:'ok'}` unchanged when Drive is healthy, and only add the `drive` key when degraded.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Startup probe**

- **D-01:** Fail-fast **hanya** untuk error permanen — folder bukan Shared Drive, folder 404, `invalid_grant`, kredensial invalid. Pada kondisi ini app tidak boot dan log error menyebut folder ID bukan Shared Drive.
- **D-02:** Error sementara (timeout jaringan, HTTP 5xx, HTTP 429) → app tetap boot dalam **mode degraded**; WARN di log; upload masuk spool. Alasannya: gangguan sesaat dari Google tidak boleh menumbangkan seluruh situs termasuk form publik.
- **D-03:** Degraded mode dipulihkan otomatis lewat **background retry probe setiap 60 detik**. Saat pulih, sistem keluar dari spool-only tanpa restart container.
- **D-04:** Status Drive diekspos di `/api/health` sebagai satu sumber kebenaran untuk operator dan worker.
- **D-05:** Response `/api/health` saat sehat **tetap persis** `{"status":"ok"}` — kompatibel dengan Docker healthcheck dan k6 load test yang sudah mem-parse bentuk ini. Saat degraded: `{"status":"degraded","drive":{"state":"degraded","reason":"..."}}`.

**Bentuk kredensial service account**

- **D-06:** Env var terpisah, bukan file JSON ter-mount:
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (escape `\n` di-unescape saat load)
  - `GOOGLE_DRIVE_FOLDER_ID`
- **D-07:** Ketiga env **wajib** ada dan tidak kosong saat boot; validasi gagal diperlakukan sebagai error permanen (fail-fast). Private key harus memuat header `BEGIN PRIVATE KEY` setelah unescape.
- **D-08:** Tidak ada perubahan pada `docker-compose.yml` untuk secret mount; cukup `.env.example` + `Dockerfile` placeholder bila perlu.

**State machine & nama status**

- **D-09:** Status file: `PENDING → SYNCED | FAILED | ORPHANED`. Tidak ada `PENDING_UPLOAD`/`QUEUED` terpisah. Penamaan ini **tidak** meniru enum `submission_jobs` (`PENDING/PROCESSING/DONE/FAILED`) karena tabel itu tidak dipakai ulang.
- **D-10:** Bytes disimpan saat upload — satu operasi menulis record `submission_files` (status `PENDING`) + job + payload `bytea` sekaligus. Worker hanya mendorong ke Drive; tidak ada sumber byte kedua.

**Cara migrasi diterapkan**

- **D-11:** Prisma migration folder baru `prisma/migrations/<timestamp>_add_file_upload_tables/migration.sql`, dijalankan oleh `prisma migrate deploy` yang sudah ada di `start.sh`. Termasuk `ALTER TYPE "FieldType" ADD VALUE 'FILE'`, mengikuti preseden migrasi CHECKBOX.
- **D-12:** Tidak ada script SQL ad-hoc terpisah — semua perubahan tercatat di `_prisma_migrations` agar tidak drift antar environment.

### the agent's Discretion

- Bentuk konkret payload `bytea` di `file_upload_jobs` (kolom tunggal vs kolom terpisah untuk checksum/attempt), selama D-10 dan D-09 terpenuhi.
- Detail implementasi cache klien Drive (singleton module-level) dan cara probe melakukan retry di background (interval vs timer rekursif), selama D-03 terpenuhi.
- Apakah `@googleapis/drive` perlu entri `serverExternalPackages` di `next.config.ts` — perlu dibuktikan saat implementasi.
- Nama file sanitization dan kolom checksum algorithm (SHA-256 diasumsikan).

### Deferred Ideas (OUT OF SCOPE)

- Rotasi kredensial service account — belum dibutuhkan, dicatat sebagai operasi manual.
- Multi-provider storage abstraction (S3/R2) — v2 (`FILEX-09`).
- Shared limiter Redis/Postgres — v2 (`FILEX-10`).
- Kompresi gambar, thumbnail, resumable upload — v2 (`FILEX-01..03`).
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FILE-01 | Tipe field `FILE` tersedia end-to-end pada enum PostgreSQL `FieldType`, union TypeScript di `src/lib/forms.ts`, dan model domain form field | Migration DDL precedent + the four `forms.ts` sites that must change (see Architecture Patterns → "Adding a field type end-to-end") |
| FILE-02 | Tabel `submission_files` menyimpan metadata file (id, submission_id nullable, field_id nullable, original filename, sanitized filename, mime, size, checksum, storage status, drive_file_id, timestamps) via migrasi SQL | `submission_jobs` DDL precedent (`20260406160000`); column list in ROADMAP.md:44; status vocabulary locked by D-09 |
| FILE-03 | Tabel `file_upload_jobs` menyimpan payload bytes (`bytea`) sebagai spool lokal dengan status antrian (PENDING/CLAIMED/DONE/FAILED), attempt counter, dan next_attempt_at — tanpa volume filesystem | `bytea` round-trip proven against `@prisma/adapter-pg` internals (Code Examples → bytea); D-10 write-once semantics |
| FILE-04 | Klien Google Drive berfungsi via service account dengan scope `drive.file`, upload ke **Shared Drive** folder memakai `supportsAllDrives: true` + `driveId`, dan probe startup yang gagal keras bila folder bukan Shared Drive | Standard Stack + Architecture Patterns → probe design; Google Shared Drives docs (Sources) |
| FILE-05 | Konfigurasi env baru (`GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`) terdaftar di `.env.example` dan divalidasi saat boot | `readRequiredEnv` at `src/lib/env.ts:3-11`; `.env.example:11-19`; `docker-compose.yml:12-29` `app-env` anchor; `Dockerfile:24-30` placeholder block |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| `FILE` enum value + two new tables | Database / Storage | — | Schema is Postgres-owned; app reads it raw via `prisma.$queryRaw` (AD-6), so the migration is the only source of truth |
| `FILE` union/mapper plumbing | API / Backend | — | `src/lib/forms.ts` is server-side domain logic; the public/admin JSON payload is derived there |
| Service-account auth + Drive client | API / Backend | — | Client must never be reachable from the browser; `drive.file` token lives in the app process only (W10) |
| Startup probe + degraded state | API / Backend (process bootstrap) | Frontend Server (SSR) exposes it via `/api/health` | Probe runs once at Node process boot via `instrumentation.ts` `register()`; the state is then read by the health route |
| Env credential validation | API / Backend (process bootstrap) | — | `readRequiredEnv` throws before any request is served |
| `/api/health` degraded shape | API / Backend | — | Route handler composes DB check + Drive state into one JSON body |

**Tier note (important):** the probe **cannot** use `drive.drives.get` to prove "this is a Shared Drive", because `drives.get` requires `drive` or `drive.readonly` scope — which contradicts locked requirement FILE-04 ("scope `drive.file`"). The probe must instead call `drive.files.get` on `GOOGLE_DRIVE_FOLDER_ID` with `fields: 'id,name,mimeType,driveId,capabilities.canAddChildren'` and `supportsAllDrives: true`. The presence of a non-empty `driveId` in the response is the Shared Drive marker; `capabilities.canAddChildren: false` is the "folder exists but SA is not a writer" marker. [CITED: developers.google.com/drive/api/guides/enable-shareddrives]

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@googleapis/drive` | 27.1.0 | Drive v3 typed client (`files.create/get/delete`) | Only Drive API surface needed; unpacked ~2.5 MB vs full `googleapis` ~246 MB — matters for the standalone image and `npm ci` time (`STACK.md:17`) |
| `google-auth-library` | 11.3.4 | `GoogleAuth` / `JWT` service-account credential + token refresh | Required for SA auth; already transitive via `googleapis-common@^9` but declared explicitly to pin (`STACK.md:18,236`). `engines: node >=22` — matches `node:22-alpine` |
| `file-type` | 22.3.0 | Magic-byte MIME sniffing | Phase 46 does not yet validate uploads (FILE-09 is Phase 49), but the dependency is locked in `46-CONTEXT.md:70` and installed this phase so later phases need no lockfile churn. **ESM-only** (`"type": "module"`, `exports` → `./source/index.js`) — never `require()` it |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 4.1.5 (already installed) | Unit tests for env validation, probe classification, bytea round-trip | Existing suite; **no new test runner** |
| `server-only` | latest | Compile-time guard so `src/lib/drive.ts` can never be imported from a client component (W10) | Optional but recommended — see Don't Hand-Roll. Not currently installed (`STACK.md` does not list it) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@googleapis/drive` | full `googleapis` package | 100× larger unpacked; bloats image, slows `npm ci`, includes dozens of unused APIs (`STACK.md:193`). Never. |
| `@googleapis/drive` | raw `fetch` to Drive REST | Loses typings, retry, multipart-boundary handling, `alt=media`. Not worth it (`STACK.md:184`). |
| `drive.file` scope | `drive` / `drive.readonly` + `domains` delegation | Over-privileged; requires Workspace admin setup; contradicts FILE-04 (`STACK.md:194`) |
| `instrumentation.ts` `register()` | lazy `ensureDriveProbe()` on first import of `getDriveClient()` | Lazy probe cannot fail-fast before Docker's healthcheck window, and it re-runs under `next dev` HMR. `register()` is the correct hook. |

**Installation:**
```bash
npm install @googleapis/drive@27.1.0 google-auth-library@11.3.4 file-type@22.3.0
# optional W10 guard:
npm install server-only
```

**Version verification:** confirmed against the live npm registry in this session — `npm view @googleapis/drive version` → `27.1.0`; `npm view google-auth-library version` → `11.3.4`; `npm view file-type version` → `22.3.0`; `npm view file-type type` → `module`; `npm view file-type engines` → `{"node":">=22"}`. [VERIFIED: npm registry]

## Package Legitimacy Audit

Ran `gsd-tools query package-legitimacy check --ecosystem npm` (plain package names — passing `name@version` returns a false `SLOP`/`does-not-exist` verdict because the seam does not strip a version suffix; verified in this session).

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `@googleapis/drive` | npm | published 2026-11-12 | 1,832,982/wk | github.com/googleapis/google-api-nodejs-client | SUS | Flagged — `too-new` only |
| `google-auth-library` | npm | published 2026-11-09 | 135,983,338/wk | github.com/googleapis/google-cloud-node | SUS | Flagged — `too-new` only |
| `file-type` | npm | published 2026-10-29 | 79,826,921/wk | github.com/sindresorhus/file-type | SUS | Flagged — `too-new` only |

**Why `SUS` here is not a slopsquat signal:** the sole reason returned for all three is `too-new`, and the registry `publishedAt` timestamp is the publish date of the **latest version** (which is exactly the version we researched: 27.1.0 / 11.3.4 / 22.3.0). All three are official vendor orgs (`googleapis/…`, `sindresorhus/…`) with 80M–136M weekly downloads and no `postinstall` script. `too-new` on the latest tag is a normal burst-release artifact. Disclaimer documented in research; **not** re-litigated as a package choice.

**Packages removed due to [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** `@googleapis/drive`, `google-auth-library`, `file-type` — planner inserts one `checkpoint:human-verify` task before the install step, confirming the three exact versions against `STACK.md:17-18,101`.

## Architecture Patterns

### System Architecture Diagram

```
                          ┌──────────────────────────────────────────┐
  container start ───────▶│ start.sh: prisma migrate deploy          │
                          │   (applies new 46 migration folder)      │
                          └──────────────────┬───────────────────────┘
                                             ▼
                          ┌──────────────────────────────────────────┐
                          │ node server.js                           │
                          │  └─ instrumentation.ts register()        │
                          │       ├─ readRequiredEnv × 3  ──fail────▶│ process exit (D-01/D-07)
                          │       ├─ build Drive client (drive.file) │
                          │       └─ probe files.get(folderId)       │
                          │            ├─ 404 / no driveId / no      │
                          │            │  canAddChildren / invalid_  │
                          │            │  grant  ──fail─────────────▶│ process exit (D-01)
                          │            └─ timeout / 5xx / 429         │
                          │                 └─ state = degraded      │
                          │                    + 60s re-probe timer  │ (D-02/D-03)
                          └──────────────────┬───────────────────────┘
                                             ▼
     GET /api/health ──────────────────────▶ checkHealth()
                                             ├─ SELECT 1 ok + drive ok   → 200 {"status":"ok"}
                                             └─ SELECT 1 ok + degraded   → 200 {"status":"degraded","drive":{...}}
                                                (DB down                            → 503 {"status":"error"})
```

Data flow for the field type (independent of the above):

```
PostgreSQL FieldType enum {…, 'FILE'}  ──ALTER TYPE──  prisma migration
        │
        ▼ (raw SQL row)
src/lib/forms.ts mapFieldType() ──▶ FormFieldType 'file' ──▶ mapPublicFormRowsToDefinition()
                                                                    │ new branch (required)
                                                                    ▼
                                                          PublicFormDefinition.fields[]
admin save ──▶ normalizeAdminFormPayload() allowedTypes Set ──▶ insert field (type='FILE')
                          ▲
                          │ mapFormFieldTypeToDb()  (exhaustive switch, no default)
```

### Recommended Project Structure
```
prisma/migrations/<timestamp>_add_file_upload_tables/
└── migration.sql              # ALTER TYPE FieldType + 2 × CREATE TABLE IF NOT EXISTS
src/lib/
├── drive.ts                   # server-only: cached Drive client + probe + state machine
├── env.ts                     # extend: readRequiredEnv-based Drive config accessor
└── health.ts                  # extend: HealthResult union with degraded shape
src/instrumentation.ts          # NEW (does not exist today): export async function register()
src/app/api/health/route.ts     # unchanged behaviour on success; degraded branch added
.env.example                    # + 3 vars
Dockerfile                      # + 3 build-time placeholder ENV lines
docker-compose.yml              # + 3 vars in the `app-env` anchor
```

### Pattern 1: Adding a field type end-to-end (FILE-01)

**What:** Four `src/lib/forms.ts` sites must all change together, and two of them will not fail loudly if missed.

**When to use:** Any new `FieldType` / `FormFieldType` member.

**Example — the exact sites and their failure modes:**

```ts
// src/lib/forms.ts:27 — DB vocabulary
type FieldType = 'SHORT_TEXT' | 'LONG_TEXT' | 'RADIO' | 'SELECT' | 'YES_NO' | 'SIGNATURE' | 'CHECKBOX' | 'FILE'

// src/lib/forms.ts:31 — domain vocabulary
export type FormFieldType = 'text' | 'textarea' | 'radio' | 'select' | 'likert' | 'signature' | 'yes_no' | 'checkbox' | 'file'

// src/lib/forms.ts:78 — union member (new interface, e.g. FileField, required by FILE-06 config in Phase 47)
export type FormField = TextField | RadioField | SelectField | SignatureField | YesNoField | CheckboxField | FileField

// src/lib/forms.ts:499 mapFieldType — SILENT null if omitted (no compile error)
    case 'FILE':
      return 'file'

// src/lib/forms.ts:1731 mapPublicFormRowsToDefinition — falls through to the text-shaped
// default at :1799 which sets `maxLength` + `placeholder`. Add an explicit branch BEFORE :1799:

    if (mappedType === 'file') {
      return [{ id: field.id, name, label: field.label, type: mappedType, required: field.required, ...copyProps }]
    }

// src/lib/forms.ts:2670 mapFormFieldTypeToDb — exhaustive switch, NO default
// → omitting a case is a HARD tsc error (the compiler is your safety net here)
    case 'file':
      return 'FILE'

// src/lib/forms.ts:2815 allowedTypes — SILENT 400 "Tipe field tidak valid" on admin save if omitted
  const allowedTypes = new Set<FormFieldType>(['text', …, 'checkbox', 'file'])
```

**Verification signal ranking:** `tsc` catches #5 only. `forms.ts` existing test file is `src/lib/forms.test.ts` — add cases that round-trip `'FILE'` through `mapFieldType` → `resolveFormFieldType` → `mapPublicFormRowsToDefinition` → `mapFormFieldTypeToDb`.

### Pattern 2: Migration DDL style (FILE-02, FILE-03, D-11, D-12)

**What:** Copy the `IF NOT EXISTS`-everywhere style so re-runs are idempotent; name the migration folder so it sorts after the newest checked-in migration (`20261001000000_add_checkbox_field_type`).

**Example — enum precedent, verbatim:**

```sql
-- prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql (whole file)
-- AlterEnum
ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'CHECKBOX';
```

**Example — table precedent, structurally (from `20260406160000_add_submission_jobs/migration.sql`):**

```sql
CREATE TABLE IF NOT EXISTS "submission_jobs" (
  "id" TEXT NOT NULL,
  …
  CONSTRAINT "submission_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "submission_jobs_submission_id_key" ON "submission_jobs" ("submission_id");
CREATE INDEX IF NOT EXISTS "submission_jobs_status_available_idx"
  ON "submission_jobs" ("status", "available_at", "created_at");
CREATE UNIQUE INDEX IF NOT EXISTS "submission_jobs_dedupe_key"
  ON "submission_jobs" (…) WHERE …;
```

Apply the same shape to `submission_files` and `file_upload_jobs`. Status column values per D-09 (`PENDING|SYNCED|FAILED|ORPHANED` on `submission_files`) and per FILE-03 (`PENDING|CLAIMED|DONE|FAILED` on `file_upload_jobs`) — **two different vocabularies, intentionally.** Note `submission_jobs` uses `PENDING/PROCESSING/DONE/FAILED`; D-09 explicitly says do **not** copy that.

**Important ordering constraint:** `ALTER TYPE … ADD VALUE` cannot run inside a transaction block on older Postgres, but `prisma migrate deploy` runs each migration file's statements — the CHECKBOX precedent proves a bare `ALTER TYPE … ADD VALUE IF NOT EXISTS` in its own migration works in this repo. If the same file also creates tables, put the `ALTER TYPE` **first** (as the CHECKBOX precedent does not have a table in it, this is new territory — split into two folders if `migrate deploy` complains, but that contradicts D-11's "one folder `…_add_file_upload_tables`". Recommend: single folder, `ALTER TYPE` first, verify with a real `migrate deploy` on a copy of the existing DB before merge.)

### Pattern 3: Startup probe placement — `src/instrumentation.ts` `register()` (D-01..D-04)

**What:** Next.js 16 supports `instrumentation.ts` at project root **or inside `src/`**; `register()` is called once when a new server instance starts and **must complete before the server is ready to handle requests** — which is exactly what "fail-fast before Docker healthcheck or k6 sees a request" needs.

**Confidence:** HIGH — official Next.js docs, `v15.0.0` makes `instrumentation` stable, `v16` unchanged. [CITED: nextjs.org/docs/app/api-reference/file-conventions/instrumentation]

**Caveat (MEDIUM):** community reports (Next 14/15, `output: standalone`) show `instrumentation.ts` at the **project root** sometimes not executing in production, but executing when placed in `src/`. This repo uses `src/` (with `src/app/…`), so `src/instrumentation.ts` is the low-risk choice. Verify with a `console.log` on container boot before relying on fail-fast. [CITED: github.com/vercel/next.js/discussions/68420]

**Example:**

```ts
// src/instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { startDriveProbe } = await import('./lib/drive')
  await startDriveProbe() // throws on permanent errors → process exits non-zero → Docker restarts → still fails → visible
}
```

### Pattern 4: `/api/health` shape preservation (D-04, D-05)

**What:** Today `HealthResult` is `{ status: 'ok' }` (`src/lib/health.ts:3-5`), `checkHealth()` runs `SELECT 1` and returns it, and the route does `NextResponse.json(result, { status: 200 })` (`src/app/api/health/route.ts:5-8`). Docker's healthcheck is `fetch(...).then(r => process.exit(r.ok ? 0 : 1))` (`docker-compose.yml:32-39`) — **it only checks `response.ok`**, not the body. But k6 and any operator dashboard may parse the body, and D-05 requires the healthy body remain exactly `{"status":"ok"}`.

**Example:**

```ts
// src/lib/health.ts — extend the union
export type HealthResult =
  | { status: 'ok' }
  | { status: 'degraded'; drive: { state: 'degraded'; reason: string } }

export async function checkHealth(): Promise<HealthResult> {
  await prisma.$queryRaw`SELECT 1`
  const drive = getDriveState()          // synchronous read of module-level state
  if (drive.state === 'ok') return { status: 'ok' }
  return { status: 'degraded', drive: { state: 'degraded', reason: drive.reason } }
}
```

The route already returns HTTP 200 for both — do **not** add a special-case status for degraded. Only the DB-failure path stays 503.

**Test that locks it:** `expect(JSON.stringify(await checkHealth())).toBe('{"status":"ok"}')` in the healthy fake — an exact-string assertion is the cheapest regression guard for D-05.

### Pattern 5: Drive client — module-level singleton with `globalThis` pin (D-03, STACK.md:24-44,223-228)

**What:** Build once, cache on `globalThis` so `next dev` HMR does not re-auth, and so the 60s re-probe timer survives HMR reloads.

```ts
// src/lib/drive.ts (sketch — planner fleshes out)
import 'server-only'                        // optional W10 guard
import { GoogleAuth } from 'google-auth-library'
import { drive, type drive_v3 } from '@googleapis/drive'

const g = globalThis as { __drive?: drive_v3.Drive; __driveState?: DriveState; __driveTimer?: NodeJS.Timeout }

function buildDriveClient() {
  const auth = new GoogleAuth({
    credentials: {
      client_email: readRequiredEnv(process.env, 'GOOGLE_SERVICE_ACCOUNT_EMAIL'),
      private_key: readRequiredEnv(process.env, 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })
  return drive({ version: 'v3', auth })
}
```

### Anti-Patterns to Avoid

- **Probing with `drive.drives.get`** — needs `drive`/`drive.readonly` scope; contradicts FILE-04. Use `files.get` + `driveId` field instead.
- **Using `drive.files.list` to verify the folder** — requires `corpora=allDrives`/`drive` + `includeItemsFromAllDrives=true`, more surface area, more room to get wrong. A single `files.get` on the known folder ID is enough.
- **Throwing on transient errors in `register()`** — D-02 forbids it; a Google 429 must not kill the whole site.
- **Changing the healthy `/api/health` body** — D-05; Docker compose healthcheck only reads `response.ok` so a body change would be silent, but k6 and operators break.
- **Returning 503 on degraded Drive** — that would let a Google outage mark the container unhealthy and Docker would restart-loop the app forever.
- **`permissions.create({ type: 'anyone' })`** — violates milestone "no anyone-with-link" (`STACK.md:195`, FILE-19 later).
- **`require('file-type')`** — it is ESM-only; `import { fileTypeFromBuffer } from 'file-type'`.
- **Putting real SA keys in `Dockerfile` ENV or `docker-compose.yml` literals** — W10, PITFALLS.md:37-58. Only `${VAR:?...}` patterns and build-time fake placeholders.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Service-account JWT minting + refresh | Custom RSA signing with `crypto` | `google-auth-library` `GoogleAuth` | Token refresh, clock skew, `invalid_grant` surfacing, scope handling — all already correct |
| Drive multipart/resumable upload boundary handling | Manual `multipart/related` assembly | `@googleapis/drive` `files.create({ media })` | Boundary assembly + retry + content-length math is a classic bug farm |
| `bytea` ↔ `Buffer` conversion | Base64 encode/decode around the column | Prisma `$queryRaw`/`$executeRaw` with a `Buffer`/`Uint8Array` arg | adapter-pg already maps `bytes` args (`Buffer.from(arg,'base64')` → `Uint8Array`) and parses `bytea` results via `pg-types` BYTEA parser (see Code Examples) |
| Env presence validation | New validator module | `readRequiredEnv` at `src/lib/env.ts:3-11` | Existing pattern, existing test (`src/lib/env.test.ts`), existing Indonesian error style `` `${name} wajib diisi` `` |
| Migration application | New `scripts/migrate.mjs` | `prisma migrate deploy` already in `start.sh:4` | D-11/D-12; `_prisma_migrations` bookkeeping comes free |
| Compile-time client/server boundary | Manual review / grep | `server-only` package import | One-line guard, fails at build time if `src/lib/drive.ts` is ever imported from a client component |
| Shared Drive detection | `files.get` then a second `drives.get` call | Single `files.get` with `fields: '...,driveId,capabilities.canAddChildren'` | `drives.get` needs an incompatible scope (see Anti-Patterns) |

**Key insight:** Every piece of this phase has an existing in-repo or vendor-library precedent. The only genuinely new construction is *glue* — probe classification, state singleton, health union — and each of those is 10–30 lines.

## Runtime State Inventory

Phase 46 is partly greenfield (new tables, new file) and partly a schema/plumbing change to a **live** system. Answer each category explicitly:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| **Stored data** | Nothing is renamed. New `FILE` enum value is additive. Existing rows in `forms_fields` (or whatever table holds `type`) implicitly become "not FILE" — no migration of data. | None for existing rows. Verify no write path assumes `FieldType` is exhausted (e.g. any `switch` on the DB enum value). `mapFieldType` at `forms.ts:499` returns `null` for unknown values → a legacy row would already have been silently dropped, so no new risk. |
| **Live service config** | **Unverifiable from repo.** Google Workspace tenant must have a real Shared Drive folder, and the SA must be a member (`writer` or `fileOrganizer`). Not visible in git. | Open Question OQ-1/OQ-2. Operator runs the smoke test (ROADMAP.md:46 success criterion #3) with real creds before this phase can be marked done. |
| **OS-registered state** | None — no cron/systemd/Task Scheduler entries reference `FieldType`, the Drive client, or new tables. The 60s re-probe is an in-process `setInterval` on the Node process, not OS-registered. | None |
| **Secrets/env vars** | Three **new** env var names: `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID`. Must be added to: `.env.example` (`.env.example:11` currently lists only `GOOGLE_CLIENT_ID`/`SECRET`), `docker-compose.yml` `app-env` anchor (`docker-compose.yml:12`), `Dockerfile` build-time placeholder block (`Dockerfile:24-30`), and `.env.production` on the operator machine (**not in git**). Note `STACK.md:171-172` used different names (`GOOGLE_SA_*`) — **D-06 wins**, use `GOOGLE_SERVICE_ACCOUNT_*`. | Code edits in 3 tracked files + one **manual** operator step (`.env.production`). Secrets must not be committed (D-08, W10). |
| **Build artifacts / installed packages** | Adding `@googleapis/drive` + `google-auth-library` + `file-type` grows `node_modules` and the standalone trace. **No pre-existing artifact references an old name.** | New `npm ci` + `npm run build` produces a new image. Rebuild `app` + `worker` per AGENTS.md §"Smart Container Rebuild Protocol". |

**Canonical question answered:** *After every file in the repo is updated, what runtime systems still have the old state?* → The operator's local `.env.production` (must gain 3 vars, manual) and the live Google Workspace tenant (Shared Drive folder + SA membership, manual). Nothing else.

## Common Pitfalls

### Pitfall 1: `FILE` plumbed but admin save still rejects it
**What goes wrong:** `mapFieldType` (`forms.ts:499`), `mapFormFieldTypeToDb` (`forms.ts:2670`), and the `FormField` union all get `file`, `tsc` passes, but the admin create-form path throws `400 Tipe field tidak valid` because the `allowedTypes` Set at `forms.ts:2815` was forgotten. Note this Set is used by the admin save/update path — added *in Phase 47* from a user perspective (FILE-06) but built *here* as plumbing. Add it now; it costs one string.
**Why it happens:** `new Set<FormFieldType>([...])` is not exhaustiveness-checked; the literal list is a runtime allowlist.
**How to avoid:** Change the Set to derive from the type's exhaustive map where possible (e.g. invert `mapFormFieldTypeToDb`), or add a unit test asserting `allowedTypes` contains every member of `FormFieldType`.
**Warning signs:** `tsc --noEmit` clean, but `POST /api/admin/forms` returns `400 Tipe field tidak valid` for a `file` field.

### Pitfall 2: `FILE` field silently mis-shaped on the public form
**What goes wrong:** omitting a `'file'` branch in `mapPublicFormRowsToDefinition` (`forms.ts:1731`) means the row falls through to the text default at `:1799`, gaining `maxLength: MAX_TEXT_LENGTH` and `placeholder: field.placeholder`. On a file field those properties are noise; on the client, the renderer selects by `type` so the UI might still work, but the payload is semantically wrong and Phase 47's config UI will be fighting phantom properties.
**Why it happens:** the default branch is a deliberate catch-all for text-like types; there is no type narrowing after `mappedType` is `'file'`.
**How to avoid:** add the explicit `'file'` branch **before** the default; add a test asserting the returned object has `type === 'file'` and **no** `maxLength`.
**Warning signs:** a `FILE` field in the public JSON has `maxLength: 2000`.

### Pitfall 3: Probing at the wrong layer / with the wrong scope
**What goes wrong:** using `drive.drives.get({ driveId })` to verify Shared Drive → `403 insufficientPermissions` because `drive.file` scope cannot read drive-level metadata. Or using `drive.files.get` without `supportsAllDrives: true` → `404 notFound` even though the folder is reachable with the flag. Either way the app fails-fast (D-01) or enters degraded mode (D-02) for the wrong reason.
**Why it happens:** the Shared Drives docs list `supportsAllDrives` on `files.get/list/create/update/copy/delete` + permissions + changes but it is easy to copy a My-Drive-era snippet.
**How to avoid:** probe exactly one call: `drive.files.get({ fileId: process.env.GOOGLE_DRIVE_FOLDER_ID, fields: 'id,name,mimeType,driveId,capabilities.canAddChildren', supportsAllDrives: true })`. Classify on `response.data.driveId` presence and `capabilities.canAddChildren`.
**Warning signs:** A clear `insufficientPermissions` on `drives.get`; or `404` on `files.get` that disappears when the flag is added.

### Pitfall 4: Fail-fast on transient errors kills the public site
**What goes wrong:** a Google 429 or a network blip during `register()` throws, the process exits, Docker restarts, and because Google is still rate-limiting, it loops forever. Public forms are completely down.
**Why it happens:** D-01 lists "credentials invalid" and "folder 404" but it's tempting to also `throw` on any `GaxiosError`.
**How to avoid:** a **classification function** with an explicit allow-list of permanent reasons and everything else classified transient:
- Permanent (fail-fast): HTTP 400/401 with `error.errors[0].reason === 'invalid_grant'` (Google auth errors), HTTP 404 on the folder, response has no `driveId`, `capabilities.canAddChildren === false`, env validation failure.
- Transient (degraded): network/timeout (`no `response``), HTTP 429, HTTP 5xx, any other `GaxiosError` where `error.response` is set but status not in {400, 401, 404}.
- Unit-test the classifier against fixture error objects — never hit real Google in tests.

**Warning signs:** container restart-count climbing while `/api/health` is unreachable.

### Pitfall 5: `\n` unescaping done twice or not at all
**What goes wrong:** `.env.production` stores the PEM with literal `\n` (two chars). If unescaped carefully, one `.replace(/\\n/g, '\n')` turns them into real newlines. If code applies it twice (e.g. once in the env accessor + once in `buildDriveClient`), a legitimate PEM whose base64 body happens to contain `\n` (extremely rare) is corrupted; more commonly the double unescape is harmless but hides a missing unescape somewhere else, and `GoogleAuth` fails with `error:0909006C:PEM routines` or similar.
**Why it happens:** the accessor and the client constructor both know about the escaping.
**How to avoid:** unescape **exactly once**, in the env accessor (`getDriveConfig()` in `src/lib/env.ts`), not in `drive.ts`. Assert `privateKey.includes('BEGIN PRIVATE KEY')` after the single unescape (D-07). Never log the key.
**Warning signs:** `BEGIN PRIVATE KEY` missing in logs → unescape missing; PEM parse error → unescape applied at the wrong layer.

### Pitfall 6: Degraded state leaked into the healthy response
**What goes wrong:** the extended `HealthResult` union is returned as-is for the healthy case too — e.g. `{ status: 'ok', drive: { state: 'ok' } }`. Docker and k6 keep working (only `response.ok`), but D-05's contract is broken and any operator script matching `/\{"status":"ok"\}/` breaks.
**Why it happens:** developers add the Drive field to the happy path for "completeness".
**How to avoid:** the healthy branch of `checkHealth()` returns the literal `{ status: 'ok' }` — no extra keys. The degraded branch returns the `drive` object. Add the exact-string test described in Pattern 4.
**Warning signs:** `curl /api/health` in a healthy container shows more than 15 bytes.

### Pitfall 7: ESM-only `file-type` required from CommonJS context
**What goes wrong:** if anyone imports `file-type` into a module that Next bundles as CJS (e.g. inside a worker script, or a `require`-style dynamic import in a `.cjs`), it throws `ERR_REQUIRE_ESM`. `file-type@22` is `"type": "module"`.
**Why it happens:** `file-type` was ESM-only from v18 onwards; the project already uses ESM imports throughout `src/`, so this is a *future* risk (Phase 49), but add the dependency here and verify the import works in a `vitest` test.
**How to avoid:** `import { fileTypeFromBuffer } from 'file-type'` only. Add Vitest coverage now that imports it once (proves the runner resolves ESM subpath exports).
**Warning signs:** `ERR_REQUIRE_ESM` at build or test time.

### Pitfall 8: Migration ordering vs `prisma migrate deploy` at boot
**What goes wrong:** the new folder timestamp sorts **before** an existing one (e.g. a copy-paste that keeps a 2025 timestamp) → migrate deploy refuses or applies out of order, or an operator with an already-migrated DB sees `_prisma_migrations` drift.
**Why it happens:** copy-paste the CHECKBOX folder and forget to bump the timestamp; newest checked-in is `20261001000000`.
**How to avoid:** the new folder MUST sort after `20261001000000`. `start.sh` already runs `prisma migrate deploy` on boot (`start.sh:4`), so on the next `docker compose up` it will apply — verify against a **copy** of the production DB before deploying to prod.
**Warning signs:** `prisma migrate deploy` logs "There are no migrations to apply" despite a new folder, or "migration couldn't be applied because it was modified after it was applied".

### Pitfall 9: `serverExternalPackages` — unproven gamble
**What goes wrong:** `@googleapis/drive` imports `google-auth-library` (`googleapis-common`) which imports `gaxios` (Node `http`). Next 16's bundler usually handles pure-JS CJS/ESM fine, but standalone tracing sometimes drops a transitive optional dep and you get a runtime `Cannot find module 'gaxios'` from a route that *used* to work in `next dev`.
**Why it happens:** Next tracing only follows `import` statements it can statically analyze; `require`-inside-try patterns and dynamic `import()` from CJS can be missed.
**How to avoid:** CONTEXT.md marks this as an **implementation-time** decision (46-CONTEXT.md:54). Default to *adding nothing* (STACK.md:240 says no entries needed), run `npm run build && NODE_ENV=production node .next/standalone/server.js` locally, and **only if** a module-not-found appears, add `@googleapis/drive` (and/or `google-auth-library`) to `next.config.ts` `serverExternalPackages`. Treat this as a task-level verification step, not a pre-made decision.
**Warning signs:** standalone server crashes on a route that imports `src/lib/drive.ts` with `MODULE_NOT_FOUND`.

### Pitfall 10: Smoke test proves HTTP 200, not "file in Shared Drive"
**What goes wrong:** the smoke test asserts `drive.files.create` returned a non-empty `id` and stops there. A My-Drive upload also returns an `id` — but a service account has **no My Drive quota**, so it 403s *at upload time*, and the current Phase 46 codepath would degrade. But if the upload ever succeeds to the SA's own Drive (via quota sharing), the file is invisible to the team.
**Why it happens:** ROADMAP.md:46 success criterion #3 explicitly says "the file actually appears in the configured **Shared Drive** folder … not merely returns HTTP 200" — this is the concrete implementation of W1, the milestone's non-negotiable.
**How to avoid:** the smoke test MUST, after a successful upload:
  1. `drive.files.get({ fileId: response.data.id, fields: 'id,name,parents,driveId,trashed' })` with `supportsAllDrives: true`
  2. Assert `response.data.driveId === <the driveId returned by the probe on the target folder>`
  3. Assert `response.data.parents` contains `GOOGLE_DRIVE_FOLDER_ID`
  4. Optionally, as an independent second witness: the human operator opens the Shared Drive in the browser and finds the file.
**Warning signs:** smoke test passes in CI with mocked client — that's a *different* test, it's fine, but it must not be counted as the W1 proof.

## Code Examples

Verified patterns from official sources and from this repo's installed dependencies.

### Env accessor extension (D-06, D-07, FILE-05)

```ts
// src/lib/env.ts — extend, do not replace
import { readRequiredEnv } from './env' // self-import in same file is just illustrative; inline below

export interface DriveConfig {
  clientEmail: string
  privateKey: string
  folderId: string
}

export function getDriveConfig(env: EnvSource = process.env): DriveConfig {
  const clientEmail = readRequiredEnv(env, 'GOOGLE_SERVICE_ACCOUNT_EMAIL')
  const privateKeyRaw = readRequiredEnv(env, 'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')
  const privateKey = privateKeyRaw.replace(/\\n/g, '\n') // unescape exactly ONCE, here
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY tidak valid') // D-07
  }
  const folderId = readRequiredEnv(env, 'GOOGLE_DRIVE_FOLDER_ID')
  return { clientEmail, privateKey, folderId }
}
```

Existing `readRequiredEnv` (`src/lib/env.ts:3-11`) already throws `` `${name} wajib diisi` `` — reuse; add tests alongside `src/lib/env.test.ts`.

### bytea round-trip via `@prisma/adapter-pg` 7.4.2 (FILE-03, D-10)

**Confirmed by inspecting the installed adapter source, not assumed:**

- **Write path** — `node_modules/@prisma/adapter-pg/dist/index.mjs` `mapArg()` (line ~346):
  ```js
  if (typeof arg === "string" && argType.scalarType === "bytes") return Buffer.from(arg, "base64");
  if (ArrayBuffer.isView(arg)) return new Uint8Array(arg.buffer, arg.byteOffset, arg.byteLength);
  ```
  → Pass a `Buffer` or `Uint8Array` as a `$executeRaw`/`$queryRaw` argument and Prisma/sql-template passes it through to `pg` unchanged.

- **Read path** — same file `customParsers` registers `[ScalarColumnType.BYTEA]: convertBytes`, where `convertBytes = parsePgBytes = getTypeParser(ScalarColumnType.BYTEA)` from `pg-types`. And `node_modules/pg-types/lib/textParsers.js:201` registers `17` (the BYTEA OID) → `postgres-bytea` parser, which returns a `Buffer`.

- `SqlResultSet.rows` is `Array<Array<unknown>>` (`node_modules/@prisma/driver-adapter-utils/dist/index.d.ts:361-364`) — at the Prisma Client layer, `$queryRaw` returns the raw driver values, so a `bytea` column surfaces as a `Buffer` regardless of whether the Prisma type is `Bytes` (`node_modules/@prisma/client/runtime/client.d.ts:178-180` defines `Bytes = ReturnType<Uint8Array['slice']>`).

```ts
// write
const buf = Buffer.from(arrayBuffer)
await prisma.$executeRaw`INSERT INTO file_upload_jobs (id, file_id, payload, payload_mime, ...) VALUES (${id}, ${fileId}, ${buf}, ${mime}, ...)`

// read
const rows = await prisma.$queryRaw<{ payload: Buffer | null; mime: string }[]>`
  SELECT payload, payload_mime AS mime FROM file_upload_jobs WHERE id = ${jobId}
`
```

`[VERIFIED: node_modules/@prisma/adapter-pg@7.4.2 source inspection]` — not from docs, from the exact installed code.

### Drive probe + classifier (D-01, D-02, FILE-04)

```ts
// src/lib/drive.ts — sketch
import 'server-only'
import { GoogleAuth } from 'google-auth-library'
import { drive, type drive_v3 } from '@googleapis/drive'
import { GaxiosError } from 'gaxios'   // re-exported via google-auth-library transitively

interface ProbeResult { state: 'ok'; driveId: string } | { state: 'degraded'; reason: string }

async function probe(client: drive_v3.Drive, folderId: string): Promise<ProbeResult> {
  try {
    const res = await client.files.get({
      fileId: folderId,
      fields: 'id,name,mimeType,driveId,capabilities(canAddChildren)',
      supportsAllDrives: true,
    })
    const { driveId, capabilities } = res.data
    if (!driveId) {
      throw new PermanentDriveError(`Folder ${folderId} bukan Shared Drive (tidak ada driveId)`) // D-01
    }
    if (!capabilities?.canAddChildren) {
      throw new PermanentDriveError(
        `Service account tidak punya izin tulis ke folder ${folderId} (butuh writer/fileOrganizer)`
      )
    }
    return { state: 'ok', driveId }
  } catch (err) {
    if (err instanceof PermanentDriveError) throw err
    if (isPermanentAuthError(err)) throw new Error(`Kredensial Google invalid: ${describeSafe(err)}`) // D-01
    return { state: 'degraded', reason: describeSafe(err) } // D-02
  }
}
```

Classification helper — the exact shape of a Gaxios error from `@googleapis/drive` (gaxios v7, which `googleapis-common@^9` depends on):
`error.response.status` (HTTP number), `error.response.data.error.errors[0].reason` (e.g. `'notFound'`, `'insufficientPermissions'`, `'invalid_grant'`), `error.config.url`. Auth failures from `google-auth-library` surface as `GaxiosError` with `response.status === 400` and `response.data.error === 'invalid_grant'`. `[CITED: workos.com/blog/invalid-grant-oauth-errors-by-provider + github.com/googleapis/google-cloud-python/issues/3100]`

```ts
function isPermanentAuthError(err: unknown): boolean {
  const e = err as { response?: { status?: number; data?: { error?: string } } } | undefined
  if (!e?.response) return false                    // no response → network → transient (D-02)
  const status = e.response.status ?? 0
  const code = e.response.data?.error
  if (code === 'invalid_grant') return true         // D-01
  if (status === 401) return true                   // bad credentials, D-01
  if (status === 404) return true                   // folder not found, D-01
  return false                                      // 429, 5xx, other 4xx → transient
}
```

### Background re-probe (D-03)

```ts
// module-level, pinned to globalThis so HMR + hot-restart do not double-register
const g = globalThis as { __driveProbeTimer?: NodeJS.Timeout; __driveState?: ProbeResult }

export function scheduleReprobe(client: drive_v3.Drive, folderId: string) {
  if (g.__driveProbeTimer) return
  g.__driveProbeTimer = setInterval(async () => {
    if (g.__driveState?.state === 'ok') return
    try {
      g.__driveState = await probe(client, folderId)
      if (g.__driveState.state === 'ok') console.info('[drive] recovered — leaving degraded mode')
    } catch (err) { /* permanent error on re-probe: log and keep last state, do NOT exit — D-03 says recover, not re-fail */ }
  }, 60_000)
  g.__driveProbeTimer.unref?.()          // do not hold the process alive on graceful shutdown
}
```

### Docker placeholder block (D-08, STACK.md:247-253)

```dockerfile
# Dockerfile:24-30 pattern, extend with 3 lines:
ENV GOOGLE_SERVICE_ACCOUNT_EMAIL="build-time-placeholder@build.iam.gserviceaccount.com"
ENV GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="build-time-placeholder"
ENV GOOGLE_DRIVE_FOLDER_ID="build-time-placeholder"
```

These are **fake** values, used only so `next build` module evaluation doesn't crash on a missing env. Real values come from `docker-compose.yml` at run time, sourced from `.env.production` (`${VAR:?...}` pattern at `docker-compose.yml:13-20`). Never commit real values.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `experimental.instrumentationHook: true` required in `next.config.ts` | `instrumentation.ts` stable, flag removed | Next.js 15.0.0 | Simplifies config; `register()` fires automatically with no flag — do NOT add the flag to `next.config.ts` |
| `googleapis` full package as the Drive client | Scoped `@googleapis/drive` subpackage | Recent vendor split | 100× smaller install; typings unchanged (`drive_v3.Drive`) |
| `request.formData()` on huge bodies is "fine" | Still fine at 10 MB, but route handler body size limits are explicit in Phase 49 (FILE-26) — **not** Phase 46's concern | — | Note for plan-checker: do not scope-creep into FILE-26 |

**Deprecated / outdated in this repo:**
- N/A — nothing in scope here is deprecated. The `README.md` stock port 3000 is stale (AGENTS.md) but not touched by this phase.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@googleapis/drive` + `google-auth-library` need **no** `serverExternalPackages` entry under `output: "standalone"` (inherited from STACK.md:240) | Standard Stack / Pitfall 9 | Standalone build crashes on module-not-found; fix = add to `serverExternalPackages`. CONTEXT.md:54 flags this as implementation-time. Planner should make it a task-level verify step, not a hard dependency. |
| A2 | The migration can put `ALTER TYPE 'FILE'` and two `CREATE TABLE` in one folder (`2026<ts>_add_file_upload_tables/migration.sql`) without `prisma migrate deploy` complaining about `ALTER TYPE` inside a transaction | Architecture Patterns → Pattern 2 | If Postgres/`migrate deploy` refuses, the fix is trivial (split into two folders) but contradicts D-11's folder name; verify against a real DB copy before merge. |
| A3 | `register()` in `src/instrumentation.ts` runs under `output: "standalone"` at container boot | Architecture Patterns → Pattern 3 | Next 14/15 reports say it does from `src/`; add a `console.log` on first container boot to confirm before relying on fail-fast. Fallback: lazy `ensureDriveProbe()` on first `getDriveClient()` import. |
| A4 | A probe error with `response.status === 400` and `data.error === 'invalid_grant'` is how `google-auth-library` surfaces bad SA credentials | Code Examples → classifier | Docs and community issues agree, but the exact wrapper shape (`GaxiosError` vs `.cause`) varies across google-auth-library majors. Cover with a unit test asserting the classifier on a hand-crafted error object; if the real error shape differs, loosen to `response.status in {400,401}` + string-match on `data.error_description?.includes('invalid')`. |
| A5 | `drive.files.get` with `fields: 'driveId,capabilities(canAddChildren)'` and `supportsAllDrives: true` is sufficient to prove "this is a Shared Drive the SA can write to" | Architectural Responsibility Map / Pattern 5 | If `driveId` is absent for other reasons (e.g. SA can see the folder but it's a shortcut), the probe may misfire. Real smoke test in this phase (OQ-1) is the ground truth. |
| A6 | `server-only` package is appropriate and not already installed | Standard Stack / Don't Hand-Roll | Confirmed not in `package.json` `dependencies`/`devDependencies`. Adding it is an extra install — if the team prefers a lint rule instead, easy to swap. |
| A7 | The `file-type` dependency being installed in Phase 46 (unused for validation yet) is acceptable scope | Standard Stack | CONTEXT.md:70 locks it as a milestone package; if the planner prefers to defer the install to Phase 49, that's a scope call, not a research blocker. |

**If this table is not empty:** the planner should gate A1, A2, A3 behind in-task verification steps; A4 behind a unit test; A5 behind the real smoke test (which is already mandated by ROADMAP.md:46 #3); A6 behind a `checkpoint:human-verify` if the team has opinions on the extra dependency; A7 is a scope question for the planner.

## Open Questions

1. **OQ-1 — Does a real Shared Drive exist, and is the SA a member?**
   - **What we know:** the milestone's non-negotiable (W1) is "service account has no My Drive quota; uploads must land in a Shared Drive the SA has been added to". ROADMAP.md:46 requires the phase to prove this with a smoke test.
   - **What's unclear:** whether the operator's Google Workspace tenant already has a Shared Drive folder, its `driveId`, and the folder ID. None of this is in the repo and it cannot be inferred.
   - **Recommendation:** the phase's first task should be a **`checkpoint:human-verify` prerequisite** — operator supplies `.env.production` with real `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, `GOOGLE_DRIVE_FOLDER_ID` and confirms the SA has been added to the Shared Drive as `writer` or `fileOrganizer`. Then the smoke test runs against it.

2. **OQ-2 — Which Shared Drive role does the SA need?**
   - **What we know:** Google offers roles `viewer`, `commenter`, `contributor`, `writer`, `fileOrganizer`, `organizer` — a service account **cannot be `owner`** (that role is reserved for human accounts in a Workspace domain). `contributor` cannot create files in a Shared Drive (it can only add files it already owns, and the SA owns nothing — no My Drive quota).
   - **What's unclear:** whether the operator prefers `writer` (can create/delete own files) or `fileOrganizer` (can move/delete any file in the drive). Both satisfy `canAddChildren: true` on the target folder. `writer` is the least privilege.
   - **Recommendation:** default `writer`; document in the operator checkpoint. `fileOrganizer` only if a later GC phase (50) needs the SA to delete files it does not own.

3. **OQ-3 — Does `prisma migrate deploy` on `start.sh:4` accept `ALTER TYPE … ADD VALUE` and `CREATE TABLE` in one migration file on the postgres version in use?**
   - **What we know:** the CHECKBOX precedent does only `ALTER TYPE`; the jobs precedent does only tables; **no existing migration mixes both**. `ALTER TYPE … ADD VALUE` is transaction-restricted on PostgreSQL < 12 in some cases and `migrate deploy` wraps each file in a transaction (unverified in this repo's PG version).
   - **What's unclear:** the exact PostgreSQL version in production — `docker-compose.yml` pulls `postgres` image; tag not shown in this session.
   - **Recommendation:** verify with a dry run against a copy of the production DB before merge; if it fails, split into two migration folders (`…_add_file_field_type` + `…_add_file_upload_tables`) — this costs a slight bend of D-11's single-folder name but preserves D-11/D-12's "one folder per logical change, all recorded in `_prisma_migrations`" spirit.

4. **OQ-4 — Does `@googleapis/drive` need `serverExternalPackages`?**
   - **What we know:** STACK.md:240 says no. CONTEXT.md:54 says prove it.
   - **What's unclear:** whether Next 16.2.4's trace catches `gaxios` transitively under `output: "standalone"` in *this* project.
   - **Recommendation:** task-level verify step: `npm run build && NODE_ENV=production node .next/standalone/server.js`, hit a route that imports `src/lib/drive.ts`, confirm no `MODULE_NOT_FOUND`. Add to `serverExternalPackages` **only if** needed.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | runtime (Drive client `engines: >=22`) | ✓ (assumed — Dockerfile uses `node:22-alpine`) | 22 (per `Dockerfile:53-55` base) | — |
| `npx prisma` CLI | `migrate deploy` in `start.sh:4` | ✓ (project dep `prisma ^7.4.2`) | 7.4.2 | — |
| PostgreSQL | both new tables + `_prisma_migrations` | ✓ (compose service `postgres`) | tag not captured in this session — see OQ-3 | — |
| Internet egress from `app` container to `oauth2.googleapis.com` and `www.googleapis.com` | SA token exchange + Drive API | **unknown** (firewall/proxy not visible from repo) | — | If egress is blocked, app fails-fast (D-01 treats auth failure as permanent) — must be verified with the smoke test |
| Google Workspace Shared Drive folder + SA membership | FILE-04 smoke test | **unknown** — see OQ-1 | — | None — this is the milestone blocker |
| `.env.production` with 3 Drive vars | boot-time validation (D-07) | **unknown** — operator machine, not in git | — | None — boot fails until supplied |

**Missing dependencies with no fallback:**
- Real Shared Drive folder + SA membership + real credentials (OQ-1). Without these, Phase 46 cannot be *proven* complete — a mocked smoke test does not satisfy ROADMAP.md:46 #3.

**Missing dependencies with fallback:**
- Outbound egress: if blocked, document in the operator checkpoint as a required network-policy change; the app will fail-fast on the first boot with a clear error, which is acceptable behaviour per D-01.

## Validation Architecture

`workflow.nyquist_validation: true` in `.planning/config.json` — this section is required.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | `vitest@^4.1.5` (installed, in `devDependencies`) |
| Config file | `vitest.config.ts` (node env, `include: ['src/**/*.test.{ts,tsx}']`, alias `@ → ./src`, `env.DATABASE_URL` stub) |
| Quick run command | `npx vitest run src/lib/env.test.ts src/lib/forms.test.ts` |
| Full suite command | `npm test` (`vitest run`) |

Existing tests that this phase will extend: `src/lib/env.test.ts`, `src/lib/forms.test.ts`. No DB integration harness exists in the repo (no `tests/` dir with fixtures; DB access is via `prisma.$queryRaw` against a live dev DB). The bytea round-trip test therefore needs either (a) a mocked `prisma` object, or (b) skipping in CI and running against a dev DB. Recommend (a).

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| FILE-01 | `mapFieldType('FILE') → 'file'`; `mapFormFieldTypeToDb('file') → 'FILE'`; round-trip via `mapPublicFormRowsToDefinition` returns `type:'file'` with **no** `maxLength`; `allowedTypes` Set contains `'file'` | unit | `npx vitest run src/lib/forms.test.ts -t 'FILE'` | ❌ Wave 0 (add to `src/lib/forms.test.ts`) |
| FILE-02 | Migration SQL is syntactically valid & `IF NOT EXISTS`-guarded; `submission_files` columns match ROADMAP.md:44 | integration (manual or `prisma migrate deploy` against a scratch DB) | (manual) `docker compose run --rm app ./node_modules/.bin/prisma migrate deploy` on a copy | ❌ Wave 0 — new migration, only verifiable live. Document as `checkpoint:human-verify` |
| FILE-03 | Same for `file_upload_jobs`; bytea round-trip: `INSERT payload=Buffer` → `SELECT` returns a `Buffer` of identical bytes | unit (with mocked `prisma`) + integration (live DB) | `npx vitest run src/lib/file-jobs.test.ts` (new) | ❌ Wave 0 (new) — mock covers the shape assertion; live DB run is manual |
| FILE-04 | Probe classifier: permanent (404, no driveId, `canAddChildren:false`, `invalid_grant`, 401) throws; transient (`no response`, 429, 5xx) returns `{state:'degraded'}`. Not the real Drive call — the *classifier*. | unit | `npx vitest run src/lib/drive-probe.test.ts` (new) | ❌ Wave 0 (new) |
| FILE-04 (real) | Real smoke test: upload a real file → `files.get` shows `driveId` and `parents` contains `GOOGLE_DRIVE_FOLDER_ID` → file visible in the Shared Drive | manual / `checkpoint:human-verify` | `node scripts/ci-drive-smoke.mjs` (new, only runs with real env) | ❌ Wave 0 (new) — **must not be mocked in CI to satisfy W1** |
| FILE-05 | `getDriveConfig` throws on missing/blank email/folderId; throws if `privateKey` lacks `BEGIN PRIVATE KEY`; unescapes `\n` exactly once | unit | `npx vitest run src/lib/env.test.ts -t 'Drive'` | ❌ Wave 0 (add to `src/lib/env.test.ts`) |
| D-05 | Healthy `checkHealth()` returns exactly `{"status":"ok"}` (string assertion); degraded returns `{"status":"degraded","drive":{...}}`; route returns HTTP 200 for both | unit | `npx vitest run src/lib/health.test.ts` (new) | ❌ Wave 0 (new) |

### Sampling Rate
- **Per task commit:** `npx vitest run src/lib/env.test.ts src/lib/forms.test.ts` (fast, <5s)
- **Per wave merge:** `npm test && npm run lint && npx tsc --noEmit --pretty false` (AGENTS.md minimum)
- **Phase gate:** full `npm test`, `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build` all green, **plus** the real-drive smoke test (OQ-1) executed and its output recorded, before `/gsd-verify-work`.

### Wave 0 Gaps
- [ ] `src/lib/env.test.ts` — extend with Drive config cases (FILE-05)
- [ ] `src/lib/forms.test.ts` — extend with `FILE` round-trip cases (FILE-01)
- [ ] `src/lib/drive-probe.test.ts` — **new** — classifier matrix (FILE-04)
- [ ] `src/lib/health.test.ts` — **new** — exact-string health contract (D-05)
- [ ] `src/lib/file-jobs.test.ts` — **new** — bytea shape assertion against mocked `prisma.$executeRaw/$queryRaw` (FILE-03)
- [ ] `scripts/ci-drive-smoke.mjs` — **new** — real Drive smoke test, opt-in via env (FILE-04 real proof + W1)
- [ ] No new test framework install needed (vitest 4.1.5 already present)
- [ ] If `file-type` is imported here for the first time, add one import-smoke in a test to prove ESM resolution works under vitest (Pitfall 7)

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high` per `.planning/config.json`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no (Phase 46 does SA auth to Google, not user auth — the SA credential is a machine credential, still covered below under crypto) | — |
| V3 Session Management | no | — |
| V4 Access Control | partial — the SA's Drive scope is an authorization boundary | `drive.file` scope only (never `drive`), SA added to one Shared Drive folder as `writer`; no `permissions.create({type:'anyone'})` |
| V5 Input Validation | yes | `readRequiredEnv` + PEM header check (D-07); env is the only "input" in Phase 46; future upload validation is FILE-09 (Phase 49) |
| V6 Cryptography | yes | **Do not hand-roll RSA PSS signing** — `google-auth-library` does JWT signing; store the private key as a runtime env var (never in git, never in image layers) |
| V7 Error Handling & Logging | yes | Never log `BEGIN PRIVATE KEY` or the raw env value; `describeSafe(err)` in the classifier must strip `error.config.headers.authorization` and any key material before writing to logs; same discipline applies to `file_upload_jobs.last_error` in Phase 50 |

### Known Threat Patterns for {Next.js 16 + @googleapis/drive + pg}

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Service-account key exfiltration via client bundle | Information Disclosure | `server-only` guard in `src/lib/drive.ts`; import only from route handlers / `instrumentation.ts`; never import from `src/components/**` (PITFALLS.md:47) |
| Service-account key exfiltration via container image layers | Information Disclosure | Runtime-only env; `Dockerfile` placeholders are fake (`build-time-placeholder`); verify with `docker history` that real values never appear |
| Service-account key exfiltration via log lines | Information Disclosure | Classification helper logs a **safe description** only; strip `response.data` when it may contain auth echo; add a lint/test that greps for `private_key` in `console.*` calls (simple `rg` check in CI) |
| Overprivileged Drive scope | Elevation of Privilege | `drive.file` scope; SA added only to the target Shared Drive folder, not the whole drive; expected failure = `403 insufficientPermissions` — treat as a **permanent** error with a clear message (D-01) |
| Making files public | Information Disclosure | Do not call `permissions.create({ type: 'anyone' })`; SA-created files in a Shared Drive inherit the Shared Drive's ACL — restricted to its members by default (STACK.md:49, FILE-19) |
| `/api/health` degrades to 503 on Drive outage → Docker restart loop | Denial of Service | Degraded state returns HTTP 200 (D-05); only DB-failure returns 503 |
| Env-injection via health `reason` string | Injection / Info Disclosure | The `reason` in the degraded body must be a sanitized summary (e.g. `"timeout"`, `"HTTP 500"`, `"folder bukan Shared Drive"`) — never raw Gaxios `response.data` or a URL with an embedded token |
| SSRF via `GOOGLE_DRIVE_FOLDER_ID` | Tampering | Folder ID is trusted operator config; validate it matches `^[A-Za-z0-9_-]{10,}$` (no `/`, no URL) before use, and it is only ever interpolated into a Drive API call (not into an HTTP URL constructed in app code) |

**Phase-46-specific security verdict:** the only *new* attack surface introduced by the storage foundation is (a) the service-account credential's existence at runtime, and (b) the health endpoint's `reason` field. Both have a clear, single-line mitigation. The heavyweight upload/file-serving threats (W4/W6) are Phase 49/51, not here.

## Sources

### Primary (HIGH confidence — verified in this session against checked-in code or official docs)
- `nextjs.org/docs/app/api-reference/file-conventions/instrumentation` — `register()` semantics, `src/` placement, v15.0.0 stability. [CITED]
- `github.com/vercel/next.js/discussions/68420` — community report that `src/instrumentation.ts` runs in production `output: standalone` while root placement sometimes does not. [CITED]
- This repo's files (line refs throughout this document): `src/lib/forms.ts`, `src/lib/env.ts`, `src/lib/health.ts`, `src/app/api/health/route.ts`, `src/lib/prisma.ts`, `prisma/schema.prisma`, `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql`, `prisma/migrations/20260406160000_add_submission_jobs/migration.sql`, `start.sh`, `Dockerfile`, `docker-compose.yml`, `.env.example`, `next.config.ts`, `vitest.config.ts`, `package.json`, `src/lib/env.test.ts`.
- `node_modules/@prisma/adapter-pg/dist/index.mjs` + `node_modules/pg-types/lib/textParsers.js` + `node_modules/@prisma/driver-adapter-utils/dist/index.d.ts` — bytea write/read path. [VERIFIED: installed dependency source inspection]
- `npm view @googleapis/drive|google-auth-library|file-type` — versions, engines, module type. [VERIFIED: npm registry]
- `gsd-tools query package-legitimacy check --ecosystem npm` — three SUS verdicts, reasons `too-new` only. [VERIFIED: gsd-tools]

### Secondary (MEDIUM confidence)
- `developers.google.com/drive/api/guides/about-shareddrives` — SA has no My Drive quota; roles `writer`/`fileOrganizer`/`organizer`; SA cannot be `owner`. [CITED]
- `developers.google.com/drive/api/guides/enable-shareddrives` — `supportsAllDrives=true` required on `files.get/list/create/update/copy/delete`, permissions, changes; `files.list` needs `corpora` + `includeItemsFromAllDrives`. [CITED]
- `workos.com/blog/invalid-grant-oauth-errors-by-provider` and `github.com/googleapis/google-cloud-python/issues/3100` — the exact shape of Google SA `invalid_grant` responses (`{ "error": "invalid_grant", "error_description": ... }`). [CITED]

### Tertiary (LOW confidence — flagged for in-implementation confirmation)
- Assumption A4 — Gaxios error wrapping around google-auth-library in `google-auth-library@11.3.4` specifically. Not verified from `google-auth-library`'s own type docs in this session; verify with a unit test in Wave 0.
- Assumption A3 — `register()` firing under `output: standalone` in this exact Next 16.2.4 build. Confirmed by community reports on Next 14/15 + `src/` placement; not confirmed on `next@16.2.4` in this project. Add a boot log.

## Metadata

**Confidence breakdown:**
- **Standard stack:** HIGH — versions verified against npm registry, package names match locked decisions, all three from official vendor repos.
- **Architecture:** HIGH — every recommendation is anchored to a concrete line in this repo or to official Next.js / Google docs; the one genuine gamble (A3, `instrumentation.ts` in standalone) is called out with a fallback.
- **Pitfalls:** HIGH — the four `forms.ts` sites (silent-null mapper, text-default branch, exhaustive switch, allowlist Set) are read directly from the code; the bytea pitfalls come from reading the installed adapter + pg-types source; the rest come from repo research (`PITFALLS.md`) mapped onto concrete lines.
- **Google-tenant-specific claims (OQ-1, OQ-2):** LOW — unverifiable from the repo; the whole point of the phase's smoke test is to close this.
- **Gaxios classifier shape (A4):** MEDIUM — corroborated by multiple community issues, to be locked with a unit test.

**Research date:** 2026-11-16
**Valid until:** 2026-12-16 (30 days — stable stack, but `too-new` package releases and Next 16 patch bumps suggest re-checking versions if the phase slips past a month)
