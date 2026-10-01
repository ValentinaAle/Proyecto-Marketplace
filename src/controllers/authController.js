const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const pool     = require('../config/db');
const cloudinary = require('../config/cloudinary');

/* ─────────────────────────────────────────
   POST /api/auth/register
   Body: { email, password, name, phone }
───────────────────────────────────────── */
const register = async (req, res) => {
  const { email, password, name, phone } = req.body;
  let connection;

  // Validaciones básicas
  if (!email || !password || !name) {
    return res.status(400).json({
      ok: false,
      message: 'Email, contraseña y nombre son requeridos.',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      ok: false,
      message: 'La contraseña debe tener al menos 6 caracteres.',
    });
  }

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // 1. Verificar que el email no exista
    const [rows] = await connection.execute(
      'CALL sp_check_email_exists(?)',
      [email]
    );

    // mysql2 devuelve el result set dentro de rows[0]
    const existing = rows[0];
    if (existing.length > 0) {
      return res.status(409).json({
        ok: false,
        message: 'Ya existe una cuenta con ese email.',
      });
    }

    // 2. Hashear la contraseña
    const passwordHash = await bcrypt.hash(password, 10);

    // 3. Crear el usuario
    await connection.execute(
      'CALL sp_create_user(?, ?, ?)',
      [email, passwordHash, phone || null]
    );

    // 4. Obtener el id del usuario recién creado
    const [newUserRows] = await connection.execute(
      'CALL sp_check_email_exists(?)',
      [email]
    );
    const newUser = newUserRows[0][0];

    // 5. Crear el perfil vinculado al usuario
    await connection.execute(
      'CALL sp_create_profile(?, ?, ?)',
      [name, null, newUser.id_user]
    );

    // 6. Asignar el rol USER de forma explícita.
    await connection.execute(
      `INSERT INTO users_roles (id_user, id_role)
       SELECT ?, id_role FROM roles WHERE name = 'USER'`,
      [newUser.id_user]
    );

    await connection.commit();

    // 7. Generar JWT
    const token = generateToken(newUser.id_user, newUser.email);

    return res.status(201).json({
      ok: true,
      message: 'Cuenta creada correctamente.',
      data: {
        token,
        user: {
          id_user: newUser.id_user,
          email:   newUser.email,
          name,
        },
      },
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error('Error en register:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor.',
    });
  } finally {
    if (connection) connection.release();
  }
};

/* ─────────────────────────────────────────
   POST /api/auth/login
   Body: { email, password }
───────────────────────────────────────── */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      message: 'Email y contraseña son requeridos.',
    });
  }

  try {
    // 1. Buscar usuario por email
    const [rows] = await pool.execute(
      'CALL sp_check_email_exists(?)',
      [email]
    );

    const user = rows[0][0];

    if (!user) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales incorrectas.',
      });
    }

    // 2. Verificar que la cuenta esté activa
    if (!user.is_active) {
      return res.status(403).json({
        ok: false,
        message: 'La cuenta está deshabilitada.',
      });
    }

    // 3. Comparar contraseña
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({
        ok: false,
        message: 'Credenciales incorrectas.',
      });
    }

    // 4. Obtener perfil y rol
    const [profileRows] = await pool.execute(
      'CALL sp_get_profile(?)',
      [user.id_user]
    );
    const profile = profileRows[0][0] || null;

    const [roleRows] = await pool.execute(
      'SELECT r.name FROM roles r INNER JOIN users_roles ur ON r.id_role = ur.id_role WHERE ur.id_user = ?',
      [user.id_user]
    );
    const role = roleRows[0]?.name || 'USER';

    // 5. Generar JWT
    const token = generateToken(user.id_user, user.email);

    return res.status(200).json({
      ok: true,
      message: 'Login exitoso.',
      data: {
        token,
        user: {
          id_user:    user.id_user,
          email:      user.email,
          name:       profile?.name       || null,
          avatar_url: profile?.avatar_url || null,
          role,
        },
      },
    });

  } catch (error) {
    console.error('Error en login:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor.',
    });
  }
};

/* ─────────────────────────────────────────
   GET /api/auth/me   (requiere token)
───────────────────────────────────────── */
const me = async (req, res) => {
  try {
    const [profileRows] = await pool.execute(
      'CALL sp_get_profile(?)',
      [req.user.id_user]
    );
    const profile = profileRows[0][0] || null;

    const [userRows] = await pool.execute(
      'CALL sp_check_email_exists(?)',
      [req.user.email]
    );
    const user = userRows[0][0] || null;

    return res.status(200).json({
      ok: true,
      data: {
        id_user:    req.user.id_user,
        email:      req.user.email,
        phone:      user?.phone         || null,
        name:       profile?.name       || null,
        avatar_url: profile?.avatar_url || null,
      },
    });
  } catch (error) {
    console.error('Error en me:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor.',
    });
  }
};

/* ─────────────────────────────────────────
   PUT /api/auth/profile   (requiere token)
   Body: { name, avatar_url, phone }
───────────────────────────────────────── */
const updateProfile = async (req, res) => {
  const { name, avatar_url, phone } = req.body;
  const nextEmail = req.body.email || req.user.email;

  if (!name) {
    return res.status(400).json({
      ok: false,
      message: 'El nombre es obligatorio.',
    });
  }

  try {
    await pool.execute(
      'CALL sp_update_profile(?, ?, ?)',
      [req.user.id_user, name, avatar_url || null]
    );

    await pool.execute(
    'UPDATE users SET email = ?, phone = ? WHERE id_user = ?',
    [nextEmail, phone || null, req.user.id_user]
 );

    return res.status(200).json({
      ok: true,
      message: 'Perfil actualizado correctamente.',
      data: {
        token: generateToken(req.user.id_user, nextEmail),
        user: { id_user: req.user.id_user, email: nextEmail, name },
      },
    });
  } catch (error) {
    console.error('Error en updateProfile:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor.',
    });
  }
};

/* ─────────────────────────────────────────
   PUT /api/auth/password   (requiere token)
   Body: { oldPassword, newPassword }
───────────────────────────────────────── */
const changePassword = async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({
      ok: false,
      message: 'Contraseña actual y nueva son requeridas.',
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      ok: false,
      message: 'La nueva contraseña debe tener al menos 6 caracteres.',
    });
  }

  try {
    const [rows] = await pool.execute(
      'CALL sp_check_email_exists(?)',
      [req.user.email]
    );
    const user = rows[0][0];

    const passwordMatch = await bcrypt.compare(oldPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({
        ok: false,
        message: 'La contraseña actual es incorrecta.',
      });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await pool.execute(
      'CALL sp_update_password(?, ?)',
      [req.user.id_user, newPasswordHash]
    );

    return res.status(200).json({
      ok: true,
      message: 'Contraseña actualizada correctamente.',
    });
  } catch (error) {
    console.error('Error en changePassword:', error);
    return res.status(500).json({
      ok: false,
      message: 'Error interno del servidor.',
    });
  }
};

/* ─────────────────────────────────────────
   Helper: generar JWT
───────────────────────────────────────── */
const generateToken = (id_user, email) => {
  return jwt.sign(
    { id_user, email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const uploadAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, message: 'No se recibió ninguna imagen.' });
  }

  try {
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'fivox/avatars',
          public_id: `user_${req.user.id_user}`,
          overwrite: true,
          resource_type: 'image',
          transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }],
        },
        (error, uploaded) => error ? reject(error) : resolve(uploaded)
      );
      stream.end(req.file.buffer);
    });

    return res.status(200).json({ ok: true, data: { url: result.secure_url } });
  } catch (error) {
    console.error('Error al subir avatar:', error);
    return res.status(500).json({ ok: false, message: 'No se pudo subir la imagen. Intentá de nuevo.' });
  }
};

module.exports = { register, login, me, updateProfile, changePassword, uploadAvatar };
