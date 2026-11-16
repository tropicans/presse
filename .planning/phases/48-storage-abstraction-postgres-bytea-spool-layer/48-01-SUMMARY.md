---
phase: 48-storage-abstraction-postgres-bytea-spool-layer
plan: 01
subsystem: storage
tags:
  - storage
  - file-upload
  - bytea
  - postgres
  - state-machine
dependency_graph:
  requires: []
  provides:
    - file-storage-domain-module
    - bytea-spool-recording
    - file-status-state-machine
    - submission-file-linking
  affects:
    - src/lib/file-storage.ts
    - src/lib/file-jobs.ts
    - prisma/schema.prisma
tech_stack:
  added: []
  patterns:
    - Raw parameterized SQL tagged templates with PrismaPg adapter
    - Single transaction atomic spooling
    - Explicit state machine transition guard
    - Zero-copy Buffer normalization
key_files:
  created:
    - prisma/migrations/20261116130000_make_spool_payload_nullable/migration.sql
    - src/lib/file-storage.ts
    - src/lib/file-storage.test.ts
  modified:
    - prisma/schema.prisma
    - src/lib/file-jobs.ts
decisions:
  - D-01: Centralized raw-SQL file persistence domain module in src/lib/file-storage.ts
  - D-02: recordFileUpload atomically creates submission_files and file_upload_jobs in a transaction
  - D-03: assertValidFileStatusTransition enforces strict lifecycle transitions (PENDING_UPLOAD -> QUEUED -> SYNCED/FAILED, PENDING_UPLOAD -> ORPHANED) and rejects illegal rewinds
  - D-04: Buffer normalization from PrismaPg Uint8Array representation
  - D-05: Unified UTC timestamp convention NOW() AT TIME ZONE 'UTC' across all file SQL queries
metrics:
  duration: 15m
  completed_date: "2026-11-16"
status: complete
actuals:
  tokens: 7280
  tasks: 2
  commits: 2
  plan_head_before: ae5b475bd1775cdd7b5e8cfdb89c447893f612b2
  plan_head_after: 7d6a87bd9c7ab544d832073e76bf1915297bab7b
---

# Phase 48 Plan 01: Spool Nullability Migration, Core Raw-SQL Persistence, State Machine, and Submission Linking Summary

## One-liner
Schema parity for nullable bytea spooling, atomic raw-SQL file recording, strict state-machine validation, submission linking, and backward-compatible delegation.

## Objective
Establish the foundational raw-SQL file storage domain module `src/lib/file-storage.ts` with schema parity, bytea spool recording, state machine validation, submission linking, and serving lookup.

## What Was Done

### Task 1 (tracer): Spool nullability migration and end-to-end file upload recording slice
- Created SQL migration `prisma/migrations/20261116130000_make_spool_payload_nullable/migration.sql` to drop NOT NULL constraint on `file_upload_jobs.payload` and set `submission_files.status` default to `PENDING_UPLOAD`.
- Updated `prisma/schema.prisma` making `FileUploadJob.payload` optional (`Bytes?`) and `SubmissionFile.status` default to `PENDING_UPLOAD`.
- Deployed migration to the PostgreSQL database and generated updated Prisma client types.
- Implemented `recordFileUpload` and `getFileForServing` in `src/lib/file-storage.ts`:
  - `recordFileUpload` runs an atomic `$transaction` creating `submission_files` with `PENDING_UPLOAD` status and `file_upload_jobs` with `PENDING` status and spooled Buffer payload using `NOW() AT TIME ZONE 'UTC'`.
  - `getFileForServing` joins `submission_files` and `file_upload_jobs`, normalizing Uint8Array bytea results to Node Buffer and returning bucket/objectKey coordinates.
- Created `src/lib/file-storage.test.ts` verifying atomic insertion, parameter bindings, and Uint8Array-to-Buffer normalization.
- Commit: `cbb3abd`

### Task 2: State machine validation, submission linking, and file query functions
- Implemented `InvalidFileStatusTransitionError` and `assertValidFileStatusTransition` enforcing the valid lifecycle:
  - Allowed: `PENDING_UPLOAD -> QUEUED`, `PENDING_UPLOAD -> ORPHANED`, `QUEUED -> SYNCED`, `QUEUED -> FAILED`.
  - Rejected: Illegal rewinds (`SYNCED -> PENDING_UPLOAD`), resurrection from terminal states (`FAILED -> QUEUED`, `ORPHANED -> SYNCED`), and skipping stages (`PENDING_UPLOAD -> SYNCED`).
- Implemented `linkFilesToSubmission`: atomically executes parameterized SQL updating `submission_files` to `QUEUED` and setting `submission_id` and `field_id` for matching IDs in `PENDING_UPLOAD` state.
- Implemented `getFilesBySubmissionId`: queries all files associated with a `submission_id` ordered by `created_at ASC`.
- Refactored `src/lib/file-jobs.ts` into a backward-compatible wrapper re-exporting `insertFileUploadJob` and `readFileUploadPayload` from `src/lib/file-storage.ts`.
- Added unit tests covering transition assertions, atomic submission linking, and file listing in `src/lib/file-storage.test.ts`.
- Verified full test suite (`193 passed`), ESLint, TypeScript check, and Docker container rebuild with healthy `/api/health`.
- Commit: `7d6a87b`

## Deviations from Plan
None - plan executed exactly as written.

## Verification
- `npx vitest run src/lib/file-storage.test.ts src/lib/file-jobs.test.ts`: Passed (19 tests).
- `npm test`: Full test suite passed (21 test files, 193 tests).
- `npx tsc --noEmit --pretty false`: Passed with zero type errors.
- `npm run lint`: Passed with zero errors.
- Smart Container Rebuild Protocol: Built `app` and `worker`, verified `isian-app Healthy` and `GET /api/health` returned status `ok`.

## Self-Check: PASSED
- `prisma/migrations/20261116130000_make_spool_payload_nullable/migration.sql` FOUND
- `src/lib/file-storage.ts` FOUND
- `src/lib/file-storage.test.ts` FOUND
- Commit `cbb3abd` FOUND
- Commit `7d6a87b` FOUND
