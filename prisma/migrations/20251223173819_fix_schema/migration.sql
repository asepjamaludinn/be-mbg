/*
  Warnings:

  - The values [WADAH_KEMBALI] on the enum `DistributionStatus` will be removed. If these variants are still used in the database, this will fail.
  - The primary key for the `Branch` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Distribution` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Material` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Request` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `RequestItem` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `School` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `Stock` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[code]` on the table `Request` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `updatedAt` to the `Branch` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Material` table without a default value. This is not possible if the table is not empty.
  - Added the required column `code` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Request` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `School` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Stock` table without a default value. This is not possible if the table is not empty.
  - Made the column `branchId` on table `Stock` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "DistributionStatus_new" AS ENUM ('DIKIRIM', 'DITERIMA', 'WADAH_BELUM_KEMBALI', 'WADAH_KEMBALI_SEBAGIAN', 'SELESAI');
ALTER TABLE "Distribution" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Distribution" ALTER COLUMN "status" TYPE "DistributionStatus_new" USING ("status"::text::"DistributionStatus_new");
ALTER TYPE "DistributionStatus" RENAME TO "DistributionStatus_old";
ALTER TYPE "DistributionStatus_new" RENAME TO "DistributionStatus";
DROP TYPE "DistributionStatus_old";
ALTER TABLE "Distribution" ALTER COLUMN "status" SET DEFAULT 'DIKIRIM';
COMMIT;

-- DropForeignKey
ALTER TABLE "Distribution" DROP CONSTRAINT "Distribution_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Distribution" DROP CONSTRAINT "Distribution_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_branchId_fkey";

-- DropForeignKey
ALTER TABLE "RequestItem" DROP CONSTRAINT "RequestItem_materialId_fkey";

-- DropForeignKey
ALTER TABLE "RequestItem" DROP CONSTRAINT "RequestItem_requestId_fkey";

-- DropForeignKey
ALTER TABLE "Stock" DROP CONSTRAINT "Stock_branchId_fkey";

-- DropForeignKey
ALTER TABLE "Stock" DROP CONSTRAINT "Stock_materialId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_branchId_fkey";

-- AlterTable
ALTER TABLE "Branch" DROP CONSTRAINT "Branch_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "isCenter" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Branch_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Branch_id_seq";

-- AlterTable
ALTER TABLE "Distribution" DROP CONSTRAINT "Distribution_pkey",
ADD COLUMN     "returnedContainer" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "branchId" SET DATA TYPE TEXT,
ALTER COLUMN "schoolId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Distribution_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Distribution_id_seq";

-- AlterTable
ALTER TABLE "Material" DROP CONSTRAINT "Material_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "Material_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Material_id_seq";

-- AlterTable
ALTER TABLE "Request" DROP CONSTRAINT "Request_pkey",
ADD COLUMN     "code" TEXT NOT NULL,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "processedById" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "branchId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Request_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Request_id_seq";

-- AlterTable
ALTER TABLE "RequestItem" DROP CONSTRAINT "RequestItem_pkey",
ADD COLUMN     "qtyApproved" DOUBLE PRECISION,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "requestId" SET DATA TYPE TEXT,
ALTER COLUMN "materialId" SET DATA TYPE TEXT,
ADD CONSTRAINT "RequestItem_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "RequestItem_id_seq";

-- AlterTable
ALTER TABLE "School" DROP CONSTRAINT "School_pkey",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "School_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "School_id_seq";

-- AlterTable
ALTER TABLE "Stock" DROP CONSTRAINT "Stock_pkey",
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "materialId" SET DATA TYPE TEXT,
ALTER COLUMN "branchId" SET NOT NULL,
ALTER COLUMN "branchId" SET DATA TYPE TEXT,
ADD CONSTRAINT "Stock_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "Stock_id_seq";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "branchId" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "LogActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LogActivity_createdAt_idx" ON "LogActivity"("createdAt");

-- CreateIndex
CREATE INDEX "Distribution_status_idx" ON "Distribution"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Request_code_key" ON "Request"("code");

-- CreateIndex
CREATE INDEX "Request_status_idx" ON "Request"("status");

-- CreateIndex
CREATE INDEX "Request_requestDate_idx" ON "Request"("requestDate");

-- CreateIndex
CREATE INDEX "Stock_branchId_idx" ON "Stock"("branchId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Request" ADD CONSTRAINT "Request_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestItem" ADD CONSTRAINT "RequestItem_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "Request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequestItem" ADD CONSTRAINT "RequestItem_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distribution" ADD CONSTRAINT "Distribution_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Distribution" ADD CONSTRAINT "Distribution_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogActivity" ADD CONSTRAINT "LogActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
