/*
  Warnings:

  - You are about to drop the column `first_name` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `last_name` on the `attendances` table. All the data in the column will be lost.
  - You are about to drop the column `nip_nsp` on the `attendances` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[nip_nrp]` on the table `attendances` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `nama_lengkap` to the `attendances` table without a default value. This is not possible if the table is not empty.
  - Added the required column `nip_nrp` to the `attendances` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "attendances_nip_nsp_key";

-- AlterTable
ALTER TABLE "attendances" DROP COLUMN "first_name",
DROP COLUMN "last_name",
DROP COLUMN "nip_nsp",
ADD COLUMN     "nama_lengkap" TEXT NOT NULL,
ADD COLUMN     "nip_nrp" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "attendances_nip_nrp_key" ON "attendances"("nip_nrp");
