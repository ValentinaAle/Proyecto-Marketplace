require('dotenv').config();
const mysql = require('mysql2/promise');

async function run() {
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  const [users] = await connection.execute(
    `SELECT u.email, p.name, COUNT(po.id_post) AS publications
     FROM users u INNER JOIN profiles p ON p.id_user = u.id_user
     LEFT JOIN posts po ON po.id_user = u.id_user
     WHERE NOT EXISTS (SELECT 1 FROM users_roles ur INNER JOIN roles r ON r.id_role = ur.id_role WHERE ur.id_user = u.id_user AND r.name = 'ADMIN')
     GROUP BY u.id_user, u.email, p.name ORDER BY u.email`,
  );
  const [statuses] = await connection.execute(
    `SELECT u.email, po.is_active AS status, COUNT(*) AS total
     FROM users u INNER JOIN posts po ON po.id_user = u.id_user
     WHERE u.email IN ('ana.demo@fivox.com','marcos.demo@fivox.com','sofia.demo@fivox.com','diego.demo@fivox.com')
     GROUP BY u.email, po.is_active ORDER BY u.email, po.is_active`,
  );
  const [duplicates] = await connection.execute(
    `SELECT image_url, COUNT(*) AS total FROM posts
     WHERE image_url IS NOT NULL AND image_url <> ''
     GROUP BY image_url HAVING COUNT(*) > 1`,
  );
  const [images] = await connection.execute(
    `SELECT id_post, title, image_url FROM posts
     WHERE image_url IS NOT NULL AND image_url <> '' ORDER BY id_post`,
  );
  await connection.end();
  console.table(users);
  console.table(statuses);
  console.log(`Imágenes repetidas: ${duplicates.length}`);
  if (duplicates.length) console.table(duplicates);
  const hosts = images.reduce((totals, image) => {
    let host = 'URL inválida';
    try { host = new URL(image.image_url).host; } catch { /* reported as invalid */ }
    totals[host] = (totals[host] || 0) + 1;
    return totals;
  }, {});
  console.table(Object.entries(hosts).map(([host, total]) => ({ host, total })));
  const broken = [];
  for (let start = 0; start < images.length; start += 6) {
    const batch = images.slice(start, start + 6);
    const results = await Promise.all(batch.map(async (image) => {
      try {
        const response = await fetch(image.image_url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
        const contentType = response.headers.get('content-type') || '';
        await response.body?.cancel();
        return response.ok && contentType.startsWith('image/') ? null : { id_post: image.id_post, title: image.title, status: response.status, content_type: contentType, image_url: image.image_url };
      } catch (error) {
        return { id_post: image.id_post, title: image.title, status: 'ERROR', content_type: error instanceof Error ? error.message : 'Error de red', image_url: image.image_url };
      }
    }));
    broken.push(...results.filter(Boolean));
  }
  console.log(`Imágenes inaccesibles: ${broken.length}`);
  if (broken.length) console.table(broken);
}

run().catch((error) => { console.error(error?.sqlMessage || error?.message || error); process.exitCode = 1; });
