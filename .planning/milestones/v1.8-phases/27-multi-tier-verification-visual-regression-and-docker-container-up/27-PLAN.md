# Phase 27 Plan: Multi-Tier Verification, Visual Regression & Docker Container Up

## Purpose
Execute multi-tier verification for Milestone v1.8, ensuring the application achieves full compliance with EDIT-09 (dual-theme contrast, test suite, strict TypeScript compilation, production build), followed by Docker container build & start, pre-push codebase audit, and repository readiness.

## Tasks

### Task 1: Expand Dual-Theme Parity & Quality Test Suite
- **File**: `src/app/globals.test.ts`
- **Action**: Add explicit assertions for EDIT-09:
  - Dark mode root variables (`html[data-theme='dark']`) use pure `#000000` canvas and `#ffffff` foreground ink.
  - Zero-radius enforcement across all themes.
  - Zero shadow tokens across dark mode.
- **Verification**: Run `npm test` and assert all test suites pass.

### Task 2: Multi-Tier Verification Pipeline Execution
- **Commands**:
  1. `npm test` — Run all Vitest suites.
  2. `npm run lint` — ESLint flat config inspection.
  3. `npx tsc --noEmit --pretty false` — Strict TypeScript compilation check.
  4. `npm run build` — Next.js production standalone bundle build.
- **Verification**: All commands exit with code 0.

### Task 3: Docker Orchestration & Container Up
- **Commands**:
  1. `docker compose build app worker`
  2. `docker compose up -d`
  3. `docker compose ps`
- **Verification**: Containers are created, running, and healthy.

### Task 4: Codebase Audit & Repository Hygiene
- **Action**: Review changed files with `git status`, verify absence of scratch/temp files, verify requirements traceability, and prepare for milestone audit & completion.
