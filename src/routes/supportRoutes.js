const express        = require('express');
const router         = express.Router();
const authMiddleware = require('../middlewares/auth');
const pool           = require('../config/db');

// GET /api/support/tickets — tickets del usuario
router.get('/tickets', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('CALL sp_get_tickets(?)', [req.user.id_user]);
    return res.status(200).json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error('Error en sp_get_tickets:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener tickets.' });
  }
});

// POST /api/support/tickets — crear ticket
router.post('/tickets', authMiddleware, async (req, res) => {
  const { subject } = req.body;
  if (!subject) return res.status(400).json({ ok: false, message: 'El asunto es requerido.' });

  try {
    const [rows] = await pool.execute('CALL sp_create_ticket(?, ?)', [subject, req.user.id_user]);
    const id_ticket = rows[0][0].id_ticket;

    // Mensaje automático del admin
    await pool.execute('CALL sp_create_message(?, ?, ?)', [
      '¡Hola! Gracias por elegir FIVOX. A la brevedad un administrador estará respondiendo tu consulta.',
      id_ticket,
      1
    ]);

    return res.status(201).json({ ok: true, data: { id_ticket } });
  } catch (error) {
    console.error('Error en sp_create_ticket:', error);
    return res.status(500).json({ ok: false, message: 'Error al crear ticket.' });
  }
});


// GET /api/support/tickets/:id/messages — mensajes de un ticket
router.get('/tickets/:id/messages', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('CALL sp_get_messages(?)', [req.params.id]);
    return res.status(200).json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error('Error en sp_get_messages:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener mensajes.' });
  }
});

// POST /api/support/tickets/:id/messages — enviar mensaje
router.post('/tickets/:id/messages', authMiddleware, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ ok: false, message: 'El mensaje es requerido.' });

  try {
    await pool.execute('CALL sp_create_message(?, ?, ?)', [message, req.params.id, req.user.id_user]);
    return res.status(201).json({ ok: true, message: 'Mensaje enviado.' });
  } catch (error) {
    console.error('Error en sp_create_message:', error);
    return res.status(500).json({ ok: false, message: 'Error al enviar mensaje.' });
  }
});

module.exports = router;

// GET /api/support/admin/tickets — todos los tickets (admin)
router.get('/admin/tickets', authMiddleware, async (req, res) => {
  try {
    const [rows] = await pool.execute('CALL sp_get_all_tickets()');
    return res.status(200).json({ ok: true, data: rows[0] });
  } catch (error) {
    console.error('Error en sp_get_all_tickets:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener tickets.' });
  }
});

// PUT /api/support/tickets/:id/close — cerrar ticket
router.put('/tickets/:id/close', authMiddleware, async (req, res) => {
  try {
    await pool.execute('CALL sp_close_ticket(?)', [req.params.id]);
    return res.status(200).json({ ok: true, message: 'Ticket cerrado.' });
  } catch (error) {
    console.error('Error en sp_close_ticket:', error);
    return res.status(500).json({ ok: false, message: 'Error al cerrar ticket.' });
  }
});

// PUT /api/support/tickets/:id/read
router.put('/tickets/:id/read', authMiddleware, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE support_tickets SET last_read_at = NOW() WHERE id_ticket = ? AND id_user = ?',
      [req.params.id, req.user.id_user]
    );
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error al marcar como leído:', error);
    return res.status(500).json({ ok: false });
  }
});

// PUT /api/support/tickets/:id/read-admin
router.put('/tickets/:id/read-admin', authMiddleware, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE support_tickets SET last_read_admin_at = NOW() WHERE id_ticket = ?',
      [req.params.id]
    );
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error al marcar como leído admin:', error);
    return res.status(500).json({ ok: false });
  }
});