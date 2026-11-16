-- AlterEnum
ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE';

-- submission_files: metadata for uploaded files. Status vocabulary (D-09):
--   PENDING | SYNCED | FAILED | ORPHANED
-- Intentionally NOT the submission_jobs enum (PENDING/PROCESSING/DONE/FAILED).
CREATE TABLE IF NOT EXISTS "submission_files" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT,
  "field_id" TEXT,
  "original_filename" TEXT NOT NULL,
  "sanitized_filename" TEXT NOT NULL,
  "mime" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "checksum" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "drive_file_id" TEXT,
  "drive_id" TEXT,
  "last_error" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "submission_files_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "submission_files_submission_id_idx"
ON "submission_files" ("submission_id");

CREATE INDEX IF NOT EXISTS "submission_files_status_created_idx"
ON "submission_files" ("status", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "submission_files_drive_file_id_key"
ON "submission_files" ("drive_file_id")
WHERE "drive_file_id" IS NOT NULL;

-- file_upload_jobs: bytea spool. Status vocabulary (FILE-03):
--   PENDING | CLAIMED | DONE | FAILED
-- D-10: payload is written once at upload time; worker only pushes to Drive.
CREATE TABLE IF NOT EXISTS "file_upload_jobs" (
  "id" TEXT NOT NULL,
  "file_id" TEXT NOT NULL,
  "payload" BYTEA NOT NULL,
  "payload_mime" TEXT NOT NULL,
  "payload_size" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_attempt_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "last_error" TEXT,
  "drive_file_id" TEXT,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "file_upload_jobs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "file_upload_jobs_status_next_idx"
ON "file_upload_jobs" ("status", "next_attempt_at", "created_at");

CREATE INDEX IF NOT EXISTS "file_upload_jobs_file_id_idx"
ON "file_upload_jobs" ("file_id");
