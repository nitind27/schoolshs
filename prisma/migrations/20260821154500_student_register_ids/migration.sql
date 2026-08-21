-- School register fields: parent Aadhaar + UDISE+ PEN
ALTER TABLE `student` ADD COLUMN `motherAadhaarNumber` VARCHAR(12) NULL;
ALTER TABLE `student` ADD COLUMN `fatherAadhaarNumber` VARCHAR(12) NULL;
ALTER TABLE `student` ADD COLUMN `penNumber` VARCHAR(16) NULL;

CREATE INDEX `student_penNumber_idx` ON `student`(`penNumber`);
