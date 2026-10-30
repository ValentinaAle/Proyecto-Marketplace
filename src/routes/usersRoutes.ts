import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import authMiddleware from '../middlewares/auth';
import requireAdmin from '../middlewares/requireAdmin';
import { selectRows } from '../types/database';

const router = Router();

interface UpdateUserBody { name?: string }

// GET /api/users — usuarios con posts
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `SELECT u.id_user, u.email, u.is_active, COALESCE(p.name, u.email) AS user_name,
              p.avatar_url, COUNT(po.id_post) AS post_count
       FROM users u
       LEFT JOIN profiles p ON p.id_user = u.id_user
       LEFT JOIN posts po ON po.id_user = u.id_user
       WHERE u.is_active = 1
         AND NOT EXISTS (
           SELECT 1 FROM users_roles ur
           INNER JOIN roles r ON r.id_role = ur.id_role
           WHERE ur.id_user = u.id_user AND r.name = 'ADMIN'
         )
       GROUP BY u.id_user, u.email, u.is_active, p.name, p.avatar_url
       ORDER BY post_count DESC, user_name ASC`,
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

// DELETE /api/users/:id — deshabilitar usuario
router.delete<{ id: string }>('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await pool.execute('CALL sp_disable_user(?)', [req.params.id]);
    return res.status(200).json({ ok: true, message: 'Usuario deshabilitado.' });
  } catch (error) {
    console.error('Error en sp_disable_user:', error);
    return res.status(500).json({ ok: false, message: 'Error al deshabilitar usuario.' });
  }
});

// PUT /api/users/:id — editar nombre de usuario
router.put<{ id: string }, unknown, UpdateUserBody>('/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ ok: false, message: 'El nombre es requerido.' });

  try {
    await pool.execute(
      'UPDATE profiles SET name = ?, updated_at = NOW() WHERE id_user = ?',
      [name, req.params.id]
    );
    return res.status(200).json({ ok: true, message: 'Usuario actualizado.' });
  } catch (error) {
    console.error('Error al editar usuario:', error);
    return res.status(500).json({ ok: false, message: 'Error al editar usuario.' });
  }
});

export default router;
