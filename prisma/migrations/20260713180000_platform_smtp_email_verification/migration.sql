-- Platform SMTP settings + user email verification
CREATE TABLE `platformsettings` (
  `id` VARCHAR(191) NOT NULL DEFAULT 'platform',
  `updatedAt` DATETIME(3) NOT NULL,
  `emailEnabled` BOOLEAN NOT NULL DEFAULT false,
  `smtpHost` VARCHAR(191) NULL,
  `smtpPort` INTEGER NOT NULL DEFAULT 587,
  `smtpSecure` BOOLEAN NOT NULL DEFAULT false,
  `smtpUser` VARCHAR(191) NULL,
  `smtpPasswordEnc` TEXT NULL,
  `smtpFromName` VARCHAR(191) NULL DEFAULT 'SHS Education Portal',
  `smtpFromEmail` VARCHAR(191) NULL,
  `smtpReplyTo` VARCHAR(191) NULL,
  `smtpLastTestAt` DATETIME(3) NULL,
  `smtpLastTestOk` BOOLEAN NULL,
  `smtpLastTestError` TEXT NULL,
  PRIMARY KEY (`id`)
);

INSERT INTO `platformsettings` (`id`, `updatedAt`, `emailEnabled`) VALUES ('platform', NOW(3), false);

ALTER TABLE `user` ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `user` ADD COLUMN `emailVerificationToken` VARCHAR(191) NULL;
ALTER TABLE `user` ADD COLUMN `emailVerificationExpires` DATETIME(3) NULL;
ALTER TABLE `user` ADD COLUMN `emailVerifiedAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `user_emailVerificationToken_key` ON `user`(`emailVerificationToken`);

-- Existing users: mark verified so login is not blocked
UPDATE `user` SET `emailVerified` = true, `emailVerifiedAt` = NOW(3) WHERE `emailVerified` = false;
