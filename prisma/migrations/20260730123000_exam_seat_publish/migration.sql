ALTER TABLE `examseatassignment`
    ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `publishedAt` DATETIME(3) NULL;

CREATE INDEX `examseatassignment_examId_termKey_isPublished_idx`
    ON `examseatassignment`(`examId`, `termKey`, `isPublished`);
