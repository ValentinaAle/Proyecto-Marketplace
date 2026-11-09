require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  await connection.query(
    `CREATE TABLE IF NOT EXISTS admin_role_changes (
      id_change BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      actor_id INT NOT NULL,
      target_id INT NOT NULL,
      previous_role VARCHAR(20) NOT NULL,
      new_role VARCHAR(20) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id_change),
      INDEX idx_admin_role_changes_target (target_id, created_at),
      INDEX idx_admin_role_changes_actor (actor_id, created_at)
    )`,
  );
  await connection.end();
  console.log('Migración de auditoría de roles aplicada.');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
