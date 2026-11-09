import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import authMiddleware from '../middlewares/auth';
import { selectRows } from '../types/database';

const router = Router();

interface ContactBody { id_post?: number }
interface ReviewBody { id_contact?: number; id_post?: number; rating?: number }

// POST /api/reviews/contact — registrar clic en "Contratar servicio"
router.post<Record<string, never>, unknown, ContactBody>('/contact', authMiddleware, async (req, res) => {
  const { id_post } = req.body;
  if (!id_post) return res.status(400).json({ ok: false, message: 'id_post requerido.' });

  try {
    await pool.execute('INSERT IGNORE INTO post_contacts (id_post, id_user, contacted_at, discarded) VALUES (?, ?, NOW(), 0)', [id_post, req.user.id_user]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error en sp_register_contact:', error);
    return res.status(500).json({ ok: false, message: 'Error al registrar contacto.' });
  }
});

// GET /api/reviews/my-contacts — mis servicios contactados
router.get('/my-contacts', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      `SELECT pc.id_contact, pc.id_post, pc.contacted_at, pc.discarded,
              p.title AS post_title, p.image_url AS post_image,
              pr.name AS author_name,
              TIMESTAMPDIFF(DAY, pc.contacted_at, NOW()) AS days_since_contact,
              COUNT(r.id_review) AS already_reviewed
       FROM post_contacts pc
       INNER JOIN posts p ON pc.id_post = p.id_post
       INNER JOIN profiles pr ON p.id_user = pr.id_user
       LEFT JOIN reviews r ON r.id_contact = pc.id_contact
       WHERE pc.id_user = ? AND pc.discarded = 0 AND p.is_active = 1
       GROUP BY pc.id_contact, pc.id_post, pc.contacted_at, pc.discarded,
                p.title, p.image_url, pr.name
       ORDER BY pc.contacted_at DESC`,
      [req.user.id_user],
    );
    return res.status(200).json({ ok: true, data: selectRows<RowDataPacket>(result) });
  } catch (error) {
    console.error('Error en sp_get_my_contacts:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener contactos.' });
  }
});

// PUT /api/reviews/contact/:id/discard — descartar contacto
router.put<{ id: string }>('/contact/:id/discard', authMiddleware, async (req, res) => {
  try {
    await pool.execute('UPDATE post_contacts SET discarded = 1 WHERE id_contact = ? AND id_user = ?', [req.params.id, req.user.id_user]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error en sp_discard_contact:', error);
    return res.status(500).json({ ok: false, message: 'Error al descartar.' });
  }
});

// POST /api/reviews — crear reseña
router.post<Record<string, never>, unknown, ReviewBody>('/', authMiddleware, async (req, res) => {
  const { id_contact, id_post, rating } = req.body;

  if (!id_contact || !id_post || !rating) {
    return res.status(400).json({ ok: false, message: 'Faltan campos requeridos.' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ ok: false, message: 'El rating debe ser entre 1 y 5.' });
  }

  try {
    const [contactResult] = await pool.execute(
      `SELECT pc.id_contact
       FROM post_contacts pc INNER JOIN posts p ON p.id_post = pc.id_post
       WHERE pc.id_contact = ? AND pc.id_post = ? AND pc.id_user = ?
         AND p.id_user <> ? AND TIMESTAMPDIFF(DAY, pc.contacted_at, NOW()) >= 3
       LIMIT 1`,
      [id_contact, id_post, req.user.id_user, req.user.id_user],
    );
    if (!selectRows<RowDataPacket>(contactResult)[0]) return res.status(403).json({ ok: false, message: 'Este servicio todavía no está habilitado para calificar.' });
    await pool.execute(
      `INSERT INTO reviews (id_contact, id_post, id_user, rating, created_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [id_contact, id_post, req.user.id_user, rating],
    );
    return res.status(201).json({ ok: true, message: 'Reseña publicada.' });
  } catch (error) {
    console.error('Error en sp_create_review:', error);
    return res.status(500).json({
      ok: false,
      message: 'No se pudo publicar la calificación o ya calificaste este contacto.'
    });
  }
});

// GET /api/reviews/post/:id — rating de un post
router.get<{ id: string }>('/post/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'SELECT COUNT(DISTINCT id_user) AS total_reviews, ROUND(AVG(rating), 1) AS avg_rating FROM reviews WHERE id_post = ?',
      [req.params.id],
    );
    return res.status(200).json({ ok: true, data: selectRows<RowDataPacket>(result)[0] });
  } catch (error) {
    console.error('Error en sp_get_post_rating:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener rating.' });
  }
});

export default router;
