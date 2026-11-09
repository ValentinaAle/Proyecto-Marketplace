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
  const [columns] = await connection.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'support_tickets' AND COLUMN_NAME = 'last_read_admin_at'",
    [process.env.DB_NAME],
  );
  if (!columns.length) await connection.query('ALTER TABLE support_tickets ADD COLUMN last_read_admin_at DATETIME NULL AFTER last_read_at');
  await connection.query(
    `SELECT t.id_ticket,
            (SELECT COUNT(*) FROM support_messages unread
             WHERE unread.id_ticket = t.id_ticket
               AND (t.last_read_admin_at IS NULL OR unread.created_at > t.last_read_admin_at)
               AND NOT EXISTS (
                 SELECT 1 FROM users_roles unread_role
                 INNER JOIN roles unread_role_name ON unread_role_name.id_role = unread_role.id_role
                 WHERE unread_role.id_user = unread.id_user AND unread_role_name.name = 'ADMIN'
               )) AS admin_unread_count
     FROM support_tickets t LIMIT 1`,
  );
  await connection.end();
  console.log('Migración de lectura administrativa aplicada.');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
