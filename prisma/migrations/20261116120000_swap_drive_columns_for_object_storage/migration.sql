-- Architecture revision (2026-11-16): storage backend swapped from Google Drive
-- to MinIO (S3-compatible). Drive-specific identity columns are replaced by the
-- object coordinates used by the S3 API.

-- submission_files
ALTER TABLE "submission_files" RENAME COLUMN "drive_file_id" TO "object_key";
ALTER TABLE "submission_files" RENAME COLUMN "drive_id" TO "bucket";

DROP INDEX IF EXISTS "submission_files_drive_file_id_key";

ALTER TABLE "submission_files"
  ADD COLUMN IF NOT EXISTS "object_key" TEXT,
  ADD COLUMN IF NOT EXISTS "bucket" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "submission_files_bucket_object_key_key"
ON "submission_files" ("bucket", "object_key")
WHERE "object_key" IS NOT NULL;

-- file_upload_jobs: the spool job records which object it produced so a
-- retried push can verify the object instead of trusting its own log.
ALTER TABLE "file_upload_jobs" RENAME COLUMN "drive_file_id" TO "object_key";

ALTER TABLE "file_upload_jobs"
  ADD COLUMN IF NOT EXISTS "object_key" TEXT;
