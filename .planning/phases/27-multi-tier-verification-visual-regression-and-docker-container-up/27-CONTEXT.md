# Phase 27 Context: Multi-Tier Verification, Visual Regression & Docker Container Up

## Context & Scope
Phase 27 is the final verification, hardening, and deployment phase of Milestone v1.8 ("Editorial Minimalist Monochrome Transformation"). It validates that all components across the public forms, admin suite, form builder, and submissions table adhere strictly to the new monochrome design system, maintain dual-theme inverted contrast parity, pass all automated checks, and successfully run inside the containerized Docker environment.

## Requirements
- **EDIT-09**: Dual-Theme Inverted Contrast & Quality Assurance — Dark mode pure contrast (#000000 canvas with #FFFFFF text/borders), full verification pipeline (`vitest`, `eslint`, `tsc`, `next build`), Docker containerization (`docker compose build` & `docker compose up -d`), and codebase audit.

## Discussion Decisions (Recommended Options Selected)

### Decision 1: Verification Pipeline Architecture
- **Selected (Recommended)**: 4-Tier Automated Verification Pipeline:
  1. Unit/Integration Tests: `npm test` (vitest run).
  2. Static Code Analysis: `npm run lint` (eslint).
  3. Strict Type Check: `npx tsc --noEmit --pretty false`.
  4. Production Bundle Compilation: `npm run build` (Next.js standalone build).
- **Rationale**: Guarantees zero regressions in runtime, types, or build outputs before running container orchestration.

### Decision 2: Dual-Theme Contrast & Residual Cleanliness Verification
- **Selected (Recommended)**: Explicit automated test assertions in `src/app/globals.test.ts` verifying:
  - Absolute monochrome dark theme variables (`html[data-theme='dark']` uses `#000000` canvas and `#ffffff` ink).
  - Strict zero radius rule applied globally (`border-radius: 0px !important`).
  - Zero residual teal/cyan colors and zero box shadows.
- **Rationale**: Prevents accidental drift and validates EDIT-09 compliance objectively.

### Decision 3: Docker Orchestration & Production Readiness
- **Selected (Recommended)**: Run `docker compose build` for `app` and `worker` services, then `docker compose up -d`, and verify container status.
- **Rationale**: Mandated by user global rule: *"selalu lakukan audit ketika development phase selesai. selesai bug fixing, lakukan build and up di docker untuk kemudian commit dan push"*.

### Decision 4: Codebase Audit & Repository Hygiene
- **Selected (Recommended)**: Run pre-push codebase audit to ensure no temp files, leftover scratch scripts, or unintended diffs exist before milestone completion.
- **Rationale**: Adheres to user rule and repository guidelines.
