-- Login security: failed attempts + account lock
ALTER TABLE `user` ADD COLUMN `failedLoginCount` INTEGER NOT NULL DEFAULT 0;
ALTER TABLE `user` ADD COLUMN `lockedUntil` DATETIME(3) NULL;
