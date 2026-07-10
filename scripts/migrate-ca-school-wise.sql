-- School-wise CA portal migration
-- Run: mysql -u USER -p DATABASE < scripts/migrate-ca-school-wise.sql

CREATE TABLE IF NOT EXISTS `caschoolassignment` (
  `id` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `userId` VARCHAR(191) NOT NULL,
  `schoolId` VARCHAR(191) NOT NULL,
  `isPrimary` BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `caschoolassignment_userId_schoolId_key`(`userId`, `schoolId`),
  INDEX `caschoolassignment_userId_idx`(`userId`),
  INDEX `caschoolassignment_schoolId_idx`(`schoolId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `financialyear`
  ADD COLUMN IF NOT EXISTS `submittedAt` DATETIME(3) NULL,
  ADD COLUMN IF NOT EXISTS `submittedById` VARCHAR(191) NULL,
  ADD COLUMN IF NOT EXISTS `submittedRemarks` TEXT NULL;

-- MySQL 8.0 may not support IF NOT EXISTS on ADD COLUMN; ignore errors if columns exist
