-- Agrega los campos utilizados por el flujo de recuperación de contraseña.
-- Es idempotente para bases locales creadas antes de incorporar estas columnas.
USE marketplace_db;

SET @has_reset_token = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'reset_token'
);
SET @add_reset_token = IF(
  @has_reset_token = 0,
  'ALTER TABLE users ADD COLUMN reset_token VARCHAR(6) NULL',
  'SELECT 1'
);
PREPARE statement FROM @add_reset_token;
EXECUTE statement;
DEALLOCATE PREPARE statement;

SET @has_reset_expiration = (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND COLUMN_NAME = 'reset_token_expires'
);
SET @add_reset_expiration = IF(
  @has_reset_expiration = 0,
  'ALTER TABLE users ADD COLUMN reset_token_expires DATETIME NULL',
  'SELECT 1'
);
PREPARE statement FROM @add_reset_expiration;
EXECUTE statement;
DEALLOCATE PREPARE statement;
