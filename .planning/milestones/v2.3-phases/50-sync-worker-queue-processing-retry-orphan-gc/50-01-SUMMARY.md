---
phase: 50-sync-worker-queue-processing-retry-orphan-gc
plan: 01
subsystem: worker + sync
tags:
  - sync-worker
  - minio
  - object-storage
  - exponential-backoff
  - orphan-gc
  - skip-locked
dependency_graph:
  requires:
    - 48-02
    - 49-02
  provides:
    - file-sync-engine
    - internal-file-jobs-route
    - worker-dual-queue-loop
  affects:
    - src/lib/file-sync.ts
    - src/lib/file-sync.test.ts
    - src/app/api/internal/file-jobs/process/route.ts
    - scripts/submission-worker.mjs
tech_stack:
  added: []
  patterns:
    - FOR UPDATE SKIP LOCKED job claiming
    - Idempotent deterministic object key uploads
    - Spool bytea payload nulling on SYNCED
    - Exponential backoff retry scheduling
    - Periodic orphan garbage collection
key_files:
  created:
    - src/lib/file-sync.ts
    - src/lib/file-sync.test.ts
    - src/app/api/internal/file-jobs/process/route.ts
  modified:
    - scripts/submission-worker.mjs
decisions:
  - D-01: processQueuedFileUploadJobs pushes bytes to MinIO using deterministic object_key
  - D-02: markFileJobSynced nulls bytea payload upon sync, preventing DB bloat
  - D-03: Exponential backoff with up to 5 attempts before marking FAILED
  - D-04: Periodic orphan GC sweeps unlinked PENDING_UPLOAD files older than 24h
  - D-05: Single unified operational worker script running both queues
metrics:
  duration: 15m
  completed_date: "2026-11-16"
status: complete
actuals:
  tasks: 2
  commits: 1
---

# Phase 50 Plan 01: Background Sync Engine, Queue Processing, Retry Backoff, Orphan GC, and Worker Integration Summary

## One-liner
Background synchronization engine pushing spooled files to MinIO idempotently, exponential retry backoff, orphan GC sweep, internal processing endpoint, and unified operational worker integration.

## Key Accomplishments
1. **Background Sync Engine**: Implemented `processQueuedFileUploadJobs` in `src/lib/file-sync.ts` claiming jobs, pushing to MinIO via `putObject` with deterministic object keys (`buildObjectKey`), and nulling PostgreSQL bytea payloads on `markFileJobSynced`.
2. **Exponential Backoff**: Implemented retry scheduling `(2^attempts * 2)s` for transient storage failures and terminal `FAILED` status capping at 5 attempts.
3. **Automated Orphan Sweep**: Integrated periodic `cleanupOrphanedFiles(24)` in the worker sync cycle to purge abandoned unlinked files and release storage.
4. **Internal Worker Endpoint**: Created `POST /api/internal/file-jobs/process` protected by `x-worker-token`.
5. **Unified Operational Worker**: Updated `scripts/submission-worker.mjs` to run both form submission processing and file upload processing without adding a second process or container.
6. **Container & Health**: Rebuilt Docker runtime (`app` and `worker`), verified `/api/internal/file-jobs/process` is live and `/api/health` returns `status: ok`.
