import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import authMiddleware from '../middlewares/auth';
import { databaseMessage, procedureRows } from '../types/database';

const router = Router();

interface ContactBody { id_post?: number }
interface ReviewBody { id_contact?: number; id_post?: number; rating?: number }

// POST /api/reviews/contact — registrar clic en "Contratar servicio"
router.post<Record<string, never>, unknown, ContactBody>('/contact', authMiddleware, async (req, res) => {
  const { id_post } = req.body;
  if (!id_post) return res.status(400).json({ ok: false, message: 'id_post requerido.' });

  try {
    await pool.execute('CALL sp_register_contact(?, ?)', [id_post, req.user.id_user]);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error en sp_register_contact:', error);
    return res.status(500).json({ ok: false, message: 'Error al registrar contacto.' });
  }
});

// GET /api/reviews/my-contacts — mis servicios contactados
router.get('/my-contacts', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute('CALL sp_get_my_contacts(?)', [req.user.id_user]);
    return res.status(200).json({ ok: true, data: procedureRows<RowDataPacket>(result) });
  } catch (error) {
    console.error('Error en sp_get_my_contacts:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener contactos.' });
  }
});

// PUT /api/reviews/contact/:id/discard — descartar contacto
router.put<{ id: string }>('/contact/:id/discard', authMiddleware, async (req, res) => {
  try {
    await pool.execute('CALL sp_discard_contact(?, ?)', [req.params.id, req.user.id_user]);
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
    await pool.execute('CALL sp_create_review(?, ?, ?, ?)', [id_contact, id_post, req.user.id_user, rating]);
    return res.status(201).json({ ok: true, message: 'Reseña publicada.' });
  } catch (error) {
    console.error('Error en sp_create_review:', error);
    return res.status(500).json({
      ok: false,
      message: databaseMessage(error, 'Error al crear la reseña.')
    });
  }
});

// GET /api/reviews/post/:id — rating de un post
router.get<{ id: string }>('/post/:id', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute('CALL sp_get_post_rating(?)', [req.params.id]);
    return res.status(200).json({ ok: true, data: procedureRows<RowDataPacket>(result)[0] });
  } catch (error) {
    console.error('Error en sp_get_post_rating:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener rating.' });
  }
});

export default router;
