# Production Readiness Remediation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `jott` safe enough for production by removing secret exposure, closing dependency/security gates, adding tests/CI, hardening runtime config, and documenting deployment.

**Architecture:** Clean cutover: replace insecure defaults rather than supporting unsafe legacy paths. Production config must fail fast when required environment variables are absent. Security gates become automated via CI so production readiness remains enforceable after this remediation.

**Tech Stack:** Next.js 16 App Router, TypeScript, Prisma 7/PostgreSQL, Docker Compose, NextAuth v4, npm, ESLint, Node 22, Vitest or Jest, GitHub Actions.

---

## Known audit facts

Observed verification:

- `npm run lint`: passed.
- `npm run build`: passed.
- `npm audit --audit-level=moderate`: failed with 25 vulnerabilities: 2 critical, 11 high, 12 moderate.

Observed blockers:

- Secrets exist in `.env`, `.env.production`, and `docker-compose.yml`.
- `README.md` is still create-next-app template and references wrong port.
- `.github/workflows/*` missing.
- No tests found under `**/*.test.*`, `**/*.spec.*`, `tests/**/*`, or `__tests__/**/*`.
- `src/lib/rate-limit.ts` uses in-memory `Map`; comment says single-instance only.
- `src/app/api/attendance/export/route.ts` exports all attendance rows without limit.
- `prisma/schema.prisma` only models `Attendance`; migrations create additional form-builder tables used by raw SQL.
- `.env.production` has `NEXTAUTH_URL="http://localhost:3456"`.

---

## Task 1: Remove committed runtime secrets and enforce safe local templates

**Files:**

- Modify: `.env.example`
- Modify: `docker-compose.yml`
- Delete from working tree if tracked: `.env`
- Delete from working tree if tracked: `.env.production`
- Verify: `.gitignore`

**Step 1: Check tracking status for secret files**

Run:

```bash
git status --short .env .env.production docker-compose.yml .env.example .gitignore
```

Expected:

- Determine whether `.env` and `.env.production` are tracked.
- If tracked, remove from index with `git rm --cached .env .env.production`.
- If untracked, leave local files but do not commit them.

**Step 2: Replace hardcoded compose secrets with env interpolation**

Change `docker-compose.yml` secrets from literal values to required env interpolation:

```yaml
environment:
  POSTGRES_DB: ${POSTGRES_DB:-jott_attendance}
  POSTGRES_USER: ${POSTGRES_USER:-jott_user}
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?POSTGRES_PASSWORD wajib diisi}
```

For app/worker:

```yaml
environment:
  DATABASE_URL: ${DATABASE_URL:?DATABASE_URL wajib diisi}
  NEXTAUTH_URL: ${NEXTAUTH_URL:?NEXTAUTH_URL wajib diisi}
  NEXTAUTH_SECRET: ${NEXTAUTH_SECRET:?NEXTAUTH_SECRET wajib diisi}
  GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID:?GOOGLE_CLIENT_ID wajib diisi}
  GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET:?GOOGLE_CLIENT_SECRET wajib diisi}
  ADMIN_EMAILS: ${ADMIN_EMAILS:?ADMIN_EMAILS wajib diisi}
  INTERNAL_WORKER_TOKEN: ${INTERNAL_WORKER_TOKEN:?INTERNAL_WORKER_TOKEN wajib diisi}
```

**Step 3: Update `.env.example` with placeholders only**

Use non-secret placeholders:

```dotenv
# Database
POSTGRES_DB="jott_attendance"
POSTGRES_USER="jott_user"
POSTGRES_PASSWORD="change-me-long-random-password"
DATABASE_URL="postgresql://jott_user:change-me-long-random-password@localhost:5443/jott_attendance?schema=public"

# NextAuth
NEXTAUTH_URL="http://localhost:3456"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Admin emails
ADMIN_EMAILS="admin@example.com"

# Internal worker
INTERNAL_WORKER_TOKEN="generate-long-random-token"
```

**Step 4: Verify no known leaked literal remains in committed files**

Search:

```bash
git grep -n "<old-db-password>\|<old-nextauth-secret-prefix>\|<old-google-secret-prefix>\|<old-worker-token>\|<old-google-client-id-prefix>" -- . ':!.env' ':!.env.production'
```

Expected:

- No matches in committed files.

**Step 5: Commit**

```bash
git add .env.example docker-compose.yml .gitignore
 git rm --cached .env .env.production || true
 git commit -m "chore: remove committed runtime secrets"
```

---

## Task 2: Add fail-fast environment validation

**Files:**

- Create: `src/lib/env.ts`
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/prisma.ts`
- Modify: `src/app/api/internal/submission-jobs/process/route.ts`
- Modify: `scripts/submission-worker.mjs`
- Test: `src/lib/env.test.ts`

**Step 1: Add test for env validation**

Create `src/lib/env.test.ts` after test framework setup from Task 4 if not present yet:

```ts
import { describe, expect, it } from 'vitest'
import { readRequiredEnv, readRequiredEnvList } from './env'

describe('env validation', () => {
  it('throws for missing required env', () => {
    expect(() => readRequiredEnv({ NAME: undefined }, 'NAME')).toThrow('NAME wajib diisi')
  })

  it('throws for blank required env', () => {
    expect(() => readRequiredEnv({ NAME: '   ' }, 'NAME')).toThrow('NAME wajib diisi')
  })

  it('trims required env', () => {
    expect(readRequiredEnv({ NAME: ' value ' }, 'NAME')).toBe('value')
  })

  it('parses comma separated env lists', () => {
    expect(readRequiredEnvList({ ADMIN_EMAILS: 'a@example.com, b@example.com' }, 'ADMIN_EMAILS')).toEqual([
      'a@example.com',
      'b@example.com',
    ])
  })
})
```

**Step 2: Implement env helper**

Create `src/lib/env.ts`:

```ts
type EnvSource = Record<string, string | undefined>

export function readRequiredEnv(env: EnvSource, name: string): string {
  const value = env[name]?.trim()

  if (!value) {
    throw new Error(`${name} wajib diisi`)
  }

  return value
}

export function readRequiredEnvList(env: EnvSource, name: string): string[] {
  return readRequiredEnv(env, name)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}
```

**Step 3: Use helper in Prisma**

Change `src/lib/prisma.ts`:

```ts
import { readRequiredEnv } from './env'

const connectionString = readRequiredEnv(process.env, 'DATABASE_URL')
```

Replace `process.env.DATABASE_URL!` usage with `connectionString`.

**Step 4: Use helper in auth**

Change `src/lib/auth.ts` to read:

```ts
const googleClientId = readRequiredEnv(process.env, 'GOOGLE_CLIENT_ID')
const googleClientSecret = readRequiredEnv(process.env, 'GOOGLE_CLIENT_SECRET')
const adminEmails = new Set(readRequiredEnvList(process.env, 'ADMIN_EMAILS').map((email) => email.toLowerCase()))
```

Also ensure `NEXTAUTH_SECRET` is read and assigned in `authOptions.secret`:

```ts
secret: readRequiredEnv(process.env, 'NEXTAUTH_SECRET')
```

**Step 5: Use helper in internal worker route**

Change token read:

```ts
const workerToken = readRequiredEnv(process.env, 'INTERNAL_WORKER_TOKEN')
```

Do not return success if env absent; fail hard so deployment catches misconfig.

**Step 6: Verify**

Run:

```bash
npm test -- src/lib/env.test.ts
npm run build
```

Expected:

- Env tests pass.
- Build passes with local env present.

**Step 7: Commit**

```bash
git add src/lib/env.ts src/lib/env.test.ts src/lib/auth.ts src/lib/prisma.ts src/app/api/internal/submission-jobs/process/route.ts scripts/submission-worker.mjs
 git commit -m "fix: validate required runtime environment"
```

---

## Task 3: Reduce dependency vulnerability surface

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`

**Step 1: Find unused risky dependencies**

Search imports/usages:

```bash
git grep -n "node-telegram-bot-api\|oc-codex-multi-auth\|opencode-chat\|@opencode-ai/plugin\|hono" -- . ':!package-lock.json'
```

Expected:

- If only `package.json` / lockfile match, remove dependency.
- If runtime code imports them, audit replacement path before removal.

**Step 2: Remove unused risky packages**

If unused:

```bash
npm uninstall node-telegram-bot-api oc-codex-multi-auth opencode-chat @opencode-ai/plugin
```

**Step 3: Upgrade Next to patched version**

Run:

```bash
npm install next@16.2.4
```

If official latest patched is newer, use latest stable in same major after checking release notes.

**Step 4: Apply non-breaking audit fixes**

Run:

```bash
npm audit fix
```

Do not run `npm audit fix --force` without reviewing breaking changes.

**Step 5: Verify dependency gate**

Run:

```bash
npm audit --audit-level=moderate
npm run build
npm run lint
```

Expected:

- Audit exits 0, or remaining findings are documented with reason and mitigation.
- Build/lint pass.

**Step 6: Commit**

```bash
git add package.json package-lock.json
 git commit -m "fix: remove vulnerable unused dependencies"
```

---

## Task 4: Add test framework and critical tests

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/lib/forms.test.ts`
- Create: `src/lib/rate-limit.test.ts`
- Create: `src/lib/env.test.ts` if not done in Task 2

**Step 1: Install Vitest**

Run:

```bash
npm install --save-dev vitest
```

**Step 2: Add scripts**

Modify `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Keep existing scripts.

**Step 3: Add Vitest config**

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
```

**Step 4: Add form validation tests**

Test `validateFormSubmission` without database. Cover:

- Missing required field rejected.
- Radio/select value outside options rejected.
- Text above max length rejected.
- Signature must start with `data:image/png;base64,`.
- Signature above max length rejected.
- Valid values accepted.

**Step 5: Add rate limit tests**

If current implementation exports enough helpers, test:

- First N requests allowed.
- N+1 request rejected.
- `getClientIp()` behavior for `x-forwarded-for` and `x-real-ip`.

If not testable without state leakage, refactor minimally to expose a store reset only for tests:

```ts
export function clearRateLimitStoreForTest() {
  store.clear()
}
```

Do not use this in runtime code.

**Step 6: Verify**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected:

- Tests pass.
- Lint/build pass.

**Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/lib/*.test.ts src/lib/rate-limit.ts
 git commit -m "test: cover critical validation paths"
```

---

## Task 5: Add CI quality gates

**Files:**

- Create: `.github/workflows/ci.yml`

**Step 1: Create CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main
      - master

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate
        env:
          DATABASE_URL: postgresql://user:password@localhost:5432/db?schema=public

      - name: Lint
        run: npm run lint

      - name: Test
        run: npm test

      - name: Build
        run: npm run build
        env:
          DATABASE_URL: postgresql://user:password@localhost:5432/db?schema=public
          NEXTAUTH_URL: http://localhost:3456
          NEXTAUTH_SECRET: ci-nextauth-secret-minimum-32-characters
          GOOGLE_CLIENT_ID: ci-client-id
          GOOGLE_CLIENT_SECRET: ci-client-secret
          ADMIN_EMAILS: admin@example.com
          INTERNAL_WORKER_TOKEN: ci-worker-token-minimum-32-characters

      - name: Audit dependencies
        run: npm audit --audit-level=moderate
```

**Step 2: Verify locally with equivalent commands**

Run:

```bash
npm ci
npx prisma generate
npm run lint
npm test
npm run build
npm audit --audit-level=moderate
```

Expected:

- All pass.

**Step 3: Commit**

```bash
git add .github/workflows/ci.yml
 git commit -m "ci: add production quality gates"
```

---

## Task 6: Add database-aware health endpoint and Docker healthcheck

**Files:**

- Create: `src/app/api/health/route.ts`
- Modify: `docker-compose.yml`
- Test: `src/app/api/health/route.test.ts` if route tests are configured; otherwise cover helper in `src/lib/health.test.ts`

**Step 1: Extract health check helper**

Create `src/lib/health.ts`:

```ts
import { prisma } from './prisma'

export async function checkHealth() {
  await prisma.$queryRaw`SELECT 1`

  return {
    status: 'ok',
  }
}
```

**Step 2: Add route**

Create `src/app/api/health/route.ts`:

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

**Step 3: Update Docker healthcheck**

Change app healthcheck to:

```yaml
healthcheck:
  test:
    - CMD
    - node
    - -e
    - "fetch('http://127.0.0.1:3456/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
  interval: 30s
  timeout: 5s
  retries: 5
  start_period: 30s
```

**Step 4: Verify**

Run:

```bash
npm run build
```

If Docker available:

```bash
docker compose config
```

Expected:

- Build passes.
- Compose config resolves with env set.

**Step 5: Commit**

```bash
git add src/lib/health.ts src/app/api/health/route.ts docker-compose.yml
 git commit -m "feat: add database health check"
```

---

## Task 7: Harden attendance export memory risk

**Files:**

- Modify: `src/app/api/attendance/export/route.ts`
- Test: route/helper test if export logic extracted

**Step 1: Extract row limit constant**

Use existing pattern from `src/lib/forms.ts`:

```ts
const ATTENDANCE_EXPORT_ROW_LIMIT = 1000
```

or put in shared config if already available.

**Step 2: Limit query**

Change query:

```ts
const attendances = await prisma.attendance.findMany({
  orderBy: { createdAt: 'desc' },
  take: ATTENDANCE_EXPORT_ROW_LIMIT + 1,
})
```

If rows exceed limit, return 413 or 422:

```ts
if (attendances.length > ATTENDANCE_EXPORT_ROW_LIMIT) {
  return NextResponse.json(
    { error: `Export maksimal ${ATTENDANCE_EXPORT_ROW_LIMIT} baris. Gunakan filter atau ekspor bertahap.` },
    { status: 413 }
  )
}
```

Then export only rows within limit.

**Step 3: Avoid embedding oversized signatures**

Before adding image to workbook, enforce max signature size. Reuse `MAX_SIGNATURE_LENGTH` if export imports it safely; otherwise define same conservative cap.

**Step 4: Verify**

Run:

```bash
npm run build
npm run lint
```

Expected:

- Build/lint pass.

**Step 5: Commit**

```bash
git add src/app/api/attendance/export/route.ts
 git commit -m "fix: bound attendance export size"
```

---

## Task 8: Replace in-memory rate limiter for production or enforce single-instance boundary

**Files:**

- Modify: `src/lib/rate-limit.ts`
- Modify: `.env.example`
- Modify: `package.json`
- Modify: `package-lock.json`
- Potential create: `src/lib/rate-limit.test.ts`

**Decision:** Prefer Redis/Upstash for production if app will run more than one instance. If production is guaranteed single instance behind trusted proxy, document this as explicit limitation and keep Map temporarily.

**Redis implementation path:**

1. Install Redis client:

```bash
npm install ioredis
```

2. Add env:

```dotenv
REDIS_URL="redis://localhost:6379"
TRUSTED_PROXY_MODE="true"
```

3. Implement atomic fixed-window limiter using Redis `INCR` + `EXPIRE`.

4. Keep in-memory fallback only for development:

```ts
if (process.env.NODE_ENV === 'production' && !process.env.REDIS_URL) {
  throw new Error('REDIS_URL wajib diisi untuk production rate limit')
}
```

5. Sanitize client IP extraction behind trusted proxy only.

**Verification:**

```bash
npm test -- src/lib/rate-limit.test.ts
npm run build
npm run lint
```

**Commit:**

```bash
git add src/lib/rate-limit.ts src/lib/rate-limit.test.ts .env.example package.json package-lock.json
 git commit -m "fix: use shared rate limit store in production"
```

---

## Task 9: Synchronize Prisma schema with migrations or document raw SQL boundary

**Files:**

- Modify: `prisma/schema.prisma`
- Check: `prisma/migrations/*/migration.sql`
- Modify: `src/lib/forms.ts` only if generated Prisma models replace raw SQL

**Step 1: Decide boundary**

Preferred production path:

- Add Prisma models for existing tables:
  - `Form`
  - `FormField`
  - `FieldOption`
  - `Submission`
  - `SubmissionAnswer`
  - `SubmissionJob`

Alternative:

- Keep raw SQL but add explicit comments and tests around queue/dedupe behavior.

**Step 2: Add schema models matching actual migrations**

Use exact table names with `@@map` and exact column names with `@map`.

Example pattern:

```prisma
model Form {
  id          String     @id
  slug        String     @unique
  title       String
  description String?
  status      FormStatus @default(DRAFT)
  mode        FormMode   @default(STANDARD)
  createdAt   DateTime   @default(now()) @map("created_at")
  updatedAt   DateTime   @default(now()) @map("updated_at")

  @@map("forms")
}
```

**Step 3: Validate Prisma client generation**

Run:

```bash
npx prisma generate
npm run build
```

Expected:

- Prisma generate succeeds.
- Build passes.

**Step 4: Commit**

```bash
git add prisma/schema.prisma
 git commit -m "chore: align prisma schema with database tables"
```

---

## Task 10: Rewrite README as production runbook

**Files:**

- Modify: `README.md`

**Step 1: Replace template README**

Minimum sections:

```markdown
# Jott

## Overview

## Requirements

- Node.js 22
- npm
- PostgreSQL
- Docker / Docker Compose optional

## Environment variables

List every required env var and whether secret.

## Local development

npm ci
npx prisma generate
npm run dev

App runs on http://localhost:3456.

## Database migrations

npx prisma migrate deploy

## Worker

npm run worker:submission

## Production deployment checklist

- Rotate secrets
- Set HTTPS NEXTAUTH_URL
- Configure Google OAuth redirect URI
- Run migrations
- Run CI gates
- Confirm health endpoint
- Confirm backups

## Security notes

- Never commit .env files
- Use shared rate limiter for multi-instance deploys
- Keep database private

## Verification

npm run lint
npm test
npm run build
npm audit --audit-level=moderate
```

**Step 2: Verify docs match scripts**

Run:

```bash
npm run lint
```

Expected:

- Lint passes; README not linted but command confirms repo still clean.

**Step 3: Commit**

```bash
git add README.md
 git commit -m "docs: add production runbook"
```

---

## Task 11: Final production readiness verification

**Files:**

- No planned edits unless verification fails.

**Step 1: Run full local gate**

Run:

```bash
npm ci
npx prisma generate
npm run lint
npm test
npm run build
npm audit --audit-level=moderate
```

Expected:

- All exit 0.

**Step 2: Verify no secret literals in committed files**

Run:

```bash
git grep -n "<old-db-password>\|<old-nextauth-secret-prefix>\|<old-google-secret-prefix>\|<old-worker-token>\|<old-google-client-id-prefix>" -- . ':!.env' ':!.env.production'
```

Expected:

- No matches.

**Step 3: Verify Docker config**

Run with safe dummy env values:

```bash
POSTGRES_PASSWORD=dummy DATABASE_URL=postgresql://jott_user:dummy@postgres:5432/jott_attendance?schema=public NEXTAUTH_URL=http://localhost:3456 NEXTAUTH_SECRET=dummy-nextauth-secret-minimum-32-characters GOOGLE_CLIENT_ID=dummy GOOGLE_CLIENT_SECRET=dummy ADMIN_EMAILS=admin@example.com INTERNAL_WORKER_TOKEN=dummy-worker-token-minimum-32-characters docker compose config
```

Expected:

- Compose config renders.
- No literal production secrets.

**Step 4: Produce final readiness note**

Update audit status:

- Production-ready only if all gates pass and deployment environment uses rotated secrets.
- If dependency vulnerabilities remain, mark no-go unless risk accepted in writing.

**Step 5: Commit if any verification doc updated**

```bash
git add README.md docs/plans/2026-05-06-production-readiness-remediation.md
 git commit -m "docs: document production readiness remediation"
```

---

## Execution order

1. Task 1: secrets first. Nothing else matters if secrets remain leaked.
2. Task 3: dependency vulnerabilities second.
3. Task 4 + Task 5: tests and CI gates.
4. Task 2 + Task 6: fail-fast env and health endpoint.
5. Task 7 + Task 8: runtime resilience.
6. Task 9: schema alignment.
7. Task 10: runbook.
8. Task 11: final verification.

## Parallelization notes

Can run in parallel after Task 1:

- Task 3 dependency cleanup.
- Task 4 test framework.
- Task 10 README rewrite.

Must run sequentially:

- Task 5 CI after Task 4 because CI needs `npm test` script.
- Task 11 final verification after all changes.
- Task 8 rate limiter after env conventions from Task 2 are clear.

## Production go/no-go gates

Go only when all pass:

- No real secrets in committed files.
- Rotated secrets deployed through environment/secret manager.
- `npm audit --audit-level=moderate` exits 0 or written risk acceptance exists.
- `npm run lint` exits 0.
- `npm test` exits 0.
- `npm run build` exits 0.
- CI workflow exists and passes.
- Health endpoint checks database.
- `NEXTAUTH_URL` is HTTPS production domain.
- Database not exposed publicly.
- README documents deployment and operational steps.
