import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import authMiddleware from '../middlewares/auth';
import requireAdmin from '../middlewares/requireAdmin';
import { selectRows } from '../types/database';

const router = Router();

interface AccountStatusBody { active?: boolean; reason?: string }
interface AccountRoleBody { role?: 'ADMIN' | 'USER' }

// GET /api/users/:id/profile — ficha visible desde publicaciones y administración
router.get<{ id: string }>('/:id/profile', authMiddleware, async (req, res) => {
  try {
    const [adminResult] = await pool.execute(
      `SELECT 1 FROM users_roles ur
       INNER JOIN roles r ON r.id_role = ur.id_role
       WHERE ur.id_user = ? AND r.name = 'ADMIN' LIMIT 1`,
      [req.user.id_user],
    );
    const isAdmin = selectRows<RowDataPacket>(adminResult).length > 0;
    const [profileResult] = await pool.execute(
      `SELECT u.id_user, COALESCE(p.name, u.email) AS user_name, p.avatar_url
       FROM users u LEFT JOIN profiles p ON p.id_user = u.id_user
       WHERE u.id_user = ? AND u.deleted_at IS NULL LIMIT 1`,
      [req.params.id],
    );
    const profile = selectRows<RowDataPacket>(profileResult)[0];
    if (!profile) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });

    const [postResult] = await pool.execute(
      `SELECT po.id_post, po.id_user, po.title, po.description, po.image_url, po.created_at, po.is_active,
              COALESCE(c.name, po.proposed_category, 'Sin categoría') AS category,
              COALESCE(p.name, u.email) AS author, p.avatar_url AS author_avatar
       FROM posts po
       INNER JOIN users u ON u.id_user = po.id_user
       LEFT JOIN profiles p ON p.id_user = po.id_user
       LEFT JOIN categories c ON c.id_category = po.id_category
       WHERE po.id_user = ? ${isAdmin ? '' : 'AND po.is_active = 1'}
       ORDER BY po.created_at DESC`,
      [req.params.id],
    );
    const posts = selectRows<RowDataPacket>(postResult);
    if (!isAdmin && posts.length === 0) return res.status(404).json({ ok: false, message: 'Este perfil no tiene publicaciones disponibles.' });
    return res.status(200).json({ ok: true, data: { ...profile, posts } });
  } catch (error) {
    console.error('Error al obtener la ficha del usuario:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener el usuario.' });
  }
});

// GET /api/users — usuarios con posts
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `SELECT u.id_user, u.email, u.is_active, u.created_at, u.disabled_reason,
              COALESCE(p.name, u.email) AS user_name, p.avatar_url,
              COUNT(DISTINCT po.id_post) AS post_count,
              CASE WHEN MAX(CASE WHEN r.name = 'ADMIN' THEN 1 ELSE 0 END) = 1
                   THEN 'ADMIN' ELSE 'USER' END AS role
       FROM users u
       LEFT JOIN profiles p ON p.id_user = u.id_user
       LEFT JOIN posts po ON po.id_user = u.id_user
       LEFT JOIN users_roles ur ON ur.id_user = u.id_user
       LEFT JOIN roles r ON r.id_role = ur.id_role
       WHERE u.deleted_at IS NULL
       GROUP BY u.id_user, u.email, u.is_active, u.created_at, p.name, p.avatar_url
       ORDER BY u.is_active DESC, u.created_at DESC, user_name ASC`,
    );
    return res.status(200).json({ ok: true, data: selectRows<RowDataPacket>(result) });
  } catch (error) {
    console.error('Error en sp_get_users_with_posts:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener usuarios.' });
  }
});

// GET /api/users/:id/posts — posts de un usuario
router.get<{ id: string }>('/:id/posts', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `SELECT p.id_post, p.title, p.description, p.image_url, p.created_at, p.is_active,
              p.id_category, COALESCE(c.name, p.proposed_category, 'Sin categoría') AS category
       FROM posts p
       LEFT JOIN categories c ON c.id_category = p.id_category
       WHERE p.id_user = ? ORDER BY p.created_at DESC`,
      [req.params.id],
    );
    return res.status(200).json({ ok: true, data: selectRows<RowDataPacket>(result) });
  } catch (error) {
    console.error('Error en sp_get_posts_by_user:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener posts del usuario.' });
  }
});

// PUT /api/users/:id/status — deshabilitar o reactivar una cuenta
router.put<{ id: string }, unknown, AccountStatusBody>('/:id/status', authMiddleware, requireAdmin, async (req, res) => {
  const { active, reason } = req.body;
  if (typeof active !== 'boolean') return res.status(400).json({ ok: false, message: 'El estado es requerido.' });
  if (!active && (!reason || reason.trim().length < 5)) return res.status(400).json({ ok: false, message: 'Ingresá un motivo de al menos 5 caracteres.' });
  try {
    await pool.execute(
      'UPDATE users SET is_active = ?, disabled_reason = ? WHERE id_user = ? AND deleted_at IS NULL',
      [active ? 1 : 0, active ? null : (reason?.trim() || null), req.params.id],
    );
    if (!active) await pool.execute('UPDATE posts SET is_active = 0 WHERE id_user = ?', [req.params.id]);
    return res.status(200).json({ ok: true, message: active ? 'Usuario reactivado.' : 'Usuario deshabilitado.' });
  } catch (error) {
    console.error('Error al cambiar el estado del usuario:', error);
    return res.status(500).json({ ok: false, message: 'Error al cambiar el estado del usuario.' });
  }
});

// PUT /api/users/:id/role — asignar o retirar administración
router.put<{ id: string }, unknown, AccountRoleBody>('/:id/role', authMiddleware, requireAdmin, async (req, res) => {
  const targetId = Number(req.params.id);
  const nextRole = req.body.role;
  if (!Number.isInteger(targetId) || (nextRole !== 'ADMIN' && nextRole !== 'USER')) return res.status(400).json({ ok: false, message: 'Rol inválido.' });
  if (targetId === req.user.id_user) return res.status(409).json({ ok: false, message: 'No podés modificar tu propio rol.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [targetResult] = await connection.execute(
      `SELECT u.id_user,
              CASE WHEN EXISTS(
                SELECT 1 FROM users_roles ur INNER JOIN roles r ON r.id_role = ur.id_role
                WHERE ur.id_user = u.id_user AND r.name = 'ADMIN'
              ) THEN 'ADMIN' ELSE 'USER' END AS current_role
       FROM users u WHERE u.id_user = ? AND u.deleted_at IS NULL FOR UPDATE`,
      [targetId],
    );
    const target = selectRows<RowDataPacket>(targetResult)[0];
    if (!target) {
      await connection.rollback();
      return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    }
    const currentRole = String(target.current_role) as 'ADMIN' | 'USER';
    if (currentRole === nextRole) {
      await connection.rollback();
      return res.status(200).json({ ok: true, message: 'El usuario ya tiene ese rol.' });
    }
    if (currentRole === 'ADMIN' && nextRole === 'USER') {
      const [adminResult] = await connection.execute(
        `SELECT COUNT(DISTINCT ur.id_user) AS total
         FROM users_roles ur INNER JOIN roles r ON r.id_role = ur.id_role
         INNER JOIN users u ON u.id_user = ur.id_user
         WHERE r.name = 'ADMIN' AND u.deleted_at IS NULL`,
      );
      if (Number(selectRows<RowDataPacket>(adminResult)[0]?.total || 0) <= 1) {
        await connection.rollback();
        return res.status(409).json({ ok: false, message: 'No se puede quitar el rol al último administrador.' });
      }
    }

    await connection.execute(
      `DELETE ur FROM users_roles ur INNER JOIN roles r ON r.id_role = ur.id_role
       WHERE ur.id_user = ? AND r.name IN ('ADMIN', 'USER')`,
      [targetId],
    );
    await connection.execute(
      `INSERT INTO users_roles (id_user, id_role)
       SELECT ?, id_role FROM roles WHERE name = ?`,
      [targetId, nextRole],
    );
    await connection.execute(
      `INSERT INTO admin_role_changes (actor_id, target_id, previous_role, new_role)
       VALUES (?, ?, ?, ?)`,
      [req.user.id_user, targetId, currentRole, nextRole],
    );
    await connection.commit();
    return res.status(200).json({ ok: true, message: nextRole === 'ADMIN' ? 'Administrador asignado.' : 'Rol de administrador retirado.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al cambiar el rol del usuario:', error);
    return res.status(500).json({ ok: false, message: 'No se pudo cambiar el rol.' });
  } finally { connection.release(); }
});

// DELETE /api/users/:id — eliminación lógica definitiva, solo si ya está inactivo
router.delete<{ id: string }>('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute('SELECT is_active FROM users WHERE id_user = ? AND deleted_at IS NULL', [req.params.id]);
    const user = selectRows<RowDataPacket>(result)[0];
    if (!user) return res.status(404).json({ ok: false, message: 'Usuario no encontrado.' });
    if (Number(user.is_active) === 1) return res.status(409).json({ ok: false, message: 'Primero debés deshabilitar la cuenta.' });
    await pool.execute(
      `UPDATE users
       SET deleted_at = NOW(), disabled_reason = NULL,
           email = CONCAT('eliminado-', id_user, '-', UNIX_TIMESTAMP(), '@fivox.invalid'),
           password_hash = CONCAT('deleted-', UUID())
       WHERE id_user = ?`,
      [req.params.id],
    );
    await pool.execute("UPDATE profiles SET name = 'Usuario eliminado', avatar_url = NULL WHERE id_user = ?", [req.params.id]);
    return res.status(200).json({ ok: true, message: 'Usuario eliminado.' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({ ok: false, message: 'Error al eliminar usuario.' });
  }
});

export default router;
