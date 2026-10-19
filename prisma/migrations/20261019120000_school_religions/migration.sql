CREATE TABLE `schoolreligion` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `schoolId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(80) NOT NULL,

    UNIQUE INDEX `schoolreligion_schoolId_name_key`(`schoolId`, `name`),
    INDEX `schoolreligion_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `schoolreligion` ADD CONSTRAINT `schoolreligion_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
