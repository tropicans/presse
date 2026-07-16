DROP INDEX IF EXISTS "submission_answers_field_id_value_text_idx";

CREATE INDEX IF NOT EXISTS "submission_answers_field_id_value_text_prefix_idx"
ON "submission_answers" ("field_id", left("value_text", 512));
