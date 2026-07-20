-- Rename PascalCase indexes to Prisma's expected lowercase (mapped table) names.
-- MariaDB index names are case-insensitive, so we go via a tmp index
-- (tmp also keeps FK constraints satisfied during the swap).
SELECT CONCAT(
  'ALTER TABLE `shs`.`', s.table_name, '` ADD INDEX `tmpswap_', MD5(s.index_name), '` (',
  GROUP_CONCAT(CONCAT('`', s.column_name, '`') ORDER BY s.seq_in_index SEPARATOR ', '),
  ');\n',
  'ALTER TABLE `shs`.`', s.table_name, '` DROP INDEX `', s.index_name, '`;\n',
  'ALTER TABLE `shs`.`', s.table_name, '` ADD ',
  IF(MAX(s.non_unique) = 0, 'UNIQUE ', ''),
  'INDEX `', CONCAT(s.table_name, SUBSTRING(s.index_name, LOCATE('_', s.index_name))), '` (',
  GROUP_CONCAT(CONCAT('`', s.column_name, '`') ORDER BY s.seq_in_index SEPARATOR ', '),
  ');\n',
  'ALTER TABLE `shs`.`', s.table_name, '` DROP INDEX `tmpswap_', MD5(s.index_name), '`;'
) AS stmt
FROM information_schema.statistics s
WHERE s.table_schema = 'shs'
  AND s.index_name <> 'PRIMARY'
  AND s.index_name REGEXP BINARY '^[A-Z]'
GROUP BY s.table_name, s.index_name;
