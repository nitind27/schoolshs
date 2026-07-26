-- Staff bilingual names (EN + GU)
ALTER TABLE `staff`
  ADD COLUMN `firstNameGu` VARCHAR(191) NULL,
  ADD COLUMN `lastNameGu` VARCHAR(191) NULL;
