-- School-wide subject master + standard assignment
CREATE TABLE `schoolsubject` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `shortName` VARCHAR(191) NOT NULL DEFAULT '',
    `type` VARCHAR(191) NOT NULL DEFAULT 'numeric',
    `maxMarks` INTEGER NOT NULL DEFAULT 100,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,

    UNIQUE INDEX `schoolsubject_schoolId_code_key`(`schoolId`, `code`),
    INDEX `schoolsubject_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `standardsubject` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `standard` VARCHAR(191) NOT NULL,
    `stream` VARCHAR(191) NOT NULL DEFAULT '',
    `subjectId` VARCHAR(191) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,

    UNIQUE INDEX `standardsubject_schoolId_standard_stream_subjectId_key`(`schoolId`, `standard`, `stream`, `subjectId`),
    INDEX `standardsubject_schoolId_standard_idx`(`schoolId`, `standard`),
    INDEX `standardsubject_subjectId_idx`(`subjectId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `schoolsubject` ADD CONSTRAINT `schoolsubject_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `standardsubject` ADD CONSTRAINT `standardsubject_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `standardsubject` ADD CONSTRAINT `standardsubject_subjectId_fkey` FOREIGN KEY (`subjectId`) REFERENCES `schoolsubject`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
