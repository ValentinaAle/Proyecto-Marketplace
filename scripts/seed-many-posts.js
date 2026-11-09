require('dotenv').config();
const mysql = require('mysql2/promise');

const owners = ['ana.demo@fivox.com', 'marcos.demo@fivox.com', 'sofia.demo@fivox.com', 'diego.demo@fivox.com'];
const services = [
  ['Técnicos', 'Revisión de instalación eléctrica', 'Diagnóstico de tableros, tomas y circuitos domiciliarios con recomendaciones claras de seguridad.'],
  ['Técnicos', 'Mantenimiento de griferías y sanitarios', 'Revisión, ajuste y reparación de pérdidas en cocinas y baños con prueba final de funcionamiento.'],
  ['Docentes', 'Clases de apoyo para secundaria', 'Acompañamiento personalizado para organizar contenidos, resolver ejercicios y preparar evaluaciones.'],
  ['Docentes', 'Práctica de conversación en inglés', 'Encuentros dinámicos para mejorar pronunciación, vocabulario y confianza en situaciones cotidianas.'],
  ['Freelancers', 'Desarrollo de página para emprendimientos', 'Diseño y desarrollo de un sitio adaptable para presentar productos, servicios y medios de contacto.'],
  ['Freelancers', 'Organización de contenido digital', 'Planificación mensual de temas, formatos y calendario para mantener una comunicación consistente.'],
  ['Salud', 'Entrenamiento funcional personalizado', 'Rutinas progresivas adaptadas a objetivos, experiencia previa y disponibilidad semanal de cada persona.'],
  ['Salud', 'Asesoramiento para hábitos saludables', 'Orientación práctica para organizar comidas, descanso y actividad física dentro de la rutina diaria.'],
  ['Diseño', 'Diseño visual para redes sociales', 'Creación de piezas digitales coherentes con la identidad y los objetivos de comunicación de la marca.'],
  ['Fotografía', 'Fotografía profesional de productos', 'Producción de imágenes cuidadas para catálogos, tiendas online, campañas y publicaciones en redes.'],
];
const imageIdsByService = [
  ['photo-1581094794329-c8112a89af12', 'photo-1621905251918-48416bd8575a', 'photo-1504307651254-35680f356dfd', 'photo-1581092160562-40aa08e78837'],
  ['photo-1607472586893-edb57bdc0e39', 'photo-1584622650111-993a426fbf0a', 'photo-1504148455328-c376907d081c', 'photo-1542013936693-884638332954'],
  ['photo-1522202176988-66273c2fd55f', 'photo-1544717305-2782549b5136', 'photo-1456513080510-7bf3a84b82f8', 'photo-1488190211105-8b0e65b80b4e'],
  ['photo-1457369804613-52c61a468e7d', 'photo-1524178232363-1fb2b075b655', 'photo-1529070538774-1843cb3265df', 'photo-1503676260728-1c00da094a0b'],
  ['photo-1517245386807-bb43f82c33c4', 'photo-1551434678-e076c223a692', 'photo-1516321497487-e288fb19713f', 'photo-1460925895917-afdab827c52f'],
  ['photo-1552664730-d307ca884978', 'photo-1542744173-8e7e53415bb0', 'photo-1611162616305-c69b3fa7fbe0', 'photo-1611926653458-09294b3142bf'],
  ['photo-1571019613454-1cb2f99b2d8b', 'photo-1581009146145-b5ef050c2e1e', 'photo-1594737625785-a6cbdabd333c', 'photo-1518611012118-696072aa579a'],
  ['photo-1490645935967-10de6ba17061', 'photo-1494390248081-4e521a5940db', 'photo-1476224203421-9ac39bcb3327', 'photo-1512621776951-a57141f2eefd'],
  ['photo-1523726491678-bf852e717f6a', 'photo-1500530855697-b586d89ba3ee', 'photo-1618005198919-d3d4b5a92ead', 'photo-1541462608143-67571c6738dd'],
  ['photo-1452780212940-6f5c0d14d848', 'photo-1502920917128-1aa500764cbd', 'photo-1516035069371-29a1b244cc32', 'photo-1471341971476-ae15ff5dd4ea'],
];

async function run() {
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT || 3306, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const [users] = await connection.execute(`SELECT id_user, email FROM users WHERE email IN (${owners.map(() => '?').join(', ')})`, owners);
    const userIds = new Map(users.map((user) => [user.email, user.id_user]));
    if (userIds.size !== owners.length) throw new Error('Faltan perfiles demo. Ejecutá primero npm run seed:demo.');
    const [categories] = await connection.execute('SELECT id_category, name FROM categories');
    const categoryIds = new Map(categories.map((category) => [category.name, category.id_category]));
    await connection.beginTransaction();

    for (let index = 0; index < 40; index += 1) {
      const ownerEmail = owners[index % owners.length];
      const [category, baseTitle, description] = services[index % services.length];
      const edition = Math.floor(index / services.length) + 1;
      const title = `${baseTitle} · ${edition}`;
      const ownerId = userIds.get(ownerEmail);
      const categoryId = categoryIds.get(category);
      const ownerPosition = Math.floor(index / owners.length);
      const statusCycle = [1, 1, 1, 1, 1, 2, 2, 3, 3, 4];
      const status = statusCycle[ownerPosition];
      const rejectionReason = status === 3
        ? 'Revisá el título y ampliá el detalle del alcance antes de volver a enviarla.'
        : status === 4
          ? 'Agregá información sobre modalidad, tiempos de entrega y qué incluye el servicio.'
          : null;
      const imageId = imageIdsByService[index % services.length][edition - 1];
      const image = `https://images.unsplash.com/${imageId}?auto=format&fit=crop&w=1200&q=82`;
      const [[stored]] = await connection.execute('SELECT id_post FROM posts WHERE id_user = ? AND title = ? LIMIT 1', [ownerId, title]);
      if (stored) {
        await connection.execute(
          'UPDATE posts SET description = ?, image_url = ?, is_active = ?, rejection_reason = ?, id_category = ? WHERE id_post = ?',
          [description, image, status, rejectionReason, categoryId, stored.id_post],
        );
      } else {
        await connection.execute(
          `INSERT INTO posts (title, description, image_url, created_at, is_active, rejection_reason, id_user, id_category)
           VALUES (?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), ?, ?, ?, ?)`,
          [title, description, image, index % 28, status, rejectionReason, ownerId, categoryId],
        );
      }
    }

    await connection.commit();
    const [summary] = await connection.execute(
      `SELECT u.email, p.is_active AS status, COUNT(*) AS total
       FROM posts p INNER JOIN users u ON u.id_user = p.id_user
       WHERE p.title LIKE '% · %'
       GROUP BY u.email, p.is_active ORDER BY u.email, p.is_active`,
    );
    console.log('40 publicaciones adicionales cargadas con imágenes estables y sin repetir.');
    console.table(summary);
  } catch (error) {
    await connection.rollback().catch(() => undefined);
    throw error;
  } finally { await connection.end(); }
}

run().catch((error) => { console.error('No se pudieron cargar las publicaciones:', error?.sqlMessage || error?.message || error); process.exitCode = 1; });
