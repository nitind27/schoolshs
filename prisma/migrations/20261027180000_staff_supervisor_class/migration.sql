CREATE TABLE `staffsupervisorclass` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `schoolId` VARCHAR(191) NOT NULL,
    `staffId` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `staffsupervisorclass_staffId_classId_key`(`staffId`, `classId`),
    INDEX `staffsupervisorclass_schoolId_idx`(`schoolId`),
    INDEX `staffsupervisorclass_staffId_idx`(`staffId`),
    INDEX `staffsupervisorclass_classId_idx`(`classId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `staffsupervisorclass` ADD CONSTRAINT `staffsupervisorclass_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `staffsupervisorclass` ADD CONSTRAINT `staffsupervisorclass_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `staff`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `staffsupervisorclass` ADD CONSTRAINT `staffsupervisorclass_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `schoolclass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
