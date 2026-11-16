---
phase: 48-storage-abstraction-postgres-bytea-spool-layer
plan: 02
subsystem: storage
tags:
  - storage
  - file-upload
  - queue-primitives
  - skip-locked
  - orphan-gc
  - live-db
dependency_graph:
  requires:
    - 48-01
  provides:
    - worker-queue-primitives
    - claimUploadJobs
    - markFileJobSynced
    - markFileJobFailed
    - cleanupOrphanedFiles
  affects:
    - src/lib/file-storage.ts
    - src/lib/file-storage.test.ts
tech_stack:
  added: []
  patterns:
    - FOR UPDATE SKIP LOCKED job claiming
    - Single transaction batch state advances
    - Zero-bloat payload nulling upon sync
    - UTC interval based orphan GC
key_files:
  created: []
  modified:
    - src/lib/file-storage.ts
    - src/lib/file-storage.test.ts
decisions:
  - D-02: claimUploadJobs uses SELECT ... FOR UPDATE SKIP LOCKED inside transaction to prevent race conditions
  - D-02 & D-05: markFileJobSynced updates job to DONE, nulls bytea payload to reclaim storage, and sets file status to SYNCED
  - D-02: markFileJobFailed handles retry backoff or terminal FAILED status
  - D-05: cleanupOrphanedFiles purges expired unlinked PENDING_UPLOAD files and spooled payloads using UTC interval
metrics:
  duration: 15m
  completed_date: "2026-11-16"
status: complete
actuals:
  tasks: 2
  commits: 1
---

# Phase 48 Plan 02: Queue Primitives, Payload Nulling on Sync, Retry Backoff, Orphan GC, and Live DB Test Summary

## One-liner
Worker queue primitives (`claimUploadJobs`, `markFileJobSynced`, `markFileJobFailed`), orphan cleanup garbage collector (`cleanupOrphanedFiles`), and verified live PostgreSQL lifecycle test.

## Key Accomplishments
1. **Worker Queue Claiming**: Implemented `claimUploadJobs` with batch-size clamping (max 50) and atomic `SELECT ... FOR UPDATE SKIP LOCKED` query.
2. **Payload Storage Reclamation**: Implemented `markFileJobSynced` setting `payload = NULL` in `file_upload_jobs` immediately upon sync, eliminating database bloat while maintaining audit trails.
3. **Failure Backoff & Terminal States**: Implemented `markFileJobFailed` supporting exponential retry timestamps and terminal failure tracking.
4. **Orphan GC**: Implemented `cleanupOrphanedFiles` purging abandoned unlinked uploads and freeing spooled payloads based on a configurable UTC age threshold.
5. **Live DB Test**: Proved the entire upload -> submission link -> claim -> mark synced lifecycle end-to-end against real PostgreSQL container with byte-identical payload handling.

## Verification
- Unit test suite in `src/lib/file-storage.test.ts` (29 tests) passes cleanly.
- Live PostgreSQL integration test executed and verified against `isian-postgres`.
- Pre-flight validation (`npm test`, `npm run lint`, `npx tsc`) passes with 0 errors.
- Docker containers rebuilt and application `/api/health` confirmed `ok`.
