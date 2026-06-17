-- CreateTable
CREATE TABLE "form_ai_analyses" (
    "id" TEXT NOT NULL,
    "form_id" TEXT NOT NULL,
    "analysis_text" TEXT NOT NULL,
    "analyzed_count" INTEGER NOT NULL,
    "model_used" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "form_ai_analyses_form_id_key" ON "form_ai_analyses"("form_id");

-- AddForeignKey
ALTER TABLE "form_ai_analyses" ADD CONSTRAINT "form_ai_analyses_form_id_fkey" FOREIGN KEY ("form_id") REFERENCES "forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
