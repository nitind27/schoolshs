-- Daily Attendance Book tables (run on MySQL if prisma db push is blocked)
CREATE TABLE IF NOT EXISTS `dailyattendancebook` (
  `id` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `schoolId` VARCHAR(191) NOT NULL,
  `dateIso` VARCHAR(191) NOT NULL,
  `academicYear` VARCHAR(191) NOT NULL,
  `dayOfWeek` VARCHAR(191) NOT NULL DEFAULT '',
  `workingDay` INT NULL,
  `shift` VARCHAR(191) NOT NULL DEFAULT '',
  `avgPercent` DOUBLE NULL,
  `principalSign` VARCHAR(191) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `dailyattendancebook_schoolId_dateIso_academicYear_key`(`schoolId`, `dateIso`, `academicYear`),
  INDEX `dailyattendancebook_schoolId_dateIso_idx`(`schoolId`, `dateIso`),
  CONSTRAINT `dailyattendancebook_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `dailyattendancebookrow` (
  `id` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `bookId` VARCHAR(191) NOT NULL,
  `classId` VARCHAR(191) NULL,
  `serial` INT NOT NULL,
  `standard` VARCHAR(191) NOT NULL DEFAULT '',
  `section` VARCHAR(191) NOT NULL DEFAULT '',
  `stream` VARCHAR(191) NOT NULL DEFAULT '',
  `presentBoys` INT NOT NULL DEFAULT 0,
  `presentGirls` INT NOT NULL DEFAULT 0,
  `absentBoys` INT NOT NULL DEFAULT 0,
  `absentGirls` INT NOT NULL DEFAULT 0,
  `newAdmBoys` INT NOT NULL DEFAULT 0,
  `newAdmGirls` INT NOT NULL DEFAULT 0,
  `leftBoys` INT NOT NULL DEFAULT 0,
  `leftGirls` INT NOT NULL DEFAULT 0,
  `teacherSign` VARCHAR(191) NOT NULL DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE INDEX `dailyattendancebookrow_bookId_classId_key`(`bookId`, `classId`),
  INDEX `dailyattendancebookrow_bookId_idx`(`bookId`),
  CONSTRAINT `dailyattendancebookrow_bookId_fkey` FOREIGN KEY (`bookId`) REFERENCES `dailyattendancebook`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
