CREATE TABLE IF NOT EXISTS admin_role_changes (
  id_change BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_id INT NOT NULL,
  target_id INT NOT NULL,
  previous_role VARCHAR(20) NOT NULL,
  new_role VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_change),
  INDEX idx_admin_role_changes_target (target_id, created_at),
  INDEX idx_admin_role_changes_actor (actor_id, created_at)
);
