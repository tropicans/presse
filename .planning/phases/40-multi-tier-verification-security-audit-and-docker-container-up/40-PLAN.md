# Phase 40 Plan: Multi-Tier Verification, Security Audit & Docker Container Up

## Purpose
Execute pre-flight local verification (tests, lint, tsc, production build), perform Smart Targeted Rebuild of Docker containers (`app` and `worker`), and verify live health check.

## Tasks

### Task 1: Pre-Flight Local Verification Suite
- **Commands**:
  - `npm test`
  - `npm run lint`
  - `npx tsc --noEmit --pretty false`
  - `npm run build`
- **Criteria**: All commands exit with code 0.

### Task 2: Smart Targeted Docker Container Rebuild & Migration Up
- **Commands**:
  - `docker compose --env-file .env.production build app worker`
  - `docker compose --env-file .env.production up -d`
- **Criteria**: Containers `isian-app` and `isian-worker` rebuilt and up without affecting postgres data.

### Task 3: Post-Rebuild Production Health Check
- **Command**: `Invoke-RestMethod -Uri http://127.0.0.1:3456/api/health`
- **Criteria**: Returns `status: ok` and healthy database connection.

## Verification Criteria
- [ ] 95/95 Vitest tests pass.
- [ ] Clean lint and tsc.
- [ ] Standalone build succeeds.
- [ ] Docker containers running and healthy on port 3456.
