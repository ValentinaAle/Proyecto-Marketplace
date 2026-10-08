import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import authMiddleware from '../middlewares/auth';
import requireAdmin from '../middlewares/requireAdmin';
import { procedureRows } from '../types/database';

const router = Router();

interface UpdateUserBody { name?: string }

// GET /api/users — usuarios con posts
router.get('/', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute('CALL sp_get_users_with_posts()');
    return res.status(200).json({ ok: true, data: procedureRows<RowDataPacket>(result) });
  } catch (error) {
    console.error('Error en sp_get_users_with_posts:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener usuarios.' });
  }
});

// GET /api/users/:id/posts — posts de un usuario
router.get<{ id: string }>('/:id/posts', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute('CALL sp_get_posts_by_user(?)', [req.params.id]);
    return res.status(200).json({ ok: true, data: procedureRows<RowDataPacket>(result) });
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
