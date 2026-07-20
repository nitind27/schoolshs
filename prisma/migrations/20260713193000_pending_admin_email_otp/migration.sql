-- Pending admin email OTP during school registration
CREATE TABLE `pendingadminemailverification` (
  `email` VARCHAR(191) NOT NULL,
  `adminName` VARCHAR(191) NOT NULL,
  `schoolName` VARCHAR(191) NULL,
  `otpHash` VARCHAR(191) NOT NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `verifiedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`email`)
);
