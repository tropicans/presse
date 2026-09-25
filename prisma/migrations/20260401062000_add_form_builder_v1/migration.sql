DO $$
BEGIN
  CREATE TYPE "FormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "FormMode" AS ENUM ('STANDARD', 'QUIZ');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

DO $$
BEGIN
  CREATE TYPE "FieldType" AS ENUM ('SHORT_TEXT', 'LONG_TEXT', 'RADIO', 'SELECT', 'YES_NO', 'SIGNATURE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS "forms" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "FormStatus" NOT NULL DEFAULT 'DRAFT',
  "mode" "FormMode" NOT NULL DEFAULT 'STANDARD',
  "success_message" TEXT,
  "settings_json" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "forms_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "forms"
  ADD COLUMN IF NOT EXISTS "settings_json" JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS "form_fields" (
  "id" TEXT NOT NULL,
  "form_id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "type" "FieldType" NOT NULL,
  "order" INTEGER NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "placeholder" TEXT,
  "help_text" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "form_fields_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "field_options" (
  "id" TEXT NOT NULL,
  "field_id" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "is_correct" BOOLEAN NOT NULL DEFAULT false,
  "points" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "field_options_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "field_options_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "form_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "submissions" (
  "id" TEXT NOT NULL,
  "form_id" TEXT NOT NULL,
  "path_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),

  CONSTRAINT "submissions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "submissions_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "submission_answers" (
  "id" TEXT NOT NULL,
  "submission_id" TEXT NOT NULL,
  "field_id" TEXT NOT NULL,
  "value_text" TEXT,
  "value_json" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "submission_answers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "submission_answers_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "submission_answers_field_id_fkey" FOREIGN KEY ("field_id") REFERENCES "form_fields"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "forms_slug_key" ON "forms"("slug");
CREATE INDEX IF NOT EXISTS "form_fields_form_id_order_idx" ON "form_fields"("form_id", "order");
CREATE UNIQUE INDEX IF NOT EXISTS "field_options_field_id_value_key" ON "field_options"("field_id", "value");
CREATE INDEX IF NOT EXISTS "submissions_form_id_created_at_idx" ON "submissions"("form_id", "created_at");
CREATE INDEX IF NOT EXISTS "submission_answers_submission_id_idx" ON "submission_answers"("submission_id");
CREATE INDEX IF NOT EXISTS "submission_answers_field_id_idx" ON "submission_answers"("field_id");
