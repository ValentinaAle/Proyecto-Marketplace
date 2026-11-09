require('dotenv').config();
const mysql = require('mysql2/promise');

const KEEP_EMAIL = 'ana.demo@fivox.com';
const apply = process.argv.includes('--apply');

async function run() {
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [targets] = await connection.execute(
      `SELECT u.id_user, u.email FROM users u
       WHERE u.email <> ? AND NOT EXISTS (
         SELECT 1 FROM users_roles ur INNER JOIN roles r ON r.id_role = ur.id_role
         WHERE ur.id_user = u.id_user AND r.name = 'ADMIN'
       ) ORDER BY u.id_user`,
      [KEEP_EMAIL],
    );
    console.table(targets);
    if (!apply) { console.log(`Vista previa: se eliminarían ${targets.length} usuarios comunes. Usá --apply para confirmar.`); return; }
    if (!targets.length) { console.log('No había otros usuarios comunes para eliminar.'); return; }

    const ids = targets.map((user) => user.id_user);
    const placeholders = ids.map(() => '?').join(', ');
    await connection.beginTransaction();
    const [posts] = await connection.execute(`SELECT id_post FROM posts WHERE id_user IN (${placeholders})`, ids);
    const postIds = posts.map((post) => post.id_post);
    const postPlaceholders = postIds.length ? postIds.map(() => '?').join(', ') : 'NULL';
    const [tickets] = await connection.execute(`SELECT id_ticket FROM support_tickets WHERE id_user IN (${placeholders})`, ids);
    const ticketIds = tickets.map((ticket) => ticket.id_ticket);
    const ticketPlaceholders = ticketIds.length ? ticketIds.map(() => '?').join(', ') : 'NULL';
    const [contacts] = await connection.execute(
      `SELECT id_contact FROM post_contacts WHERE id_user IN (${placeholders})${postIds.length ? ` OR id_post IN (${postPlaceholders})` : ''}`,
      [...ids, ...postIds],
    );
    const contactIds = contacts.map((contact) => contact.id_contact);
    const contactPlaceholders = contactIds.length ? contactIds.map(() => '?').join(', ') : 'NULL';

    await connection.execute(
      `DELETE FROM reviews WHERE id_user IN (${placeholders})${postIds.length ? ` OR id_post IN (${postPlaceholders})` : ''}${contactIds.length ? ` OR id_contact IN (${contactPlaceholders})` : ''}`,
      [...ids, ...postIds, ...contactIds],
    );
    if (contactIds.length) await connection.execute(`DELETE FROM post_contacts WHERE id_contact IN (${contactPlaceholders})`, contactIds);
    if (ticketIds.length) await connection.execute(`DELETE FROM support_messages WHERE id_ticket IN (${ticketPlaceholders})`, ticketIds);
    await connection.execute(`DELETE FROM support_messages WHERE id_user IN (${placeholders})`, ids);
    if (ticketIds.length) await connection.execute(`DELETE FROM support_tickets WHERE id_ticket IN (${ticketPlaceholders})`, ticketIds);
    if (postIds.length) await connection.execute(`DELETE FROM posts WHERE id_post IN (${postPlaceholders})`, postIds);
    await connection.execute(`DELETE FROM terms WHERE id_user IN (${placeholders})`, ids);
    await connection.execute(`DELETE FROM profiles WHERE id_user IN (${placeholders})`, ids);
    await connection.execute(`DELETE FROM users_roles WHERE id_user IN (${placeholders})`, ids);
    await connection.execute(`DELETE FROM users WHERE id_user IN (${placeholders})`, ids);
    await connection.commit();
    console.log(`Limpieza aplicada: ${targets.length} usuarios comunes eliminados. Se conservaron Ana y las cuentas administradoras.`);
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally { await connection.end(); }
}

run().catch((error) => { console.error('No se pudo limpiar la base:', error?.sqlMessage || error?.message || error); process.exitCode = 1; });
