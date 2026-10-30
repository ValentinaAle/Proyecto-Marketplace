import { Router } from 'express';
import type { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import authMiddleware from '../middlewares/auth';
import requireAdmin from '../middlewares/requireAdmin';
import { selectRows } from '../types/database';

const router = Router();

interface UpdateTermsBody { content?: string }
interface TermsRow extends RowDataPacket {
  id_terms: number;
  content: string;
  updated_at: Date | null;
  id_user: number;
}

// GET /api/terms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute(
      'SELECT id_terms, content, updated_at, id_user FROM terms ORDER BY updated_at DESC, id_terms DESC LIMIT 1'
    );
    const terms = selectRows<TermsRow>(result)[0];

    if (!terms) {
      return res.status(404).json({ ok: false, message: 'Todavía no se cargaron los términos y condiciones.' });
    }

    return res.status(200).json({ ok: true, data: terms });
  } catch (error) {
    console.error('Error al consultar términos:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener términos.' });
  }
});

// PUT /api/terms
router.put<Record<string, never>, unknown, UpdateTermsBody>('/', authMiddleware, requireAdmin, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ ok: false, message: 'El contenido es requerido.' });

  try {
    const [updateResult] = await pool.execute<ResultSetHeader>(
      `UPDATE terms
       SET content = ?, id_user = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id_terms = (SELECT id_terms FROM (SELECT id_terms FROM terms ORDER BY updated_at DESC, id_terms DESC LIMIT 1) latest_terms)`,
      [content.trim(), req.user.id_user]
    );

    if (updateResult.affectedRows === 0) {
      await pool.execute(
        'INSERT INTO terms (content, id_user) VALUES (?, ?)',
        [content.trim(), req.user.id_user]
      );
    }

    return res.status(200).json({ ok: true, message: 'Términos actualizados.' });
  } catch (error) {
    console.error('Error al actualizar términos:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar términos.' });
  }
});

export default router;
