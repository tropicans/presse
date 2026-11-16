# Phase 50: Sync Worker, Queue Processing, Retry & Orphan GC - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 50 implements the asynchronous synchronization pipeline between PostgreSQL bytea spool and MinIO object storage:
1. Queue processor logic (`processQueuedFileUploadJobs`) claiming pending jobs with `FOR UPDATE SKIP LOCKED`, pushing bytes to MinIO using deterministic keys (`buildObjectKey(fileId)`), and marking jobs `DONE` with `payload = NULL` and files `SYNCED`.
2. Exponential retry backoff for transient failures (network blip, temporary MinIO unavailability) up to 5 attempts, transitioning to `FAILED` without blocking subsequent jobs.
3. Automated orphan garbage collection (`cleanupOrphanedFiles`) purging abandoned `PENDING_UPLOAD` files older than 24 hours.
4. Internal Route `POST /api/internal/file-jobs/process` protected by `x-worker-token`.
5. Worker expansion in `scripts/submission-worker.mjs` executing file job batches concurrently with submission jobs.
</domain>

<decisions>
## Implementation Decisions

### Sync Processing Engine (src/lib/file-sync.ts)
- **D-01: Claim & Push Loop**: Claim jobs via `claimUploadJobs(batchSize)`. For each job, call `putObject(buildObjectKey(job.fileId), job.payload, job.payloadMime)`.
- **D-02: Zero-Bloat State Advancement**: On upload success, invoke `markFileJobSynced({ jobId, fileId, bucket: getBucket(), objectKey })` which sets `payload = NULL`.
- **D-03: Exponential Backoff & Terminal Failure**: On upload failure, increment attempt count; if `< 5`, schedule retry `next_attempt_at = NOW() + (2^attempts * 2)s`. If `>= 5`, mark as terminal `FAILED`.
- **D-04: Orphan Sweeper**: Worker run periodically executes `cleanupOrphanedFiles(24)` to mark unlinked uploads `ORPHANED` and release spool bytes.

### Route & Worker
- **D-05: Internal Endpoint**: `POST /api/internal/file-jobs/process` validates `x-worker-token` header against `INTERNAL_WORKER_TOKEN`.
- **D-06: Unified Worker**: `scripts/submission-worker.mjs` runs both form submission batch and file upload batch in the same event loop with shared backoff.
</decisions>

<canonical_refs>
## Canonical References
- `src/lib/storage.ts` — `putObject`, `buildObjectKey`, `getBucket`.
- `src/lib/file-storage.ts` — `claimUploadJobs`, `markFileJobSynced`, `markFileJobFailed`, `cleanupOrphanedFiles`.
- `scripts/submission-worker.mjs` — Operational worker script.
- `src/app/api/internal/submission-jobs/process/route.ts` — Pattern for internal worker token validation.
</canonical_refs>
