-- Run once in phpMyAdmin / MySQL (Hostinger) if npm run db:migrate-gu-names fails
-- Skip any line that says "Duplicate column"

ALTER TABLE `student`
  ADD COLUMN `firstNameGu` VARCHAR(191) NULL,
  ADD COLUMN `middleNameGu` VARCHAR(191) NULL,
  ADD COLUMN `surnameGu` VARCHAR(191) NULL,
  ADD COLUMN `aadhaarNameGu` VARCHAR(191) NULL,
  ADD COLUMN `motherNameGu` VARCHAR(191) NULL,
  ADD COLUMN `fatherNameGu` VARCHAR(191) NULL,
  ADD COLUMN `guardianNameGu` VARCHAR(191) NULL;
