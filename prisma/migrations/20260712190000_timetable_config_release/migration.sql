-- SchoolTimetableConfig
CREATE TABLE `schooltimetableconfig` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `academicYear` VARCHAR(191) NOT NULL DEFAULT '2025-26',
    `daysJson` TEXT NOT NULL,

    UNIQUE INDEX `schooltimetableconfig_schoolId_academicYear_key`(`schoolId`, `academicYear`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `schooltimetableconfig` ADD CONSTRAINT `schooltimetableconfig_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ClassTimetableRelease
CREATE TABLE `classtimetablerelease` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `academicYear` VARCHAR(191) NOT NULL DEFAULT '2025-26',
    `isReleased` BOOLEAN NOT NULL DEFAULT false,
    `releasedAt` DATETIME(3) NULL,
    `releasedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `classtimetablerelease_schoolId_classId_academicYear_key`(`schoolId`, `classId`, `academicYear`),
    INDEX `classtimetablerelease_schoolId_academicYear_isReleased_idx`(`schoolId`, `academicYear`, `isReleased`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `classtimetablerelease` ADD CONSTRAINT `classtimetablerelease_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `classtimetablerelease` ADD CONSTRAINT `classtimetablerelease_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `schoolclass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
