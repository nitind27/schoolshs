-- Student delete: cascade general register + portal user when student is removed

-- generalregisterentry.studentId → CASCADE
SET @gr_fk := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'generalregisterentry'
    AND COLUMN_NAME = 'studentId'
    AND REFERENCED_TABLE_NAME = 'student'
  LIMIT 1
);
SET @gr_sql := IF(
  @gr_fk IS NOT NULL,
  CONCAT('ALTER TABLE `generalregisterentry` DROP FOREIGN KEY `', @gr_fk, '`'),
  'SELECT 1'
);
PREPARE gr_drop FROM @gr_sql;
EXECUTE gr_drop;
DEALLOCATE PREPARE gr_drop;

ALTER TABLE `generalregisterentry`
  ADD CONSTRAINT `generalregisterentry_studentId_fkey`
  FOREIGN KEY (`studentId`) REFERENCES `student`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- user.studentId → CASCADE
SET @user_fk := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'user'
    AND COLUMN_NAME = 'studentId'
    AND REFERENCED_TABLE_NAME = 'student'
  LIMIT 1
);
SET @user_sql := IF(
  @user_fk IS NOT NULL,
  CONCAT('ALTER TABLE `user` DROP FOREIGN KEY `', @user_fk, '`'),
  'SELECT 1'
);
PREPARE user_drop FROM @user_sql;
EXECUTE user_drop;
DEALLOCATE PREPARE user_drop;

ALTER TABLE `user`
  ADD CONSTRAINT `user_studentId_fkey`
  FOREIGN KEY (`studentId`) REFERENCES `student`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
