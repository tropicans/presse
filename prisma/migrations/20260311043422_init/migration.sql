-- CreateTable
CREATE TABLE "attendances" (
    "id" SERIAL NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "nip_nsp" TEXT NOT NULL,
    "jabatan" TEXT NOT NULL,
    "sebagai" TEXT NOT NULL,
    "unit_kerja" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendances_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "attendances_nip_nsp_key" ON "attendances"("nip_nsp");
