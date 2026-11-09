require('dotenv').config();
const mysql = require('mysql2/promise');

const demoEmails = ['ana.demo@fivox.com', 'marcos.demo@fivox.com', 'sofia.demo@fivox.com', 'diego.demo@fivox.com'];
const PENDING_PER_USER = 6;

async function run() {
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [users] = await connection.execute(`SELECT id_user, email FROM users WHERE email IN (${demoEmails.map(() => '?').join(', ')})`, demoEmails);
    if (users.length !== demoEmails.length) throw new Error('Faltan perfiles demo. Ejecutá primero npm run seed:demo.');
    await connection.beginTransaction();

    for (const user of users) {
      const [[pending]] = await connection.execute(
        `SELECT COUNT(*) AS total
         FROM post_contacts pc
         INNER JOIN posts p ON p.id_post = pc.id_post
         LEFT JOIN reviews r ON r.id_contact = pc.id_contact
         WHERE pc.id_user = ? AND pc.discarded = 0 AND p.is_active = 1 AND r.id_review IS NULL`,
        [user.id_user],
      );
      const missing = Math.max(0, PENDING_PER_USER - Number(pending.total));
      if (!missing) continue;
      const [posts] = await connection.execute(
        `SELECT p.id_post
         FROM posts p
         WHERE p.is_active = 1 AND p.id_user <> ?
           AND NOT EXISTS (
             SELECT 1 FROM post_contacts pc WHERE pc.id_post = p.id_post AND pc.id_user = ?
           )
         ORDER BY p.created_at DESC, p.id_post DESC
         LIMIT ${missing}`,
        [user.id_user, user.id_user],
      );
      for (let index = 0; index < posts.length; index += 1) {
        await connection.execute(
          `INSERT INTO post_contacts (id_post, id_user, contacted_at, discarded)
           VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), 0)`,
          [posts[index].id_post, user.id_user, 5 + index],
        );
      }
    }

    await connection.commit();
    const [summary] = await connection.execute(
      `SELECT u.email, COUNT(*) AS pending_to_rate
       FROM users u
       INNER JOIN post_contacts pc ON pc.id_user = u.id_user
       INNER JOIN posts p ON p.id_post = pc.id_post
       LEFT JOIN reviews r ON r.id_contact = pc.id_contact
       WHERE u.email IN (${demoEmails.map(() => '?').join(', ')})
         AND pc.discarded = 0 AND p.is_active = 1 AND r.id_review IS NULL
       GROUP BY u.id_user, u.email ORDER BY u.email`,
      demoEmails,
    );
    console.log('Servicios pendientes de calificación cargados.');
    console.table(summary);
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally { await connection.end(); }
}

run().catch((error) => { console.error('No se pudieron cargar los servicios para calificar:', error?.sqlMessage || error?.message || error); process.exitCode = 1; });
