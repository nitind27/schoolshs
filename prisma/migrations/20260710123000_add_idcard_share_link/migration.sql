-- CreateTable: ID Card share links (password-protected public print URLs)
CREATE TABLE `idcardsharelink` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `username` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(500) NOT NULL,
    `label` VARCHAR(191) NULL,
    `classId` VARCHAR(191) NULL,
    `standard` VARCHAR(191) NULL,
    `section` VARCHAR(191) NULL,
    `academicYear` VARCHAR(191) NOT NULL DEFAULT '2025-26',
    `expiresAt` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastAccessAt` DATETIME(3) NULL,
    `accessCount` INTEGER NOT NULL DEFAULT 0,
    `createdById` VARCHAR(191) NULL,

    UNIQUE INDEX `idcardsharelink_slug_key`(`slug`),
    INDEX `idcardsharelink_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `idcardsharelink` ADD CONSTRAINT `idcardsharelink_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
