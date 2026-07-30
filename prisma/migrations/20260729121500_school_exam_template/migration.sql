-- Persist school-wide exam template independently from class application.
ALTER TABLE `schoolsettings` ADD COLUMN `examTemplate` TEXT NULL;
