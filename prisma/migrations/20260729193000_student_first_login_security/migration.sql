ALTER TABLE `user`
    ADD COLUMN `mustChangePassword` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `passwordChangedAt` DATETIME(3) NULL;
