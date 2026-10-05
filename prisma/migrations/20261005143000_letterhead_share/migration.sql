-- Public read-only letterhead links (opaque token, selected pages only)
CREATE TABLE `letterheadshare` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `token` VARCHAR(64) NOT NULL,
    `schoolId` VARCHAR(191) NOT NULL,
    `title` VARCHAR(160) NOT NULL,
    `snapshot` JSON NOT NULL,
    `pageCount` INTEGER NOT NULL,
    `createdById` VARCHAR(191) NULL,

    UNIQUE INDEX `letterheadshare_token_key`(`token`),
    INDEX `letterheadshare_schoolId_idx`(`schoolId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `letterheadshare` ADD CONSTRAINT `letterheadshare_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `school`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
