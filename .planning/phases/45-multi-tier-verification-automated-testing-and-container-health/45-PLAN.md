# Phase 45: Multi-Tier Verification, Automated Testing & Container Health Plan

## Steps to Execute

### Step 1: Pre-Flight Local Validations
- Execute Vitest test suite (`npm test`).
- Execute ESLint (`npm run lint`).
- Execute TypeScript Compiler checks (`npx tsc --noEmit --pretty false`).
- Execute Next.js standalone build (`npm run build`).

### Step 2: Docker Image Build & Container Deployment
- Build `app` and `worker` service containers:
  `docker compose --env-file .env.production build app worker`
- Apply container updates and migrations:
  `docker compose --env-file .env.production up -d`

### Step 3: Health Check Verification
- Verify running container health via REST query:
  `Invoke-RestMethod -Uri http://127.0.0.1:3456/api/health`
  Confirm status is `"ok"`.

### Step 4: Documentation & Milestone Readiness
- Write `45-SUMMARY.md`.
- Update `REQUIREMENTS.md` (mark AGREE-07 complete).
- Update `STATE.md` (all phases complete).
