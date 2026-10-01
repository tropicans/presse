# Phase 45: Multi-Tier Verification, Automated Testing & Container Health Context

## Domain & Requirements
- Requirement: **AGREE-07** (Multi-Tier QA, Automated Tests & Container Health).
- Objective:
  1. Automated test suites covering end-to-end checkbox behavior:
     - Form validation tests in `forms.test.ts`.
     - Analytics distribution tests in `form-analytics.test.ts`.
  2. Full static checks:
     - `npx tsc --noEmit --pretty false` -> zero errors.
     - `npm run lint` -> zero warnings/errors.
  3. Standalone Next.js production build:
     - `npm run build` -> successful standalone output.
  4. Smart Targeted Rebuild & Up:
     - Rebuild `app` and `worker` images via `docker compose --env-file .env.production build app worker`.
     - Start containers with `docker compose --env-file .env.production up -d` to execute DB migrations.
  5. Container Health Check:
     - Query `http://127.0.0.1:3456/api/health` -> verify status is `ok`.
