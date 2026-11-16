-- AlterTable
ALTER TABLE "file_upload_jobs" ALTER COLUMN "payload" DROP NOT NULL;

-- AlterTable
ALTER TABLE "submission_files" ALTER COLUMN "status" SET DEFAULT 'PENDING_UPLOAD';
