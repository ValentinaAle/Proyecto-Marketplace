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
  { owner: 1, category: 'Técnicos', status: 2, title: 'Instalación de griferías modernas', description: 'Renovación de griferías de cocina y baño con revisión de conexiones y pérdidas.', image: 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=82' },
  { owner: 1, category: 'Freelancers', status: 3, title: 'Página web económica y rápida', description: 'Creación de una página sencilla para mostrar productos y medios de contacto.', rejectionReason: 'Evitá afirmaciones comerciales como “económica” y detallá mejor el alcance.', image: 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=1200&q=82' },
  { owner: 1, category: 'Fotografía', status: 4, title: 'Sesión de fotografía comercial', description: 'Producción fotográfica para comercios y profesionales con entrega digital.', rejectionReason: 'Indicá cuántas fotografías incluye la entrega y el plazo estimado.', image: 'https://images.unsplash.com/photo-1554080353-a576cf803bda?auto=format&fit=crop&w=1200&q=82' },
  { owner: 2, category: 'Docentes', status: 2, title: 'Taller de conversación en inglés', description: 'Encuentros grupales para practicar conversación, pronunciación y vocabulario cotidiano.', image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=82' },
  { owner: 2, category: 'Diseño', status: 3, title: 'Diseños increíbles para tu marca', description: 'Diseño de recursos visuales para mejorar la comunicación de emprendimientos.', rejectionReason: 'Reemplazá “increíbles” por una descripción concreta de los entregables.', image: 'https://images.unsplash.com/photo-1542744094-3a31f272c490?auto=format&fit=crop&w=1200&q=82' },
  { owner: 2, category: 'Freelancers', status: 4, title: 'Planificación mensual de contenidos', description: 'Organización de ideas y publicaciones para mantener activas las redes del negocio.', rejectionReason: 'Agregá la cantidad de publicaciones y plataformas incluidas.', image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=82' },
  { owner: 3, category: 'Salud', status: 2, title: 'Plan de entrenamiento para principiantes', description: 'Rutinas progresivas orientadas a mejorar movilidad, fuerza y constancia semanal.', image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=82' },
  { owner: 3, category: 'Fotografía', status: 3, title: 'Las mejores fotos para eventos', description: 'Cobertura fotográfica para reuniones, celebraciones y encuentros sociales.', rejectionReason: 'Evitá expresiones promocionales como “las mejores” y detallá horas de cobertura.', image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=82' },
  { owner: 3, category: 'Docentes', status: 4, title: 'Preparación para exámenes de matemática', description: 'Clases de repaso y práctica para estudiantes que deben rendir evaluaciones.', rejectionReason: 'Especificá el nivel educativo y si las clases son presenciales u online.', image: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=1200&q=82' },
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

const supportScenarios = demoUsers.flatMap((_, owner) => [
  { owner, subject: `Demo pendiente ${owner + 1}: revisión de publicación`, status: 'OPEN', messages: [
    ['user', 'Envié una publicación y quisiera saber cuándo será revisada.'],
  ] },
  { owner, subject: `Demo abierta ${owner + 1}: ayuda con el perfil`, status: 'OPEN', messages: [
    ['user', 'Necesito ayuda para completar correctamente los datos de mi perfil.'],
    ['admin', 'Claro. Revisá que nombre, teléfono e imagen estén completos. ¿En qué campo necesitás ayuda?'],
    ['user', 'Gracias, necesitaba confirmar el formato del teléfono.'],
  ] },
  { owner, subject: `Demo resuelta ${owner + 1}: consulta de contacto`, status: 'CLOSED', messages: [
    ['user', 'No encontraba los datos para contactar a un profesional.'],
    ['admin', 'Los datos aparecen al abrir el servicio y seleccionar una opción de contacto.'],
    ['user', 'Perfecto, ya pude comunicarme.'],
  ] },
]);

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
      `UPDATE posts SET description = ?, image_url = ?, is_active = ?, rejection_reason = ?, id_category = ?
       WHERE id_post = ?`,
      [post.description, post.image, post.status ?? 1, post.rejectionReason || null, categoryId, existing.id_post]
    );
    return existing.id_post;
  }

  const [result] = await connection.execute(
    `INSERT INTO posts (title, description, image_url, created_at, is_active, rejection_reason, id_user, id_category)
     VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`,
    [post.title, post.description, post.image, post.status ?? 1, post.rejectionReason || null, ownerId, categoryId]
  );
  return result.insertId;
}

async function seedContactsAndReviews(connection, userIds, postIds) {
  for (let userIndex = 0; userIndex < userIds.length; userIndex += 1) {
    const contactUserId = userIds[userIndex];
    const candidates = postIds
      .map((id, postIndex) => ({ id, owner: demoPosts[postIndex].owner, status: demoPosts[postIndex].status ?? 1 }))
      .filter((post) => post.owner !== userIndex && post.status === 1)
      .slice(userIndex, userIndex + 3);

    for (let contactIndex = 0; contactIndex < candidates.length; contactIndex += 1) {
      const postId = candidates[contactIndex].id;
      await connection.execute(
        `INSERT INTO post_contacts (id_post, id_user, contacted_at, discarded)
         VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), 0)
         ON DUPLICATE KEY UPDATE contacted_at = VALUES(contacted_at), discarded = 0`,
        [postId, contactUserId, 8 + userIndex + contactIndex],
      );
      const [[contact]] = await connection.execute(
        'SELECT id_contact FROM post_contacts WHERE id_post = ? AND id_user = ? LIMIT 1',
        [postId, contactUserId],
      );
      if (contactIndex < 2) {
        const rating = 3 + ((userIndex + contactIndex) % 3);
        await connection.execute(
          `INSERT INTO reviews (id_contact, id_post, id_user, rating, created_at)
           VALUES (?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))
           ON DUPLICATE KEY UPDATE rating = VALUES(rating), created_at = VALUES(created_at)`,
          [contact.id_contact, postId, contactUserId, rating, 4 + userIndex + contactIndex],
        );
      }
    }
  }
}

async function ensureEngagementTables(connection) {
  await connection.execute(
    `CREATE TABLE IF NOT EXISTS post_contacts (
      id_contact INT NOT NULL AUTO_INCREMENT,
      id_post INT NOT NULL,
      id_user INT NOT NULL,
      contacted_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      discarded TINYINT DEFAULT 0,
      PRIMARY KEY (id_contact),
      UNIQUE KEY unique_contact (id_post, id_user),
      KEY contact_user_idx (id_user),
      CONSTRAINT post_contacts_post_fk FOREIGN KEY (id_post) REFERENCES posts (id_post),
      CONSTRAINT post_contacts_user_fk FOREIGN KEY (id_user) REFERENCES users (id_user)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3`,
  );
  await connection.execute(
    `CREATE TABLE IF NOT EXISTS reviews (
      id_review INT NOT NULL AUTO_INCREMENT,
      id_contact INT NOT NULL,
      id_post INT NOT NULL,
      id_user INT NOT NULL,
      rating TINYINT NOT NULL,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id_review),
      UNIQUE KEY unique_review_contact (id_contact),
      KEY review_post_idx (id_post),
      KEY review_user_idx (id_user),
      CONSTRAINT reviews_contact_fk FOREIGN KEY (id_contact) REFERENCES post_contacts (id_contact),
      CONSTRAINT reviews_post_fk FOREIGN KEY (id_post) REFERENCES posts (id_post),
      CONSTRAINT reviews_user_fk FOREIGN KEY (id_user) REFERENCES users (id_user)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3`,
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
    await ensureEngagementTables(connection);
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

    const postIds = [];
    for (const post of demoPosts) postIds.push(await upsertPost(connection, post, userIds, categoryIds));

    const [[admin]] = await connection.execute(
      `SELECT u.id_user FROM users u
       INNER JOIN users_roles ur ON ur.id_user = u.id_user
       INNER JOIN roles r ON r.id_role = ur.id_role
       WHERE r.name = 'ADMIN' ORDER BY u.id_user LIMIT 1`
    );
    if (!admin) throw new Error('No se encontró un usuario administrador.');

    for (const ticket of [...demoTickets, ...supportScenarios]) {
      await upsertTicket(connection, ticket, userIds, admin.id_user);
    }

    await seedContactsAndReviews(connection, userIds, postIds);

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
    console.log(`Demo lista: 4 usuarios, ${demoPosts.length} publicaciones, consultas variadas, contactos y reseñas.`);
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
  console.error('No se pudo crear la demo:', error?.message || error);
  if (error?.sqlMessage) console.error(error.sqlMessage);
  process.exitCode = 1;
});
