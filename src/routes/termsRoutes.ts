import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import authMiddleware from '../middlewares/auth';
import requireAdmin from '../middlewares/requireAdmin';
import { procedureRows } from '../types/database';

const router = Router();

interface UpdateTermsBody { content?: string }

// GET /api/terms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute('CALL sp_get_terms()');
    return res.status(200).json({ ok: true, data: procedureRows<RowDataPacket>(result)[0] });
  } catch (error) {
    console.error('Error en sp_get_terms:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener términos.' });
  }
});

// PUT /api/terms
router.put<Record<string, never>, unknown, UpdateTermsBody>('/', authMiddleware, requireAdmin, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ ok: false, message: 'El contenido es requerido.' });

  try {
    await pool.execute('CALL sp_update_terms(?, ?)', [content, req.user.id_user]);
    return res.status(200).json({ ok: true, message: 'Términos actualizados.' });
  } catch (error) {
    console.error('Error en sp_update_terms:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar términos.' });
  }
});

export default router;
