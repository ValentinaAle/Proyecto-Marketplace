require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  const [users] = await connection.execute("SELECT id_user, email FROM users WHERE email LIKE '%.demo@fivox.com' ORDER BY email");
  for (const user of users) {
    const [contacts] = await connection.execute(
      `SELECT pc.id_contact, TIMESTAMPDIFF(DAY, pc.contacted_at, NOW()) AS days_since_contact,
              COUNT(r.id_review) AS already_reviewed
       FROM post_contacts pc INNER JOIN posts p ON p.id_post = pc.id_post
       LEFT JOIN reviews r ON r.id_contact = pc.id_contact
       WHERE pc.id_user = ? AND pc.discarded = 0 AND p.is_active = 1
       GROUP BY pc.id_contact, pc.contacted_at`,
      [user.id_user],
    );
    console.log(`${user.email}: ${contacts.length} contactos devueltos, ${contacts.filter((item) => Number(item.days_since_contact) >= 3 && !Number(item.already_reviewed)).length} listos para calificar.`);
  }
  await connection.end();
}

run().catch((error) => { console.error(error?.sqlMessage || error?.message || error); process.exitCode = 1; });
