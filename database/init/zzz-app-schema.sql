-- Campos que ya consume el backend y que no estaban en el export original.
-- El nombre asegura que se ejecute después de todos los archivos marketplace_db_*.sql.
USE marketplace_db;

ALTER TABLE users
  ADD COLUMN reset_token VARCHAR(6) NULL,
  ADD COLUMN reset_token_expires DATETIME NULL;

ALTER TABLE support_tickets
  ADD COLUMN last_read_at DATETIME NULL,
  ADD COLUMN last_read_admin_at DATETIME NULL,
  ADD COLUMN last_message_at DATETIME NULL;

ALTER TABLE posts
  ADD COLUMN rejection_reason VARCHAR(255) NULL AFTER is_active,
  ADD COLUMN proposed_category VARCHAR(45) NULL AFTER id_category;
