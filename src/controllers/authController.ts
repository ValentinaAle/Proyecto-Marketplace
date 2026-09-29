import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { PoolConnection, RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import { procedureRows, selectRows } from '../types/database';

interface UserRow extends RowDataPacket {
  id_user: number;
  email: string;
  password_hash: string;
  is_active: number;
  phone: string | null;
}

interface ProfileRow extends RowDataPacket {
  name: string | null;
  avatar_url: string | null;
}

interface RoleRow extends RowDataPacket {
  name: string;
}

interface RegisterBody {
  email?: string;
  password?: string;
  name?: string;
  phone?: string;
}

interface LoginBody {
  email?: string;
  password?: string;
}

interface UpdateProfileBody {
  name?: string;
  avatar_url?: string;
  phone?: string;
  email?: string;
}

interface ChangePasswordBody {
  oldPassword?: string;
  newPassword?: string;
}

/* ─────────────────────────────────────────
   POST /api/auth/register
   Body: { email, password, name, phone }
───────────────────────────────────────── */
export const register = async (
  req: Request<Record<string, never>, unknown, RegisterBody>,
  res: Response,
) => {
  const { email, password, name, phone } = req.body;
  let connection: PoolConnection | undefined;

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
    const [result] = await connection.execute(
      'CALL sp_check_email_exists(?)',
      [email]
    );

    // mysql2 devuelve el result set dentro de rows[0]
    const existing = procedureRows<UserRow>(result);
    if (existing.length > 0) {
      await connection.rollback();
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
    const [newUserResult] = await connection.execute(
      'CALL sp_check_email_exists(?)',
      [email]
    );
    const newUser = procedureRows<UserRow>(newUserResult)[0];
    if (!newUser) throw new Error('No se pudo recuperar el usuario creado.');

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
export const login = async (
  req: Request<Record<string, never>, unknown, LoginBody>,
  res: Response,
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      ok: false,
      message: 'Email y contraseña son requeridos.',
    });
  }

  try {
    // 1. Buscar usuario por email
    const [userResult] = await pool.execute(
      'CALL sp_check_email_exists(?)',
      [email]
    );

    const user = procedureRows<UserRow>(userResult)[0];

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
    const [profileResult] = await pool.execute(
      'CALL sp_get_profile(?)',
      [user.id_user]
    );
    const profile = procedureRows<ProfileRow>(profileResult)[0] || null;

    const [roleResult] = await pool.execute(
      'SELECT r.name FROM roles r INNER JOIN users_roles ur ON r.id_role = ur.id_role WHERE ur.id_user = ?',
      [user.id_user]
    );
    const role = selectRows<RoleRow>(roleResult)[0]?.name || 'USER';

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
export const me = async (req: Request, res: Response) => {
  try {
    const [profileResult] = await pool.execute(
      'CALL sp_get_profile(?)',
      [req.user.id_user]
    );
    const profile = procedureRows<ProfileRow>(profileResult)[0] || null;

    const [userResult] = await pool.execute(
      'CALL sp_check_email_exists(?)',
      [req.user.email]
    );
    const user = procedureRows<UserRow>(userResult)[0] || null;

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
export const updateProfile = async (
  req: Request<Record<string, never>, unknown, UpdateProfileBody>,
  res: Response,
) => {
  const { name, avatar_url, phone } = req.body;

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
    [req.body.email || req.user.email, phone || null, req.user.id_user]
 );

    return res.status(200).json({
      ok: true,
      message: 'Perfil actualizado correctamente.',
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
export const changePassword = async (
  req: Request<Record<string, never>, unknown, ChangePasswordBody>,
  res: Response,
) => {
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
    const [userResult] = await pool.execute(
      'CALL sp_check_email_exists(?)',
      [req.user.email]
    );
    const user = procedureRows<UserRow>(userResult)[0];
    if (!user) {
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    }

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
const generateToken = (id_user: number, email: string): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está configurado.');
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];
  return jwt.sign(
    { id_user, email },
    secret,
    { expiresIn }
  );
};
