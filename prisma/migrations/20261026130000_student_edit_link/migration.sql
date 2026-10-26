CREATE TABLE `studenteditlink` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `code` VARCHAR(12) NOT NULL,
    `passwordEnc` TEXT NOT NULL,
    `fieldsJson` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdById` VARCHAR(191) NULL,
    `lastUsedAt` DATETIME(3) NULL,

    UNIQUE INDEX `studenteditlink_code_key`(`code`),
    INDEX `studenteditlink_schoolId_idx`(`schoolId`),
    INDEX `studenteditlink_classId_idx`(`classId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `studenteditlink` ADD CONSTRAINT `studenteditlink_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `studenteditlink` ADD CONSTRAINT `studenteditlink_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `schoolclass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
