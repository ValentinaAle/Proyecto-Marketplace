ALTER TABLE posts
  ADD COLUMN rejection_reason VARCHAR(255) NULL AFTER is_active;
