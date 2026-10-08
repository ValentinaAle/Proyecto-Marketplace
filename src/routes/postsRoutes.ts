// src/routes/postRoutes.js
import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import cloudinary from '../config/cloudinary';
import pool from '../config/db';
import authMiddleware from '../middlewares/auth';
import requireAdmin from '../middlewares/requireAdmin';
import upload from '../middlewares/upload';
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
interface UpdateOwnPostBody extends UpdatePostBody { id_category?: number }

router.post('/image', authMiddleware, upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, message: 'No se recibió ninguna imagen.' });
  }

  try {
    const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'fivox/posts',
          resource_type: 'image',
          transformation: [{ width: 1200, height: 1200, crop: 'limit' }],
        },
        (error, uploaded) => {
          if (error || !uploaded) reject(error || new Error('Cloudinary no devolvió la imagen.'));
          else resolve(uploaded);
        },
      );
      stream.end(req.file?.buffer);
    });

    return res.status(200).json({ ok: true, data: { url: result.secure_url } });
  } catch (error) {
    console.error('Error al subir imagen de publicación:', error);
    return res.status(500).json({ ok: false, message: 'No se pudo subir la imagen. Intentá de nuevo.' });
  }
});

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

router.put<{ id: string }, unknown, UpdateOwnPostBody>('/my/:id', authMiddleware, async (req, res) => {
  const { title, description, image_url, id_category } = req.body;
  const categoryId = Number(id_category);
  if (!title?.trim() || !description?.trim() || !categoryId) {
    return res.status(400).json({ ok: false, message: 'Título, descripción y categoría son obligatorios.' });
  }
  if (title.trim().length > 45 || description.trim().length > 300) {
    return res.status(400).json({ ok: false, message: 'La publicación supera el límite permitido.' });
  }

  try {
    const [categoryResult] = await pool.execute(
      'SELECT id_category FROM categories WHERE id_category = ? LIMIT 1',
      [categoryId],
    );
    const categories = categoryResult as RowDataPacket[];
    if (!categories[0]) {
      return res.status(400).json({ ok: false, message: 'La categoría seleccionada no existe.' });
    }

    const [updateResult] = await pool.execute(
      `UPDATE posts SET title = ?, description = ?, image_url = ?, id_category = ?,
       is_active = 2, rejection_reason = NULL
       WHERE id_post = ? AND id_user = ?`,
      [title.trim(), description.trim(), image_url?.trim() || null, categoryId, req.params.id, req.user.id_user],
    );
    const result = updateResult as ResultSetHeader;
    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, message: 'Publicación no encontrada.' });
    }
    return res.status(200).json({ ok: true, message: 'Cambios guardados. La publicación volvió a revisión.' });
  } catch (error) {
    console.error('Error al editar publicación propia:', error);
    return res.status(500).json({ ok: false, message: 'Error al editar la publicación.' });
  }
});

router.put<{ id: string }, unknown, { status?: number }>('/my/:id/status', authMiddleware, async (req, res) => {
  const status = Number(req.body.status);
  if (![0, 1].includes(status)) {
    return res.status(400).json({ ok: false, message: 'Estado inválido.' });
  }

  try {
    const [updateResult] = await pool.execute(
      'UPDATE posts SET is_active = ? WHERE id_post = ? AND id_user = ? AND is_active IN (0, 1)',
      [status, req.params.id, req.user.id_user],
    );
    const result = updateResult as ResultSetHeader;
    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, message: 'Publicación no encontrada o pendiente de revisión.' });
    }
    return res.status(200).json({ ok: true, message: status ? 'Publicación activada.' : 'Publicación desactivada.' });
  } catch (error) {
    console.error('Error al cambiar estado de publicación propia:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar la publicación.' });
  }
});

router.delete<{ id: string }>('/my/:id', authMiddleware, async (req, res) => {
  try {
    const [deleteResult] = await pool.execute(
      'DELETE FROM posts WHERE id_post = ? AND id_user = ? AND is_active = 0',
      [req.params.id, req.user.id_user],
    );
    const result = deleteResult as ResultSetHeader;
    if (!result.affectedRows) {
      return res.status(404).json({ ok: false, message: 'Solo se pueden eliminar publicaciones propias inactivas.' });
    }
    return res.status(200).json({ ok: true, message: 'Publicación eliminada.' });
  } catch (error) {
    console.error('Error al eliminar publicación propia:', error);
    return res.status(500).json({ ok: false, message: 'Error al eliminar la publicación.' });
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
