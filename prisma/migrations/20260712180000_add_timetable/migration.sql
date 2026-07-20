-- CreateTable
CREATE TABLE `timetableentry` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `academicYear` VARCHAR(191) NOT NULL DEFAULT '2025-26',
    `dayOfWeek` INTEGER NOT NULL,
    `periodIndex` INTEGER NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NULL,
    `room` VARCHAR(191) NULL,

    INDEX `timetableentry_schoolId_classId_academicYear_idx`(`schoolId`, `classId`, `academicYear`),
    UNIQUE INDEX `timetableentry_schoolId_classId_academicYear_dayOfWeek_periodIndex_key`(`schoolId`, `classId`, `academicYear`, `dayOfWeek`, `periodIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `timetableentry` ADD CONSTRAINT `timetableentry_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetableentry` ADD CONSTRAINT `timetableentry_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `schoolclass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timetableentry` ADD CONSTRAINT `timetableentry_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `staff`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
