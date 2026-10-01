# Phase 30 Plan: Analytics Verification, Export Integration & Docker Up

## Purpose
Perform end-to-end multi-tier verification of the analytics suite, validate production Next.js build, spin up production Docker containers, verify container health, and conduct pre-push codebase audit.

## Tasks

### Task 1: Multi-Tier Verification Suite
- **Commands**:
  - `npm test`
  - `npm run lint`
  - `npx tsc --noEmit --pretty false`
- **Criteria**: Zero failures, zero warnings, zero TypeScript errors.

### Task 2: Production Standalone Build
- **Command**: `npm run build`
- **Criteria**: Next.js standalone bundle compiles cleanly without missing route handlers or dynamic server errors.

### Task 3: Docker Compose Build & Up
- **Commands**:
  - `docker compose --env-file .env.production build app worker`
  - `docker compose --env-file .env.production up -d`
- **Criteria**: Containers rebuild successfully and run in background.

### Task 4: Production Container Verification
- **Commands**:
  - `docker compose --env-file .env.production ps`
  - `Invoke-RestMethod -Uri http://127.0.0.1:3456/api/health`
- **Criteria**: Services are healthy (`isian-app`, `isian-worker`, `isian-postgres`), HTTP 200 returned from health check.

### Task 5: Codebase Audit & Milestone Completion Prep
- **Action**:
  - Review git status for unintended changes or junk files.
  - Write `30-SUMMARY.md`.
  - Update `REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`.
