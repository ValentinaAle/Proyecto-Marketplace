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
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME IN ('disabled_reason', 'deleted_at')",
    [process.env.DB_NAME],
  );
  const names = new Set(columns.map((column) => column.COLUMN_NAME));
  if (!names.has('disabled_reason')) await connection.query('ALTER TABLE users ADD COLUMN disabled_reason VARCHAR(500) NULL AFTER is_active');
  if (!names.has('deleted_at')) await connection.query('ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL AFTER disabled_reason');
  await connection.end();
  console.log('Migración de estados de usuario aplicada.');
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
