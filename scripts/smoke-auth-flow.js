require('dotenv').config();
const mysql = require('mysql2/promise');
const nodemailer = require('nodemailer');

const baseUrl = 'http://localhost:3000/api';
const email = `codex-auth-smoke-${Date.now()}@fivox.invalid`;
const initialPassword = 'Prueba123!';
const newPassword = 'Nueva456!';
const code = '654321';

async function request(path, body, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (response.status !== expectedStatus || !payload.ok) throw new Error(`${path}: HTTP ${response.status} - ${payload.message || 'respuesta inválida'}`);
  return payload;
}

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const registered = await request('/auth/register', { name: 'Prueba Auth', email, phone: '1100000000', password: initialPassword }, 201);
    if (!registered.data?.token) throw new Error('El registro no devolvió token.');
    await request('/auth/login', { email, password: initialPassword }, 200);

    const [users] = await connection.execute('SELECT id_user FROM users WHERE email = ? LIMIT 1', [email]);
    if (!users.length) throw new Error('La cuenta registrada no existe en MySQL.');
    await connection.execute('UPDATE users SET reset_token = ?, reset_token_expires = NOW() + INTERVAL 15 MINUTE WHERE id_user = ?', [code, users[0].id_user]);

    await request('/password/verify', { email, code }, 200);
    await request('/password/reset', { email, code, newPassword }, 200);
    await request('/auth/login', { email, password: newPassword }, 200);

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: Number(process.env.EMAIL_PORT || 465),
      secure: String(process.env.EMAIL_SECURE ?? 'true') !== 'false',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });
    await transporter.verify();
    console.log('AUTH_SMOKE_OK: registro, login, verificación, cambio de contraseña y SMTP.');
  } finally {
    const [users] = await connection.execute('SELECT id_user FROM users WHERE email = ? LIMIT 1', [email]);
    if (users.length) {
      const id = users[0].id_user;
      await connection.beginTransaction();
      try {
        await connection.execute('DELETE FROM users_roles WHERE id_user = ?', [id]);
        await connection.execute('DELETE FROM profiles WHERE id_user = ?', [id]);
        await connection.execute('DELETE FROM users WHERE id_user = ?', [id]);
        await connection.commit();
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
    await connection.end();
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
