# Phase 48: Storage Abstraction & Postgres bytea Spool Layer - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 48 establishes a unified raw-SQL domain module (`src/lib/file-storage.ts`) that owns all file metadata records (`submission_files`), queue processing records (`file_upload_jobs`), and bytea spool byte transitions.
- All subsequent phases (Phase 49 public upload, Phase 50 worker sync, Phase 51 private file serving, Phase 52 admin attachments) will consume `file-storage.ts` rather than executing raw SQL directly.
- Implements strict state-machine transitions: `PENDING_UPLOAD → QUEUED → SYNCED` (or terminal `FAILED`, `ORPHANED`).
- Pure PostgreSQL bytea storage for spooled file payloads — no volume mounts, no ephemeral disk dependency.
- Unified UTC timestamp comparisons for all expiration, retry, and orphan garbage collection logic.
</domain>

<decisions>
## Implementation Decisions

### Domain API Contract (src/lib/file-storage.ts)
- **D-01: Module Architecture**: Create `src/lib/file-storage.ts` using `prisma.$queryRaw` and `prisma.$executeRaw` (matching `src/lib/forms.ts` and `src/lib/file-jobs.ts` precedents).
- **D-02: Core Persistence Functions**:
  - `recordFileUpload({ fileId, originalFilename, sanitizedFilename, mime, size, checksum, payload, bucket, objectKey })`: Inserts `submission_files` with status `PENDING_UPLOAD` and enqueues into `file_upload_jobs` with status `PENDING` and bytea payload.
  - `linkFilesToSubmission({ submissionId, fieldId, fileIds })`: Associates uploaded files with a completed form submission and updates status from `PENDING_UPLOAD` to `QUEUED`.
  - `getFilesBySubmissionId(submissionId)`: Lists all file metadata belonging to a submission.
  - `getFileForServing(fileId)`: Returns file metadata + spooled bytes (if still in `file_upload_jobs`) or object key (if synced to MinIO).
  - `claimUploadJobs(batchSize)`: Atomically claims pending jobs using `SELECT ... FOR UPDATE SKIP LOCKED` and sets status to `CLAIMED`.
  - `markFileJobSynced({ jobId, fileId, bucket, objectKey })`: Updates job to `DONE`, updates `submission_files` status to `SYNCED`, and frees bytea payload (`payload = NULL` or cleared bytea).
  - `markFileJobFailed({ jobId, fileId, error, nextAttemptAt, isTerminal })`: Updates job attempt count, error text, and status (`PENDING` with retry backoff or `FAILED`).
  - `cleanupOrphanedFiles(maxAgeHours)`: Flags unlinked `PENDING_UPLOAD` files older than retention window as `ORPHANED` and purges spool payload.

### State Machine Integrity
- **D-03: Transition Rules**:
  - `PENDING_UPLOAD` (uploaded by participant before form submission).
  - `QUEUED` (submission completed, awaiting MinIO upload or worker sync).
  - `SYNCED` (bytes verified in MinIO bucket, spool released).
  - `FAILED` (sync exhausted retries).
  - `ORPHANED` (submission never completed within expiration window).
  - Invalid transitions (e.g. `SYNCED → PENDING_UPLOAD` or resurrecting `FAILED`/`ORPHANED`) must be rejected.

### Byte Spool & Timestamps
- **D-04: Buffer Normalization**: Consistent with Phase 46 findings, normalize `Uint8Array` to Node `Buffer` at the Prisma/pg adapter boundary.
- **D-05: UTC Timestamp Conventions**: All SQL queries use `NOW() AT TIME ZONE 'UTC'` or `TIMESTAMPTZ` ISO-8601 formatting to eliminate timezone drift.
</decisions>

<canonical_refs>
## Canonical References

- `src/lib/file-jobs.ts` — Existing bytea payload read/write functions and table queries.
- `src/lib/storage.ts` — MinIO/S3 object storage client and deterministic key helpers (`buildObjectKey`).
- `prisma/migrations/20261116000000_add_file_upload_tables/migration.sql` — Schema definition for `submission_files` and `file_upload_jobs`.
- `prisma/migrations/20261116120000_swap_drive_columns_for_object_storage/migration.sql` — MinIO bucket and object_key column migration.
</canonical_refs>
