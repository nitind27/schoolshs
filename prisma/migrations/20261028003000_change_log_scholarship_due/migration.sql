ALTER TABLE `schoolsettings` ADD COLUMN `scholarshipPapersDue` VARCHAR(10) NULL;

CREATE TABLE `changelog` (
  `id` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `schoolId` VARCHAR(191) NOT NULL,
  `actorUserId` VARCHAR(191) NULL,
  `actorName` VARCHAR(191) NOT NULL,
  `actorRole` VARCHAR(191) NOT NULL,
  `kind` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `targetId` VARCHAR(191) NOT NULL,
  `targetLabel` TEXT NOT NULL,
  `summary` TEXT NOT NULL,
  `detailJson` TEXT NULL,

  INDEX `changelog_schoolId_createdAt_idx`(`schoolId`, `createdAt`),
  INDEX `changelog_schoolId_kind_createdAt_idx`(`schoolId`, `kind`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `changelog` ADD CONSTRAINT `changelog_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
