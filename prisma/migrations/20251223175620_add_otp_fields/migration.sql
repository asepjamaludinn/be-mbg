-- AlterTable
ALTER TABLE "User" ADD COLUMN     "otpExpiresAt" TIMESTAMP(3),
ADD COLUMN     "otpHash" TEXT;
