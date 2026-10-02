require('dotenv').config();

const mysql = require('mysql2/promise');

const DEMO_EMAIL = 'ana.demo@fivox.com';

const services = [
  {
    title: 'Instalación de luminarias',
    description: 'Colocación de lámparas, apliques y luces LED para interiores.',
    category: 'Técnicos',
    status: 2,
    image: 'https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?auto=format&fit=crop&w=1200&q=82',
  },
  {
    title: 'Mantenimiento eléctrico preventivo',
    description: 'Revisión de tableros, térmicas, tomas y consumo eléctrico del hogar.',
    category: 'Técnicos',
    status: 2,
    image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=82',
  },
  {
    title: 'Asesoría de alimentación saludable',
    description: 'Planificación semanal y acompañamiento para mejorar hábitos cotidianos.',
    category: 'Salud',
    status: 1,
    image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=82',
  },
  {
    title: 'Diseño de contenido para redes',
    description: 'Piezas visuales consistentes para campañas, lanzamientos y contenido mensual.',
    category: 'Diseño',
    status: 1,
    image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=82',
  },
  {
    title: 'Reparaciones eléctricas económicas',
    description: 'Soluciones rápidas para todo tipo de instalaciones domiciliarias.',
    category: 'Técnicos',
    status: 3,
    rejectionReason: 'El título incluye una afirmación comercial que debe ser más específica.',
    image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=1200&q=82',
  },
  {
    title: 'Clases personalizadas',
    description: 'Clases adaptadas a todos los niveles y necesidades.',
    category: 'Docentes',
    status: 3,
    rejectionReason: 'Falta indicar la materia y el nivel educativo ofrecido.',
    image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=82',
  },
  {
    title: 'Fotografía para catálogos',
    description: 'Producción y edición de fotografías para tiendas y catálogos digitales.',
    category: 'Fotografía',
    status: 0,
    image: 'https://images.unsplash.com/photo-1452780212940-6f5c0d14d848?auto=format&fit=crop&w=1200&q=82',
  },
  {
    title: 'Armado de presentaciones profesionales',
    description: 'Diseño de presentaciones claras para propuestas, reuniones y capacitaciones.',
    category: 'Freelancers',
    status: 0,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1200&q=82',
  },
];

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const [[rejectionColumn]] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'posts' AND COLUMN_NAME = 'rejection_reason'`,
      [process.env.DB_NAME]
    );
    if (!rejectionColumn) {
      await connection.execute('ALTER TABLE posts ADD COLUMN rejection_reason VARCHAR(255) NULL AFTER is_active');
    }

    const [[user]] = await connection.execute('SELECT id_user FROM users WHERE email = ? LIMIT 1', [DEMO_EMAIL]);
    if (!user) throw new Error(`No existe el usuario demo ${DEMO_EMAIL}. Ejecutá primero npm run seed:demo.`);

    const [categories] = await connection.execute('SELECT id_category, name FROM categories');
    const categoryIds = new Map(categories.map((category) => [category.name, category.id_category]));

    await connection.beginTransaction();
    for (const service of services) {
      const categoryId = categoryIds.get(service.category);
      if (!categoryId) throw new Error(`No existe la categoría ${service.category}.`);

      const [[stored]] = await connection.execute(
        'SELECT id_post FROM posts WHERE id_user = ? AND title = ? LIMIT 1',
        [user.id_user, service.title]
      );

      if (stored) {
        await connection.execute(
          `UPDATE posts SET description = ?, image_url = ?, is_active = ?, rejection_reason = ?, id_category = ?
           WHERE id_post = ?`,
          [service.description, service.image, service.status, service.rejectionReason || null, categoryId, stored.id_post]
        );
      } else {
        await connection.execute(
          `INSERT INTO posts (title, description, image_url, created_at, is_active, rejection_reason, id_user, id_category)
           VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`,
          [service.title, service.description, service.image, service.status, service.rejectionReason || null, user.id_user, categoryId]
        );
      }
    }

    await connection.commit();
    const [summary] = await connection.execute(
      `SELECT is_active AS status, COUNT(*) AS total FROM posts
       WHERE id_user = ? GROUP BY is_active ORDER BY is_active`,
      [user.id_user]
    );
    console.log(`Demo de Mis Servicios cargada para ${DEMO_EMAIL}.`);
    console.table(summary);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch((error) => {
  console.error('No se pudo cargar la demo de Mis Servicios:', error.message);
  process.exitCode = 1;
});
