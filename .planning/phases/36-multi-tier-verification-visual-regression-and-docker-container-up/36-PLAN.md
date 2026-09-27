# Phase 36: Multi-Tier Verification, Visual Regression & Docker Container Up Plan

**Phase**: 36
**Goal**: Execute comprehensive automated testing, standalone production build validation, smart targeted Docker container rebuild and startup, health-check verification, and milestone audit reporting.

## Key Steps

1. **Pre-Flight Validation**:
   - `npm test` (Vitest unit and CSS regression tests)
   - `npm run lint` (ESLint)
   - `npx tsc --noEmit --pretty false` (TypeScript compiler)
   - `npm run build` (Next.js standalone production build)

2. **Smart Targeted Container Rebuild & Up**:
   - Rebuild affected services:
     `docker compose --env-file .env.production build app worker`
   - Start affected services without restarting Postgres:
     `docker compose --env-file .env.production up -d --no-deps app worker`

3. **Post-Rebuild Health Check**:
   - Verify container runtime health:
     `Invoke-RestMethod -Uri http://127.0.0.1:3456/api/health`

4. **Milestone Audit & Documentation**:
   - Document milestone outcomes against all 20 Acceptance Criteria in `36-SUMMARY.md`.
   - Prepare commit & push per user protocol.
