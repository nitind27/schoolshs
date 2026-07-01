-- AlterTable
ALTER TABLE "Student" ADD COLUMN "aadhaarDocPath" TEXT;
ALTER TABLE "Student" ADD COLUMN "bankPassbookPath" TEXT;
ALTER TABLE "Student" ADD COLUMN "casteCertPath" TEXT;
ALTER TABLE "Student" ADD COLUMN "dgLoginId" TEXT;
ALTER TABLE "Student" ADD COLUMN "dgLoginMethod" TEXT DEFAULT 'mobile';
ALTER TABLE "Student" ADD COLUMN "dgPassword" TEXT;
ALTER TABLE "Student" ADD COLUMN "feeReceiptPath" TEXT;
ALTER TABLE "Student" ADD COLUMN "incomeCertPath" TEXT;
ALTER TABLE "Student" ADD COLUMN "lastAutomationAt" DATETIME;
ALTER TABLE "Student" ADD COLUMN "lastAutomationLog" TEXT;
ALTER TABLE "Student" ADD COLUMN "marksheet10Path" TEXT;
ALTER TABLE "Student" ADD COLUMN "marksheet12Path" TEXT;
ALTER TABLE "Student" ADD COLUMN "photoPath" TEXT;
