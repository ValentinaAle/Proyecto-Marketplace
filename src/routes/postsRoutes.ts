// src/routes/postRoutes.js
import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import authMiddleware from '../middlewares/auth';
import requireAdmin from '../middlewares/requireAdmin';
import { procedureRows } from '../types/database';

const router = Router();

interface CreatePostBody {
  title?: string;
  description?: string;
  image_url?: string;
  id_category?: number;
}

interface UpdateStatusBody { status?: number; reason?: string }
interface UpdatePostBody { title?: string; description?: string; image_url?: string }

// GET /api/posts/categories
router.get('/categories', authMiddleware, async (req, res) => {
    try {
      const [rows] = await pool.execute('SELECT * FROM categories ORDER BY name');
      return res.status(200).json({ ok: true, data: rows });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ ok: false, message: 'Error al obtener categorías.' });
    }
  });

// GET /api/posts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute('CALL sp_get_posts()');
    return res.status(200).json({ ok: true, data: procedureRows<RowDataPacket>(result) });
  } catch (error) {
    console.error('Error en sp_get_posts:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener publicaciones.' });
  }
});


// POST /api/posts
router.post<Record<string, never>, unknown, CreatePostBody>('/', authMiddleware, async (req, res) => {
  const { title, description, image_url, id_category } = req.body;

  if (!title || !description || !id_category) {
    return res.status(400).json({ ok: false, message: 'Faltan campos obligatorios.' });
  }

  try {
    await pool.execute(
      'CALL sp_create_post(?, ?, ?, ?, ?)',
      [title, description, image_url || null, req.user.id_user, id_category]
    );
    return res.status(201).json({ ok: true, message: 'Publicación creada.' });
  } catch (error) {
    console.error('Error en sp_create_post:', error);
    return res.status(500).json({ ok: false, message: 'Error al crear la publicación.' });
  }
});



// GET /api/posts/my — mis posts (usuario)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute('CALL sp_get_my_posts(?)', [req.user.id_user]);
    return res.status(200).json({ ok: true, data: procedureRows<RowDataPacket>(result) });
  } catch (error) {
    console.error('Error en sp_get_my_posts:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener tus posts.' });
  }
});

// GET /api/posts/pending — posts pendientes (admin)
router.get('/pending', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute('CALL sp_get_pending_posts()');
    return res.status(200).json({ ok: true, data: procedureRows<RowDataPacket>(result) });
  } catch (error) {
    console.error('Error en sp_get_pending_posts:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener posts pendientes.' });
  }
});

// PUT /api/posts/:id/status — cambiar estado (admin)
router.put<{ id: string }, unknown, UpdateStatusBody>('/:id/status', authMiddleware, requireAdmin, async (req, res) => {
  const { status, reason } = req.body;
  if (status === undefined) return res.status(400).json({ ok: false, message: 'Status requerido.' });

  try {
    await pool.execute('CALL sp_update_post_status(?, ?, ?)', [req.params.id, status, reason || null]);
    return res.status(200).json({ ok: true, message: 'Estado actualizado.' });
  } catch (error) {
    console.error('Error en sp_update_post_status:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar estado.' });
  }
});

// PUT /api/posts/:id — editar post (admin)
router.put<{ id: string }, unknown, UpdatePostBody>('/:id', authMiddleware, requireAdmin, async (req, res) => {
  const { title, description, image_url } = req.body;

  if (!title || !description) {
    return res.status(400).json({ ok: false, message: 'Título y descripción son obligatorios.' });
  }

  try {
    await pool.execute(
      'UPDATE posts SET title = ?, description = ?, image_url = ? WHERE id_post = ?',
      [title, description, image_url || null, req.params.id]
    );
    return res.status(200).json({ ok: true, message: 'Publicación actualizada.' });
  } catch (error) {
    console.error('Error al editar post:', error);
    return res.status(500).json({ ok: false, message: 'Error al editar la publicación.' });
  }
});

// DELETE /api/posts/:id — eliminar post (admin)
router.delete<{ id: string }>('/:id', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await pool.execute('DELETE FROM posts WHERE id_post = ?', [req.params.id]);
    return res.status(200).json({ ok: true, message: 'Publicación eliminada.' });
  } catch (error) {
    console.error('Error al eliminar post:', error);
    return res.status(500).json({ ok: false, message: 'Error al eliminar la publicación.' });
  }
});

export default router;
