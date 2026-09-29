import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host:     process.env.DB_HOST,
  port:     Number(process.env.DB_PORT || 3306),
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0,
});

// Verificar conexión al iniciar
pool.getConnection()
  .then((conn) => {
    console.log('✅ Conectado a MySQL:', process.env.DB_NAME);
    conn.release();
  })
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err);
    console.error('❌ Error al conectar con MySQL:', message);
    process.exit(1);
  });

export default pool;
