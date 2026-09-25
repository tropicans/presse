CREATE TABLE IF NOT EXISTS "submission_jobs" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "form_id" TEXT NOT NULL,
  "payload_json" JSONB NOT NULL,
  "path_json" JSONB,
  "dedupe_field_name" TEXT,
  "dedupe_value_text" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  "available_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "submission_jobs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "submission_jobs_submission_id_key"
ON "submission_jobs" ("submission_id");

CREATE INDEX IF NOT EXISTS "submission_jobs_status_available_idx"
ON "submission_jobs" ("status", "available_at", "created_at");

CREATE UNIQUE INDEX IF NOT EXISTS "submission_jobs_dedupe_key"
ON "submission_jobs" ("form_id", "dedupe_field_name", "dedupe_value_text")
WHERE "dedupe_field_name" IS NOT NULL AND "dedupe_value_text" IS NOT NULL AND "status" IN ('PENDING', 'PROCESSING', 'COMPLETED');
