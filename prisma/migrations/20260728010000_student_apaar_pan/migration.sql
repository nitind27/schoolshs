-- AlterTable (short VARCHAR to avoid MySQL row-size limit)
ALTER TABLE `student` ADD COLUMN `apaarId` VARCHAR(16) NULL;
ALTER TABLE `student` ADD COLUMN `panNumber` VARCHAR(10) NULL;

-- CreateIndex
CREATE INDEX `student_apaarId_idx` ON `student`(`apaarId`);
CREATE INDEX `student_panNumber_idx` ON `student`(`panNumber`);
