ALTER TABLE users
  ADD COLUMN disabled_reason VARCHAR(500) NULL AFTER is_active,
  ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER disabled_reason;
