const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middlewares/auth');
const requireAdmin   = require('../middlewares/requireAdmin');
const pool           = require('../config/db');

// GET /api/terms
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('CALL sp_get_terms()');
    return res.status(200).json({ ok: true, data: rows[0][0] });
  } catch (error) {
    console.error('Error en sp_get_terms:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener términos.' });
  }
});

// PUT /api/terms
router.put('/', authMiddleware, requireAdmin, async (req, res) => {
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

module.exports = router;
