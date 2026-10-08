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
  proposed_category?: string;
}

interface UpdateStatusBody { status?: number; reason?: string; id_category?: number; category_name?: string }
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
  const { title, description, image_url, id_category, proposed_category } = req.body;
  const categoryId = Number(id_category) || null;
  const proposedCategory = proposed_category?.trim() || null;

  if (!title?.trim() || !description?.trim() || (!categoryId && !proposedCategory)) {
    return res.status(400).json({ ok: false, message: 'Título, descripción y categoría son obligatorios.' });
  }
  if (title.trim().length > 45 || description.trim().length > 300 || (proposedCategory && proposedCategory.length > 45)) {
    return res.status(400).json({ ok: false, message: 'La publicación supera el límite permitido.' });
  }

  try {
    if (categoryId) {
      const [categoryResult] = await pool.execute('SELECT id_category FROM categories WHERE id_category = ? LIMIT 1', [categoryId]);
      if (!(categoryResult as RowDataPacket[])[0]) {
        return res.status(400).json({ ok: false, message: 'La categoría seleccionada no existe.' });
      }
    }
    await pool.execute(
      `INSERT INTO posts (title, description, image_url, created_at, is_active, rejection_reason, id_user, id_category, proposed_category)
       VALUES (?, ?, ?, NOW(), 2, NULL, ?, ?, ?)`,
      [title.trim(), description.trim(), image_url?.trim() || null, req.user.id_user, categoryId, categoryId ? null : proposedCategory],
    );
    return res.status(201).json({ ok: true, message: proposedCategory ? 'Publicación y categoría enviadas a revisión.' : 'Publicación enviada a revisión.' });
  } catch (error) {
    console.error('Error en sp_create_post:', error);
    return res.status(500).json({ ok: false, message: 'Error al crear la publicación.' });
  }
});



// GET /api/posts/my — mis posts (usuario)
router.get('/my', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `SELECT p.id_post, p.title, p.description, p.image_url, p.created_at, p.is_active,
              p.rejection_reason, p.id_category, p.proposed_category,
              COALESCE(c.name, p.proposed_category) AS category
       FROM posts p
       LEFT JOIN categories c ON p.id_category = c.id_category
       WHERE p.id_user = ? ORDER BY p.created_at DESC`,
      [req.user.id_user],
    );
    return res.status(200).json({ ok: true, data: result });
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
    const [result] = await pool.execute(
      `SELECT p.id_post, p.title, p.description, p.image_url, p.created_at, p.is_active,
              p.id_category, p.proposed_category, pr.name AS author,
              COALESCE(c.name, p.proposed_category) AS category
       FROM posts p
       INNER JOIN profiles pr ON p.id_user = pr.id_user
       LEFT JOIN categories c ON p.id_category = c.id_category
       WHERE p.is_active = 2 ORDER BY p.created_at ASC`,
    );
    return res.status(200).json({ ok: true, data: result });
  } catch (error) {
    console.error('Error en sp_get_pending_posts:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener posts pendientes.' });
  }
});

// PUT /api/posts/:id/status — cambiar estado (admin)
router.put<{ id: string }, unknown, UpdateStatusBody>('/:id/status', authMiddleware, requireAdmin, async (req, res) => {
  const { status, reason, id_category, category_name } = req.body;
  if (status === undefined) return res.status(400).json({ ok: false, message: 'Status requerido.' });
  if (![1, 3].includes(Number(status))) return res.status(400).json({ ok: false, message: 'Status de moderación inválido.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [postResult] = await connection.execute(
      'SELECT id_category, proposed_category FROM posts WHERE id_post = ? AND is_active = 2 FOR UPDATE',
      [req.params.id],
    );
    const post = (postResult as RowDataPacket[])[0];
    if (!post) {
      await connection.rollback();
      return res.status(404).json({ ok: false, message: 'La publicación pendiente no existe.' });
    }

    let resolvedCategoryId = Number(post.id_category) || null;
    if (Number(status) === 1 && post.proposed_category) {
      const requestedCategoryId = Number(id_category) || null;
      const reviewedName = category_name?.trim();
      if (requestedCategoryId) {
        const [categoryResult] = await connection.execute('SELECT id_category FROM categories WHERE id_category = ? LIMIT 1', [requestedCategoryId]);
        if (!(categoryResult as RowDataPacket[])[0]) {
          await connection.rollback();
          return res.status(400).json({ ok: false, message: 'La categoría de reemplazo no existe.' });
        }
        resolvedCategoryId = requestedCategoryId;
      } else {
        if (!reviewedName || reviewedName.length > 45) {
          await connection.rollback();
          return res.status(400).json({ ok: false, message: 'Revisá el nombre de la categoría propuesta.' });
        }
        const [existingResult] = await connection.execute('SELECT id_category FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1', [reviewedName]);
        const existing = (existingResult as RowDataPacket[])[0];
        if (existing) resolvedCategoryId = Number(existing.id_category);
        else {
          const [insertResult] = await connection.execute('INSERT INTO categories (name) VALUES (?)', [reviewedName]);
          resolvedCategoryId = (insertResult as ResultSetHeader).insertId;
        }
      }
    }

    if (Number(status) === 1 && !resolvedCategoryId) {
      await connection.rollback();
      return res.status(400).json({ ok: false, message: 'La publicación necesita una categoría aprobada.' });
    }
    await connection.execute(
      'UPDATE posts SET is_active = ?, rejection_reason = ?, id_category = ?, proposed_category = ? WHERE id_post = ?',
      [status, reason || null, resolvedCategoryId, Number(status) === 1 ? null : post.proposed_category, req.params.id],
    );
    await connection.commit();
    return res.status(200).json({ ok: true, message: 'Estado actualizado.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error en sp_update_post_status:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar estado.' });
  } finally {
    connection.release();
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
