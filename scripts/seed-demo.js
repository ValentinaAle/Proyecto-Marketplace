require('dotenv').config();

const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');

const DEMO_PASSWORD = 'Demo123!';

const demoUsers = [
  { email: 'ana.demo@fivox.com', name: 'Ana Torres', phone: '1123456781', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80' },
  { email: 'marcos.demo@fivox.com', name: 'Marcos Ruiz', phone: '1123456782', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80' },
  { email: 'sofia.demo@fivox.com', name: 'Sofía Benítez', phone: '1123456783', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80' },
  { email: 'diego.demo@fivox.com', name: 'Diego Fernández', phone: '1123456784', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80' },
];

const demoPosts = [
  { owner: 0, category: 'Técnicos', title: 'Electricista matriculado', description: 'Instalaciones, tableros y reparaciones eléctricas con atención a domicilio.', image: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=82' },
  { owner: 1, category: 'Técnicos', title: 'Plomería y reparaciones', description: 'Solución de pérdidas, griferías, sanitarios y mantenimiento general.', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=82' },
  { owner: 2, category: 'Docentes', title: 'Clases de inglés online', description: 'Clases personalizadas para conversación, exámenes y apoyo escolar.', image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=82' },
  { owner: 3, category: 'Docentes', title: 'Apoyo de matemática', description: 'Secundario, ingreso universitario y preparación intensiva de exámenes.', image: 'https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=1200&q=82' },
  { owner: 1, category: 'Freelancers', title: 'Desarrollo de sitios web', description: 'Sitios rápidos y responsivos para profesionales, comercios y emprendimientos.', image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=82' },
  { owner: 2, category: 'Freelancers', title: 'Gestión de redes sociales', description: 'Planificación de contenido, diseño de piezas y seguimiento mensual.', image: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=1200&q=82' },
  { owner: 0, category: 'Salud', title: 'Nutrición personalizada', description: 'Consultas y planes de alimentación adaptados a tus objetivos y rutina.', image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=82' },
  { owner: 3, category: 'Salud', title: 'Entrenamiento funcional', description: 'Rutinas individuales para mejorar fuerza, movilidad y bienestar general.', image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1200&q=82' },
  { owner: 2, category: 'Diseño', title: 'Identidad visual para marcas', description: 'Logo, paleta, tipografías y guía de uso para una marca consistente.', image: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?auto=format&fit=crop&w=1200&q=82' },
  { owner: 0, category: 'Diseño', title: 'Diseño de piezas digitales', description: 'Contenido visual para redes, campañas, presentaciones y lanzamientos.', image: 'https://images.unsplash.com/photo-1545235617-9465d2a55698?auto=format&fit=crop&w=1200&q=82' },
  { owner: 3, category: 'Fotografía', title: 'Fotografía de eventos', description: 'Cobertura profesional de celebraciones, eventos corporativos y encuentros.', image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=82' },
  { owner: 1, category: 'Fotografía', title: 'Fotos de producto', description: 'Producción de imágenes para catálogos, tiendas online y redes sociales.', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=82' },
];

const demoTickets = [
  { owner: 0, subject: 'No puedo editar una publicación', status: 'OPEN', messages: [
    ['user', 'Quiero actualizar el precio y la descripción, pero el formulario no guarda los cambios.'],
  ] },
  { owner: 1, subject: 'Consulta sobre verificación del perfil', status: 'OPEN', messages: [
    ['user', '¿Qué información necesito para verificar mi perfil profesional?'],
  ] },
  { owner: 2, subject: 'La imagen se muestra recortada', status: 'OPEN', messages: [
    ['user', 'Subí una foto horizontal y en la tarjeta se corta la parte importante.'],
    ['admin', 'Hola Sofía. Estamos revisando el formato de la imagen. ¿Podés indicarnos sus dimensiones?'],
    ['user', 'Sí, mide 1600 por 900 píxeles.'],
  ] },
  { owner: 3, subject: 'Cambiar categoría del servicio', status: 'OPEN', messages: [
    ['user', 'Publiqué mi servicio en Diseño y debería estar en Fotografía.'],
    ['admin', 'Gracias, Diego. Podemos actualizar la categoría desde administración.'],
  ] },
  { owner: 0, subject: 'No recibo notificaciones', status: 'OPEN', messages: [
    ['user', 'No me llegó el aviso de una nueva consulta sobre mi servicio.'],
    ['admin', 'Verificamos tu cuenta. Te pedimos revisar también la carpeta de correo no deseado.'],
  ] },
  { owner: 1, subject: 'Publicación aprobada', status: 'CLOSED', messages: [
    ['user', '¿Cuánto demora la revisión de una publicación nueva?'],
    ['admin', 'La revisión suele completarse dentro de las 24 horas. Tu publicación ya fue aprobada.'],
    ['user', 'Perfecto, muchas gracias.'],
  ] },
  { owner: 2, subject: 'Actualizar número de contacto', status: 'CLOSED', messages: [
    ['user', 'Necesito cambiar el teléfono que aparece en mis publicaciones.'],
    ['admin', 'Podés modificarlo desde Mi perfil. El cambio ya figura correctamente.'],
  ] },
  { owner: 3, subject: 'Duda sobre términos y condiciones', status: 'CLOSED', messages: [
    ['user', 'Quería confirmar si puedo ofrecer servicios para eventos corporativos.'],
    ['admin', 'Sí, ese tipo de servicio está permitido dentro de la categoría Fotografía.'],
  ] },
];

async function upsertUser(connection, user, passwordHash) {
  await connection.execute(
    `INSERT INTO users (email, password_hash, created_at, is_active, phone, phone_verified)
     VALUES (?, ?, NOW(), 1, ?, 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), is_active = 1,
       phone = VALUES(phone), phone_verified = 1`,
    [user.email, passwordHash, user.phone]
  );

  const [[storedUser]] = await connection.execute('SELECT id_user FROM users WHERE email = ?', [user.email]);
  await connection.execute(
    `INSERT INTO profiles (name, avatar_url, created_at, updated_at, id_user)
     VALUES (?, ?, NOW(), NOW(), ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), avatar_url = VALUES(avatar_url), updated_at = NOW()`,
    [user.name, user.avatar, storedUser.id_user]
  );
  await connection.execute(
    `INSERT IGNORE INTO users_roles (id_user, id_role)
     SELECT ?, id_role FROM roles WHERE name = 'USER'`,
    [storedUser.id_user]
  );
  return storedUser.id_user;
}

async function upsertPost(connection, post, userIds, categoryIds) {
  const ownerId = userIds[post.owner];
  const categoryId = categoryIds.get(post.category);
  const [[existing]] = await connection.execute(
    'SELECT id_post FROM posts WHERE id_user = ? AND title = ? LIMIT 1',
    [ownerId, post.title]
  );

  if (existing) {
    await connection.execute(
      `UPDATE posts SET description = ?, image_url = ?, is_active = 1, id_category = ?
       WHERE id_post = ?`,
      [post.description, post.image, categoryId, existing.id_post]
    );
    return;
  }

  await connection.execute(
    `INSERT INTO posts (title, description, image_url, created_at, is_active, id_user, id_category)
     VALUES (?, ?, ?, NOW(), 1, ?, ?)`,
    [post.title, post.description, post.image, ownerId, categoryId]
  );
}

async function upsertTicket(connection, ticket, userIds, adminId) {
  const ownerId = userIds[ticket.owner];
  const [[existing]] = await connection.execute(
    'SELECT id_ticket FROM support_tickets WHERE id_user = ? AND subject = ? LIMIT 1',
    [ownerId, ticket.subject]
  );

  let ticketId = existing?.id_ticket;
  if (ticketId) {
    await connection.execute(
      `UPDATE support_tickets SET status = ?, closed_at = ? WHERE id_ticket = ?`,
      [ticket.status, ticket.status === 'CLOSED' ? new Date() : null, ticketId]
    );
  } else {
    const [result] = await connection.execute(
      `INSERT INTO support_tickets (status, created_at, closed_at, id_user, subject)
       VALUES (?, NOW(), ?, ?, ?)`,
      [ticket.status, ticket.status === 'CLOSED' ? new Date() : null, ownerId, ticket.subject]
    );
    ticketId = result.insertId;
  }

  for (const [sender, message] of ticket.messages) {
    const senderId = sender === 'admin' ? adminId : ownerId;
    const [[storedMessage]] = await connection.execute(
      `SELECT id_message FROM support_messages
       WHERE id_ticket = ? AND id_user = ? AND message = ? LIMIT 1`,
      [ticketId, senderId, message]
    );
    if (!storedMessage) {
      await connection.execute(
        `INSERT INTO support_messages (message, created_at, id_ticket, id_user)
         VALUES (?, NOW(), ?, ?)`,
        [message, ticketId, senderId]
      );
    }
  }
}

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    await connection.beginTransaction();
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
    const userIds = [];

    for (const user of demoUsers) {
      userIds.push(await upsertUser(connection, user, passwordHash));
    }

    const [categories] = await connection.execute('SELECT id_category, name FROM categories');
    const categoryIds = new Map(categories.map(category => [category.name, category.id_category]));
    const missingCategory = demoPosts.find(post => !categoryIds.has(post.category));
    if (missingCategory) throw new Error(`Falta la categoría: ${missingCategory.category}`);

    for (const post of demoPosts) {
      await upsertPost(connection, post, userIds, categoryIds);
    }

    const [[admin]] = await connection.execute(
      `SELECT u.id_user FROM users u
       INNER JOIN users_roles ur ON ur.id_user = u.id_user
       INNER JOIN roles r ON r.id_role = ur.id_role
       WHERE r.name = 'ADMIN' ORDER BY u.id_user LIMIT 1`
    );
    if (!admin) throw new Error('No se encontró un usuario administrador.');

    for (const ticket of demoTickets) {
      await upsertTicket(connection, ticket, userIds, admin.id_user);
    }

    const [postSummary] = await connection.execute(
      `SELECT c.name AS category, COUNT(*) AS total
       FROM posts p
       INNER JOIN categories c ON c.id_category = p.id_category
       WHERE p.id_user IN (${userIds.map(() => '?').join(', ')})
       GROUP BY c.id_category, c.name ORDER BY c.name`,
      userIds
    );
    const [ticketSummary] = await connection.execute(
      `SELECT status, COUNT(*) AS total
       FROM support_tickets
       WHERE id_user IN (${userIds.map(() => '?').join(', ')})
       GROUP BY status ORDER BY status`,
      userIds
    );

    await connection.commit();
    console.log('Demo lista: 4 usuarios, 12 publicaciones y 8 tickets.');
    console.table(postSummary);
    console.table(ticketSummary);
    console.log(`Acceso de usuarios demo: ana.demo@fivox.com / ${DEMO_PASSWORD}`);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    await connection.end();
  }
}

seed().catch(error => {
  console.error('No se pudo crear la demo:', error.message);
  process.exitCode = 1;
});
