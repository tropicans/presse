# Phase 46: Foundation — Schema, Field Plumbing, Drive Client & Credentials - Pattern Map

**Mapped:** 2026-11-16
**Files analyzed:** 18 (9 new/modified source, 3 config, 6 test)
**Analogs found:** 18 / 18 (repo has a precedent or a vendor-library precedent for every file)

Verification baseline for every task (AGENTS.md): `npm run lint`, `npx tsc --noEmit --pretty false`, `npm run build`, `npm test`.

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `prisma/migrations/<2026…>_add_file_upload_tables/migration.sql` | migration | schema DDL (batch, idempotent) | `prisma/migrations/20260406160000_add_submission_jobs/migration.sql` + `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql` | exact (composite of two) |
| `prisma/schema.prisma` (`FieldType` enum + 2 models) | schema/model | declarative parity | `prisma/schema.prisma:21-29` (enum), `:152-172` (`SubmissionJob` model) | exact |
| `src/lib/forms.ts` (FILE plumbing, 5 sites) | service (domain) | transform / raw-SQL CRUD | itself — `:27, :31, :78, :499, :1731/1799, :2670, :2815` | exact (in-place edit) |
| `src/lib/env.ts` (`getDriveConfig`) | utility (config) | request-response (boot-time validate) | `src/lib/env.ts:3-18` (`readRequiredEnv`) | exact |
| `src/lib/drive.ts` | service (integration client) | streaming / request-response (Google Drive v3) | `src/lib/prisma.ts` (module-level `globalThis` singleton) | role-match (no Drive code exists) |
| `src/instrumentation.ts` | hook (process bootstrap) | event-driven (one-shot boot) | `src/lib/prisma.ts:31-33` (module init on import) + RESEARCH Pattern 3 | partial (new file convention) |
| `src/lib/health.ts` (extend union) | service | request-response | `src/lib/health.ts:1-11` | exact (in-place edit) |
| `src/app/api/health/route.ts` | route | request-response | `src/app/api/health/route.ts:1-12` | exact (usually unchanged) |
| `src/lib/file-jobs.ts` (bytea insert/claim helpers) | service | file-I/O + CRUD (raw SQL) | `src/lib/forms.ts:1363-1500` (raw SQL insert pattern) | role-match |
| `next.config.ts` (`serverExternalPackages`, conditional) | config | — | `next.config.ts:5` | exact |
| `.env.example` (+3 vars) | config | — | `.env.example:11-19` block style | exact |
| `Dockerfile` (+3 placeholder ENV) | config | — | `Dockerfile:24-30` | exact |
| `docker-compose.yml` (+3 vars in `app-env`) | config | — | `docker-compose.yml:12-28` | exact |
| `src/lib/env.test.ts` (extend Drive cases) | test | unit | `src/lib/env.test.ts:4-22` | exact |
| `src/lib/forms.test.ts` (extend FILE round-trip) | test | unit | `src/lib/forms.test.ts:26-125, 298-328` | exact |
| `src/lib/drive-probe.test.ts` (new) | test | unit (classifier matrix) | `src/lib/env.test.ts:4-22` (pure-function table) | role-match |
| `src/lib/health.test.ts` (new) | test | unit (exact-string contract) | `src/lib/forms.test.ts:26-125` (prisma mock) | role-match |
| `src/lib/file-jobs.test.ts` (new) | test | unit (bytea shape, mocked prisma) | `src/lib/forms.test.ts:30-79` (`$queryRaw`/`$executeRaw` mock) | exact |
| `scripts/ci-drive-smoke.mjs` (new) | script (operational) | file-I/O → Google Drive | `scripts/submission-worker.mjs` (out-of-process Node script) | role-match |

---

## Pattern Assignments

### `prisma/migrations/<2026…>_add_file_upload_tables/migration.sql` (migration, schema DDL)

**Analogs:** `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql` (whole file, 2 lines) and `prisma/migrations/20260406160000_add_submission_jobs/migration.sql` (1-28).

**Enum precedent — copy verbatim shape** (`20261001000000/migration.sql:1-2`):
```sql
-- AlterEnum
ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'CHECKBOX';
```

**Table precedent — copy DDL style** (`20260406160000/migration.sql:1-28`). Note the four conventions that MUST be preserved:

1. `CREATE TABLE IF NOT EXISTS` — re-runnable.
2. `CONSTRAINT "<table>_pkey" PRIMARY KEY ("id")` inside the `CREATE TABLE`, not `ALTER TABLE … ADD PRIMARY KEY`.
3. Every index uses `CREATE [UNIQUE] INDEX IF NOT EXISTS "<table>_<cols>_idx" ON "<table>" (...)`.
4. `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` for `created_at`/`updated_at`; nullable timestamps (`processed_at`) with no default.

```sql
CREATE TABLE IF NOT EXISTS "submission_jobs" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  ...
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "submission_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "submission_jobs_submission_id_key"
ON "submission_jobs" ("submission_id");

CREATE INDEX IF NOT EXISTS "submission_jobs_status_available_idx"
ON "submission_jobs" ("status", "available_at", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "submission_jobs_dedupe_key"
ON "submission_jobs" ("form_id", "dedupe_field_name", "dedupe_value_text")
WHERE "dedupe_field_name" IS NOT NULL AND "dedupe_value_text" IS NOT NULL AND "status" IN ('PENDING', 'PROCESSING', 'COMPLETED');
```

**Phase-46 application:**
- File ordering: `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE';` **first**, then the two `CREATE TABLE IF NOT EXISTS`.
- `submission_files` status vocabulary per D-09: `'PENDING'` default, allowed `PENDING|SYNCED|FAILED|ORPHANED`. Columns per ROADMAP.md:44 and FILE-02 (id, submission_id nullable, field_id nullable, original filename, sanitized filename, mime, size, checksum, storage status, drive_file_id, timestamps).
- `file_upload_jobs` status vocabulary per FILE-03: `PENDING|CLAIMED|DONE|FAILED` — **intentionally different from `submission_jobs`'s `PENDING/PROCESSING/DONE/FAILED`** (D-09 forbids copying the jobs enum).
- `file_upload_jobs` must carry the `bytea` payload column (`"payload" BYTEA NOT NULL`), plus `attempts INTEGER NOT NULL DEFAULT 0` and `next_attempt_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` (FILE-03). Partial claim index: `CREATE INDEX IF NOT EXISTS "file_upload_jobs_status_next_idx" ON "file_upload_jobs" ("status", "next_attempt_at", "created_at");`
- Folder timestamp MUST sort after `20261001000000` (Pitfall 8).
- OQ-3 caveat: verify `ALTER TYPE` + `CREATE TABLE` in one file against a scratch DB copy on `prisma migrate deploy`; if refused, split the folder (holds D-11/D-12 spirit).

**Test:** none automated — `checkpoint:human-verify` running `prisma migrate deploy` against a DB copy (RESEARCH Validation Architecture, FILE-02 row).

---

### `prisma/schema.prisma` (schema parity — FILE-01, FILE-02, FILE-03)

**Analog:** `prisma/schema.prisma:21-29` (`FieldType` enum) + `:152-172` (`SubmissionJob` model).

**Enum parity** (`:21-29`):
```prisma
enum FieldType {
  SHORT_TEXT
  LONG_TEXT
  RADIO
  SELECT
  YES_NO
  SIGNATURE
  CHECKBOX
}
```
→ add `FILE` after `CHECKBOX` (line 28). Order matters only for readability; `ALTER TYPE … ADD VALUE` appends at runtime.

**Model parity** (`:152-172`) — copy field-mapping / index style. This is the model that `file_upload_jobs` mirrors structurally, but with a `Bytes` column:
```prisma
model SubmissionJob {
  id              String      @id
  submissionId    String      @unique @map("submission_id")
  ...
  status          String      @default("PENDING")
  attempts        Int         @default(0)
  lastError       String?     @map("last_error") @db.Text
  availableAt     DateTime    @default(now()) @map("available_at")
  ...
  @@index([status, availableAt, createdAt], map: "submission_jobs_status_available_idx")
  @@map("submission_jobs")
}
```
Conventions to copy: `@map` for every snake_case column, `@db.Text` for free-form `last_error`, `@@index(..., map: "<same name as SQL index>")`, `@@map("<exact table name>")`.

**bytea column:** `payload Bytes @map("payload")` (Prisma `Bytes`), plus `payloadMime String @map("payload_mime")` if the discretion lands on a separate MIME column.

**Parity rule (AGENTS.md "Code Conventions"):** every column in `migration.sql` must appear in the model and vice-versa, or `prisma generate` and `migrate deploy` drift. Edit both in the same commit.

---

### `src/lib/forms.ts` (service, transform + raw-SQL CRUD) — FILE-01

**Analog:** itself. Four sites change behaviorally + one new interface. **Two of the four do not fail at `tsc`.**

**Site 1 — DB vocabulary** (`forms.ts:27`):
```ts
type FieldType = 'SHORT_TEXT' | 'LONG_TEXT' | 'RADIO' | 'SELECT' | 'YES_NO' | 'SIGNATURE' | 'CHECKBOX'
```
→ append `| 'FILE'`.

**Site 2 — domain vocabulary** (`forms.ts:31`):
```ts
export type FormFieldType = 'text' | 'textarea' | 'radio' | 'select' | 'likert' | 'signature' | 'yes_no' | 'checkbox'
```
→ append `| 'file'`.

**Site 3 — union member + new interface** (`forms.ts:65-78`). Copy the `SignatureField` shape (smallest sibling, `:65-67`):
```ts
export interface SignatureField extends BaseField {
  type: 'signature'
}

export interface CheckboxField extends BaseField {
  type: 'checkbox'
  placeholder?: string | null
}

export type FormField = TextField | RadioField | SelectField | SignatureField | YesNoField | CheckboxField
```
→ new `FileField` interface, then add to the union. Phase 46 uses the minimal variant (no config yet); Phase 47 (FILE-06) adds properties:
```ts
export interface FileField extends BaseField {
  type: 'file'
}
export type FormField = TextField | RadioField | SelectField | SignatureField | YesNoField | CheckboxField | FileField
```

**Site 4 — `mapFieldType`** (`forms.ts:499-518`). **SILENT null if omitted** — no `tsc` error because the function returns `FormFieldType | null` and has `default: return null`.
```ts
function mapFieldType(type: FieldType): FormFieldType | null {
  switch (type) {
    case 'SHORT_TEXT':
      return 'text'
    ...
    case 'CHECKBOX':
      return 'checkbox'
    default:
      return null
  }
}
```
→ add `case 'FILE': return 'file'` before `default`.

**Site 5 — `mapPublicFormRowsToDefinition`** (`forms.ts:1731`, branch pattern at `:1777-1797`). Copy the `yes_no`/`checkbox` branch (fewest properties) verbatim, placed **before** the text default at `:1799`:
```ts
    if (mappedType === 'yes_no' || mappedType === 'checkbox') {
      return [{
        id: field.id,
        name,
        label: field.label,
        type: mappedType,
        required: field.required,
        ...copyProps,
      }]
    }

    if (mappedType === 'signature') { ... }
```
→ add:
```ts
    if (mappedType === 'file') {
      return [{
        id: field.id,
        name,
        label: field.label,
        type: mappedType,
        required: field.required,
        ...copyProps,
      }]
    }
```
If omitted, the field falls into **`forms.ts:1799-1809`**, which injects `placeholder` + `maxLength: MAX_TEXT_LENGTH` + `rows: undefined` — semantically wrong for a file (Pitfall 2).

**Site 6 — `mapFormFieldTypeToDb`** (`forms.ts:2670-2688`). Exhaustive switch **with no `default`** — this is the compiler safety net (Pitfall 1 inverse):
```ts
function mapFormFieldTypeToDb(type: FormFieldType): FieldType {
  switch (type) {
    case 'text':
      return 'SHORT_TEXT'
    ...
    case 'checkbox':
      return 'CHECKBOX'
  }
}
```
→ add `case 'file': return 'FILE'`.

**Site 7 — `allowedTypes` allowlist** (`forms.ts:2815`). **SILENT `400 "Tipe field tidak valid"` on admin save** — runtime `Set`, not exhaustiveness-checked (Pitfall 1):
```ts
  const allowedTypes = new Set<FormFieldType>(['text', 'textarea', 'radio', 'select', 'likert', 'signature', 'yes_no', 'checkbox'])
```
→ append `'file'`. Guard with `src/lib/forms.test.ts:298-328`-style test.

**Consumers to verify (read-only during Phase 46):**
- `validateFormSubmission` (`forms.ts:1838-1867`) — file values are validated in Phase 49. Consider that a FILE field with `required: true` will throw the generic `Field "…" wajib diisi` until then; acceptable per CONTEXT scope (plumbing only).
- Raw SQL insert paths (`forms.ts:1462, 1488, 2949, 2977, 3112`) use `${dbType}::"FieldType"` — the cast works as soon as the migration runs. **Do not change these.**

**Edit rule (AGENTS.md):** migration SQL and `forms.ts` raw SQL stay in sync; `prisma/schema.prisma` parity in the same commit.

---

### `src/lib/env.ts` (`getDriveConfig`) — FILE-05, D-06, D-07

**Analog:** `src/lib/env.ts:1-18`.

**Existing helper — reuse, do not duplicate** (`:1-11`):
```ts
type EnvSource = Record<string, string | undefined>

export function readRequiredEnv(env: EnvSource, name: string): string {
  const value = env[name]?.trim()

  if (!value) {
    throw new Error(`${name} wajib diisi`)
  }

  return value
}
```

**Existing config-accessor precedent** (`:13-18`) — the signature to copy (`env: EnvSource = process.env`):
```ts
export function readRequiredEnvList(env: EnvSource, name: string): string[] {
  return readRequiredEnv(env, name)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
```
(Note: current code takes `env` as a required first arg. Follow the RESEARCH sketch's `getDriveConfig(env: EnvSource = process.env)` shape so it is test-injectable, matching how `env.test.ts` passes a literal object as the first arg.)

**Phase-46 addition — RESEARCH Code Examples shape, verbatim:**
```ts
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
Rules:
- Unescape `\n` **exactly once, in this function** — never in `drive.ts` (Pitfall 5).
- Indonesian error strings matching the repo's `wajib diisi` style (security-domain Indonesian convention).
- Optional folder-ID shape defense (SSRF, security section): `if (!/^[A-Za-z0-9_-]{10,}$/.test(folderId)) throw new Error('GOOGLE_DRIVE_FOLDER_ID tidak valid')`.
- Never log `privateKey`.

---

### `src/lib/drive.ts` (service, Google Drive integration) — FILE-04, D-01..D-04

**Analog:** `src/lib/prisma.ts` (module-level `globalThis` singleton + `createXClient()` factory).

**Singleton pattern** (`src/lib/prisma.ts:5-33`):
```ts
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() { ... }

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```
→ `src/lib/drive.ts` uses the same `globalThis`-pin shape, extended with state + timer per RESEARCH Pattern 5:
```ts
const g = globalThis as {
  __drive?: drive_v3.Drive
  __driveState?: ProbeResult
  __driveTimer?: NodeJS.Timeout
}
```

**Client builder** (RESEARCH Pattern 5 — no repo analog for Google SDK):
```ts
import 'server-only'
import { GoogleAuth } from 'google-auth-library'
import { drive, type drive_v3 } from '@googleapis/drive'
import { getDriveConfig } from './env'

function buildDriveClient() {
  const { clientEmail, privateKey } = getDriveConfig()   // unescape already done there
  const auth = new GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })
  return drive({ version: 'v3', auth })
}
```

**Probe** (RESEARCH Pattern 5 / Pitfall 3):
```ts
const res = await client.files.get({
  fileId: folderId,
  fields: 'id,name,mimeType,driveId,capabilities(canAddChildren)',
  supportsAllDrives: true,
})
// !driveId → PermanentDriveError (not a Shared Drive)
// !capabilities?.canAddChildren → PermanentDriveError (SA not a writer)
```

**Classifier** (RESEARCH Pitfall 4, A4):
```ts
function isPermanentAuthError(err: unknown): boolean {
  const e = err as { response?: { status?: number; data?: { error?: string } } } | undefined
  if (!e?.response) return false                    // no response → transient
  const status = e.response.status ?? 0
  if (e.response.data?.error === 'invalid_grant') return true
  if (status === 401) return true
  if (status === 404) return true
  return false                                      // 429, 5xx, other 4xx → transient
}
```

**Re-probe timer** (RESEARCH D-03 sketch) — `setInterval(..., 60_000)`, `g.__driveTimer` guard, `unref?.()`.

**`describeSafe(err)`** — must strip `error.config.headers.authorization` and `response.data` before any `console.*` or `/api/health` `reason` (V7, Pitfall 6, security section). Return one of a small enum of safe strings (`"timeout"`, `"HTTP 500"`, `"folder bukan Shared Drive"`).

**Required exports:** `getDriveState()` (sync), `startDriveProbe()` (async — throws on permanent), `getDriveClient()` (async, lazily builds if needed — Phase 47 consumer), plus `_probe`/`classifyError` internals exported for the unit test (or a `__testing` namespace).

**Anti-patterns to avoid** (from RESEARCH): `drive.drives.get`, `drive.files.list`, `permissions.create({type:'anyone'})`, `require('file-type')`.

---

### `src/instrumentation.ts` (hook, process bootstrap)

**Analog:** `src/lib/prisma.ts:31-33` for "side effect at module import / once" + `src/app/api/health/route.ts:1-12` for `try/catch` structure.

**RESEARCH Pattern 3 — shape only (new file convention, no repo equivalent):**
```ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { startDriveProbe } = await import('./lib/drive')
  await startDriveProbe() // throws on permanent errors → process exits non-zero
}
```
Rules:
- Place at `src/instrumentation.ts` (NOT project root — RESEARCH A3).
- Do **not** add `experimental.instrumentationHook` to `next.config.ts` — stable since Next 15.
- Add one `console.info` at boot to confirm `register()` ran under `output: "standalone"`; remove or downgrade to debug after the verification task passes.
- The throw path is intentional; the catch does not exist here — a permanent error must kill the process.

---

### `src/lib/health.ts` (service, request-response) — D-04, D-05

**Analog:** itself, `src/lib/health.ts:1-11`.

Existing:
```ts
import { prisma } from './prisma'

export interface HealthResult {
  status: 'ok'
}

export async function checkHealth(): Promise<HealthResult> {
  await prisma.$queryRaw`SELECT 1`

  return { status: 'ok' }
}
```

**Extension (RESEARCH Pattern 4):**
```ts
import { prisma } from './prisma'
import { getDriveState } from './drive'

export type HealthResult =
  | { status: 'ok' }
  | { status: 'degraded'; drive: { state: 'degraded'; reason: string } }

export async function checkHealth(): Promise<HealthResult> {
  await prisma.$queryRaw`SELECT 1`
  const drive = getDriveState()
  if (drive.state === 'ok') return { status: 'ok' }   // literal — no extra keys (Pitfall 6)
  return { status: 'degraded', drive: { state: 'degraded', reason: drive.reason } }
}
```
Rules:
- Keep `prisma.$queryRaw\`SELECT 1\`` exactly as-is; it is the DB liveness signal.
- The healthy branch returns the bare literal — do not add `drive: { state: 'ok' }`.
- `reason` must pass through `describeSafe` (already reduced to a small string by `drive.ts`) — never a raw URL or token.

---

### `src/app/api/health/route.ts` (route, request-response) — D-05

**Analog:** itself, `src/app/api/health/route.ts:1-12` — **usually unchanged**.

Existing:
```ts
import { NextResponse } from 'next/server'
import { checkHealth } from '@/lib/health'

export async function GET() {
  try {
    const result = await checkHealth()
    return NextResponse.json(result, { status: 200 })
  } catch (error) {
    console.error('Health check failed', error)
    return NextResponse.json({ status: 'error' }, { status: 503 })
  }
}
```
Every response path already returns `res.ok` for degraded (HTTP 200) and `503` only for the DB-throw path. Docker healthcheck (`docker-compose.yml:32-41`) only reads `response.ok`. **No edit needed** unless the `NextResponse.json(result)` widening of `HealthResult` causes a type complaint — then narrow explicitly:
`return NextResponse.json(result satisfies HealthResult, { status: 200 })`.

---

### `src/lib/file-jobs.ts` (service, bytea raw SQL) — FILE-03, D-10

**Analog:** `src/lib/forms.ts:1363-1500` (raw-SQL insert inside the domain helper) — the pattern to copy, not the code.

**Raw-SQL insert shape** (`forms.ts:1462, 1488` — cast pattern, and imports):
```ts
const existingFields = await tx.$queryRaw<FieldRow[]>`
  SELECT ...
`
await tx.$executeRaw`
  INSERT INTO "forms_fields" (...)
  VALUES (..., ${field.type}::"FieldType", ...)
`
```

**Phase-46 bytea write** (RESEARCH Code Examples; verified against `@prisma/adapter-pg@7.4.2` `mapArg` + `pg-types` BYTEA OID 17):
```ts
import { prisma } from './prisma'

export async function insertFileUploadJob(input: {
  id: string
  fileId: string
  payload: Buffer           // a Buffer/Uint8Array is passed through unchanged
  payloadMime: string
}) {
  await prisma.$executeRaw`
    INSERT INTO file_upload_jobs (id, file_id, payload, payload_mime, status, attempts, next_attempt_at, created_at, updated_at)
    VALUES (${input.id}, ${input.fileId}, ${input.payload}, ${input.payloadMime}, 'PENDING', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `
}

export async function readFileUploadPayload(jobId: string): Promise<{ payload: Buffer | null; mime: string }[]> {
  return prisma.$queryRaw`
    SELECT payload, payload_mime AS mime FROM file_upload_jobs WHERE id = ${jobId}
  `
}
```
Rules:
- **Never** base64-encode the buffer around the column — the adapter maps `Buffer` → `Uint8Array` on write and `pg-types` OID 17 → `Buffer` on read (Don't Hand-Roll).
- If a helper module is not created (planner discretion), put the bytea write in the caller where the submission is saved; but keep the raw SQL in `src/lib/**`, not in a route handler — matches the `forms.ts` precedent and AGENTS.md.
- The `submission_files` write is a plain metadata insert (no bytes) in the same transaction — write-once per D-10.

---

### Test-file analogs

#### `src/lib/env.test.ts` (extend) — FILE-05
Copy the table-of-cases style from `env.test.ts:4-22`:
```ts
describe('env validation', () => {
  it('throws for missing required env', () => {
    expect(() => readRequiredEnv({ NAME: undefined }, 'NAME')).toThrow('NAME wajib diisi')
  })
  ...
})
```
Add a nested `describe('getDriveConfig', ...)`:
- missing/blank `GOOGLE_SERVICE_ACCOUNT_EMAIL` → `/GOOGLE_SERVICE_ACCOUNT_EMAIL wajib diisi/`
- missing/blank `GOOGLE_DRIVE_FOLDER_ID` → `/GOOGLE_DRIVE_FOLDER_ID wajib diisi/`
- `privateKey` = `'not-a-pem'` → `/tidak valid/`
- `privateKey` = `'-----BEGIN PRIVATE KEY-----\\nAAAA\\n-----END PRIVATE KEY-----'` (literal `\n`) → returned string contains a real newline and `BEGIN PRIVATE KEY`
- double-unescape guard: a PEM with a real `\n` in the base64 body must survive intact (assert `privateKey.split('\n').length` unchanged when input already has real newlines — assert `replace` applied at most once is a best-effort: assert the output equals `input.replace(/\\n/g,'\n')` exactly).
- `readRequiredEnv` is called with a plain-object `EnvSource`, so tests never touch `process.env` (follows `env.test.ts:4-22`, avoids `process.env` save/restore which is only needed for `getAppBaseUrl`).

#### `src/lib/forms.test.ts` (extend) — FILE-01
Copy the mock harness at `forms.test.ts:26-125`:
```ts
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      $queryRaw: vi.fn().mockImplementation(async (strings: TemplateStringsArray) => {
        const sql = strings.join('?')
        if (sql.includes('FROM forms')) { return [{...}] }
        ...
      }),
      $executeRaw: vi.fn().mockResolvedValue(1),
      $transaction: vi.fn(async (callback) => { ... }),
    },
  }
})
```
And copy the `updateAdminForm` test style (`forms.test.ts:298-328`) for FILE:
```ts
describe('updateAdminForm', () => {
  it('allows saving Likert fields with custom option lengths', async () => {
    await expect(updateAdminForm('form_123', { ... })).resolves.not.toThrow()
  })
})
```
New cases:
- FILE round-trip: a mocked `FROM forms_fields` row with `type: 'FILE'` → `mapPublicFormRowsToDefinition` (indirectly via `getPublicFormDefinition` or the exported surface) returns a field with `type === 'file'` and **no** `maxLength` property → asserts Pitfall 2 fixed.
- `updateAdminForm` with `fields: [{ id: 'new-1', type: 'file', ... }]` → resolves; asserts the `allowedTypes` Set (Pitfall 1) and `mapFormFieldTypeToDb` (Pitfall 1 inverse) are updated.
- Exhaustiveness guard: a test that imports the (currently internal) `mapFormFieldTypeToDb` or, if unexported, exports a small `ALL_FORM_FIELD_TYPES: readonly FormFieldType[]` and asserts `allowedTypes` (also exported or reproduced in the test) covers every element — optional but recommended per RESEARCH Pitfall 1.

`mapFieldType` / `resolveFormFieldType` / `mapFormFieldTypeToDb` are **not exported** today (they are module-private, `forms.ts:499, 524, 2670`). Prefer testing through the public surface (`getPublicFormDefinition` / `updateAdminForm`) to avoid widening the export surface just for tests.

#### `src/lib/drive-probe.test.ts` (new) — FILE-04 classifier
Copy the pure-function table style from `src/lib/env.test.ts:4-22` (`expect(...).toThrow`, `expect(...).toEqual`). Feed hand-crafted error objects into the classifier — **never real Google** (Pitfall 4):
```ts
const cases = [
  { label: 'invalid_grant',     err: { response: { status: 400, data: { error: 'invalid_grant' } } }, permanent: true },
  { label: '401',               err: { response: { status: 401 } },                                   permanent: true },
  { label: '404 folder',        err: { response: { status: 404 } },                                   permanent: true },
  { label: '429',               err: { response: { status: 429 } },                                   permanent: false },
  { label: '500',               err: { response: { status: 500 } },                                   permanent: false },
  { label: 'no response',       err: {},                                                              permanent: false },
  { label: 'network error',     err: new Error('ECONNRESET'),                                        permanent: false },
]
for (const c of cases) expect(isPermanentAuthError(c.err), c.label).toBe(c.permanent)
```
Plus mocked `files.get` tests for the two "not a Shared Drive" markers (`!driveId`, `capabilities.canAddChildren === false`) → `startDriveProbe` rejects with `/bukan Shared Drive/`. Assert the degraded path returns `state: 'degraded'` for a `429`.

#### `src/lib/health.test.ts` (new) — D-05 contract
Copy the prisma mock from `forms.test.ts:30-79`, one-line:
```ts
vi.mock('@/lib/prisma', () => ({ prisma: { $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]) } }))
vi.mock('@/lib/drive', () => ({ getDriveState: vi.fn() }))
```
Cases:
- drive ok → `expect(JSON.stringify(await checkHealth())).toBe('{"status":"ok"}')` (exact string — the cheapest Pitfall 6 regression guard)
- drive degraded → `JSON.parse(...)` deep-equals `{ status: 'degraded', drive: { state: 'degraded', reason: <safe> } }`
- DB throws → `checkHealth()` rejects (route then returns 503; assert at `route.ts` level only if a route test exists — none today, so assert the `checkHealth` rejection).

#### `src/lib/file-jobs.test.ts` (new) — FILE-03
Copy the `$queryRaw`/`$executeRaw` mock shape from `forms.test.ts:30-79`. Assertions:
- `insertFileUploadJob` calls `$executeRaw` **once** with a `Buffer` (which reaches the mock as the tagged-template's captured value; the mock can `expect.any(Buffer)`-style assert by capturing the second-arg array — note `$executeRaw` as a tag passes values as `...args`).
- `readFileUploadPayload` returns the parsed `Buffer` from the mocked `$queryRaw` (`Buffer.from([1,2,3])` in, `Buffer.from([1,2,3])` out) — proves the shape assertion without a live DB.
- Mark the live-DB variant (optional) `describe.skipIf(!process.env.LIVE_DB)` — never let it break CI.

#### `scripts/ci-drive-smoke.mjs` (new) — FILE-04 real proof, W1, ROOTMAP.md:46 #3
**Analog:** `scripts/submission-worker.mjs` (out-of-process Node script, env-only config). Same operational shape — plain `.mjs`, top-level `await`, environment driven, clear exit codes.

Rules per RESEARCH Pitfall 10:
1. Build the same client (import `@googleapis/drive` and `google-auth-library` directly; **do not** import `src/lib/drive.ts` from a `.mjs` because `src/lib/**` is TS and module-resolved by Next, not Node).
2. Upload a small fixture, then `files.get({ fileId, fields: 'id,name,parents,driveId,trashed', supportsAllDrives: true })`.
3. Assert `driveId === <the driveId the probe found on the target folder>`.
4. Assert `parents?.includes(process.env.GOOGLE_DRIVE_FOLDER_ID)`.
5. Exit non-zero on any mismatch so the operator checkpoint fails loud.
6. **Never** mock. This is the W1 proof, not a unit test.

---

## Shared Patterns

### Auth / credentials
**Source:** `src/lib/env.ts:3-11` (`readRequiredEnv`) + RESEARCH `getDriveConfig`.
**Apply to:** `src/lib/drive.ts`, `src/instrumentation.ts`, `scripts/ci-drive-smoke.mjs`.
Rule: all three env vars go through `readRequiredEnv` (Indonesian `wajib diisi`); the PEM is unescaped **exactly once**, in `getDriveConfig`.

### Error handling
**Source:** `src/lib/forms.ts` (`FormSubmissionError`, thrown with status codes) + `src/app/api/health/route.ts:4-12` (try/catch → status).
**Apply to:** `src/lib/drive.ts` (permanent → throw `PermanentDriveError`; transient → `{state:'degraded'}`), `src/lib/health.ts` (DB throw propagates), `src/app/api/health/route.ts` (unchanged).
Rule: only three outcomes for Drive — permanent (throw, process exits), transient (degraded, HTTP 200), ok (bare `{status:'ok'}`).

### Raw SQL + schema parity
**Source:** `src/lib/forms.ts:1363-1500` + `prisma/migrations/20260406160000_add_submission_jobs/migration.sql`.
**Apply to:** `src/lib/file-jobs.ts`, `prisma/schema.prisma`.
Rule: every column in a migration appears in the model and every model column appears in a migration; index names in `@@index(map: "...")` equal the SQL index names; `IF NOT EXISTS` on every DDL statement; `TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP` for pseudo-timestamps (there is no `updatedAt @updatedAt` at the raw-SQL layer — the migration sets `CURRENT_TIMESTAMP` at insert, and cache invalidation remains `revalidatePath`-driven, matching `forms.ts`).

### Module-level singleton
**Source:** `src/lib/prisma.ts:5-33`.
**Apply to:** `src/lib/drive.ts`.
Rule: `globalThis as { __drive?, __driveState?, __driveTimer? }`, `?? create...`, `unref?.()` on the timer so graceful shutdown is not blocked, `'server-only'` import at the top to prevent client leakage (W10).

### Indonesian user-facing strings
**Source:** `src/lib/env.ts:7` (`${name} wajib diisi`), `src/lib/forms.ts:1862` (`Field "${label}" wajib diisi`), `src/lib/forms.ts:2805` (`Mode form tidak valid`).
**Apply to:** all new thrown errors and `/api/health``reason` strings that a human might read. `console.error`/`console.info` operator messages follow the existing English style (`'Health check failed'`, `'revalidatePath'` etc.).

### Container rebuild
**Source:** AGENTS.md §"Smart Container Rebuild Protocol".
**Apply to:** every code change in this phase (all touch `src/**`, `prisma/**`, `package.json`, `Dockerfile`, `docker-compose.yml`). Pre-flight `npm test && npm run lint && npx tsc --noEmit --pretty false`, then `docker compose --env-file .env.production build app worker` and `up -d --no-deps app worker`, then `Invoke-RestMethod http://127.0.0.1:3456/api/health` → `ok`. Doc-only changes (`.planning/**`) skip the rebuild.

---

## No Analog Found

Files with no in-repo analog (planner uses RESEARCH.md patterns verbatim):

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/lib/drive.ts` | service (Google SDK) | request-response / streaming to Drive | No Google SDK code in the repo today; only `src/lib/prisma.ts` singleton shape is reusable. Use RESEARCH Pattern 5 + Code Examples. |
| `src/instrumentation.ts` | hook (Next.js bootstrap) | event-driven | File convention does not exist in the repo yet. Use RESEARCH Pattern 3. |
| `scripts/ci-drive-smoke.mjs` | operational script | file-I/O → Drive | Closest is `scripts/submission-worker.mjs` (script form) but Drive logic is greenfield. Use RESEARCH Pitfall 10. |
| `src/lib/file-jobs.ts` | service (bytea) | file-I/O + CRUD | No existing bytea usage. Raw-SQL style from `src/lib/forms.ts`; bytea shape from RESEARCH Code Examples (verified against `@prisma/adapter-pg@7.4.2`). |

---

## Metadata

**Analog search scope:** `src/lib/`, `src/app/api/`, `prisma/migrations/`, `prisma/schema.prisma`, `scripts/`, repo root config (`Dockerfile`, `docker-compose.yml`, `next.config.ts`, `start.sh`, `vitest.config.ts`, `.env.example`).
**Files scanned:** 14 source/config + 8 tests/mocks.
**Pattern extraction date:** 2026-11-16.
**Verification commands (in order):** `npx vitest run src/lib/env.test.ts src/lib/forms.test.ts` → `npm test && npm run lint && npx tsc --noEmit --pretty false && npm run build` → real Drive smoke (`node scripts/ci-drive-smoke.mjs`) → container rebuild + `curl /api/health`.
