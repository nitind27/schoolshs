CREATE TABLE `examseatassignment` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `examId` VARCHAR(191) NOT NULL,
    `termKey` VARCHAR(191) NOT NULL,
    `classId` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `seatNumber` VARCHAR(40) NOT NULL,
    `assignedBy` VARCHAR(191) NULL,

    UNIQUE INDEX `examseatassignment_examId_termKey_studentId_key`(`examId`, `termKey`, `studentId`),
    UNIQUE INDEX `examseatassignment_examId_termKey_seatNumber_key`(`examId`, `termKey`, `seatNumber`),
    INDEX `examseatassignment_schoolId_classId_idx`(`schoolId`, `classId`),
    INDEX `examseatassignment_studentId_idx`(`studentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `examseatassignment`
    ADD CONSTRAINT `examseatassignment_schoolId_fkey`
    FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `examseatassignment_examId_fkey`
    FOREIGN KEY (`examId`) REFERENCES `exam`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `examseatassignment_classId_fkey`
    FOREIGN KEY (`classId`) REFERENCES `schoolclass`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT `examseatassignment_studentId_fkey`
    FOREIGN KEY (`studentId`) REFERENCES `student`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
