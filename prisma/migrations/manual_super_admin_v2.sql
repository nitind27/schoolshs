-- Super Admin v2: school extended fields + subscription + payments
-- Run manually if prisma db push fails

ALTER TABLE `school`
  ADD COLUMN IF NOT EXISTS `taluka` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `city` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `pincode` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `alternatePhone` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `website` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `principalName` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `schoolType` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `boardAffiliation` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `udiseCode` VARCHAR(191) NULL;

CREATE UNIQUE INDEX IF NOT EXISTS `school_udiseCode_key` ON `school`(`udiseCode`);
CREATE INDEX IF NOT EXISTS `school_district_idx` ON `school`(`district`);

CREATE TABLE IF NOT EXISTS `schoolsubscription` (
  `id` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `schoolId` VARCHAR(191) NOT NULL,
  `planName` VARCHAR(191) NOT NULL DEFAULT 'standard',
  `contractNumber` VARCHAR(191) NULL,
  `contractValue` DECIMAL(12, 2) NULL,
  `contractStartDate` DATETIME(3) NULL,
  `contractEndDate` DATETIME(3) NULL,
  `contractDocumentPath` VARCHAR(191) NULL,
  `contractNotes` TEXT NULL,
  `enabledFeatures` JSON NOT NULL,
  `paymentStatus` VARCHAR(191) NOT NULL DEFAULT 'pending',
  `totalAmount` DECIMAL(12, 2) NULL,
  `paidAmount` DECIMAL(12, 2) NOT NULL DEFAULT 0,
  `nextDueDate` DATETIME(3) NULL,
  UNIQUE INDEX `schoolsubscription_schoolId_key`(`schoolId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `schoolpayment` (
  `id` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `schoolId` VARCHAR(191) NOT NULL,
  `amount` DECIMAL(12, 2) NOT NULL,
  `paymentDate` DATETIME(3) NOT NULL,
  `paymentMethod` VARCHAR(191) NULL,
  `referenceNo` VARCHAR(191) NULL,
  `notes` VARCHAR(191) NULL,
  `receivedBy` VARCHAR(191) NULL,
  INDEX `schoolpayment_schoolId_idx`(`schoolId`),
  INDEX `schoolpayment_paymentDate_idx`(`paymentDate`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
