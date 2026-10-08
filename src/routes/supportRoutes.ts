import { Router } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import authMiddleware from '../middlewares/auth';
import requireAdmin from '../middlewares/requireAdmin';
import { procedureRows, selectRows } from '../types/database';

interface TicketRow extends RowDataPacket {
  id_ticket: number;
}

interface TicketAccessRow extends RowDataPacket {
  id_user: number;
  is_admin: number;
}

const router = Router();

interface SubjectBody { subject?: string }
interface MessageBody { message?: string }

const ensureTicketAccess = async (ticketId: string, userId: number): Promise<boolean> => {
  const [result] = await pool.execute(
    `SELECT t.id_ticket, t.id_user,
      EXISTS(SELECT 1 FROM users_roles ur INNER JOIN roles r ON r.id_role = ur.id_role
             WHERE ur.id_user = ? AND r.name = 'ADMIN') AS is_admin
     FROM support_tickets t WHERE t.id_ticket = ?`,
    [userId, ticketId]
  );
  const ticket = selectRows<TicketAccessRow>(result)[0];
  return Boolean(ticket && (ticket.id_user === userId || ticket.is_admin === 1));
};

// GET /api/support/tickets — tickets del usuario
router.get('/tickets', authMiddleware, async (req, res) => {
  try {
    const [result] = await pool.execute('CALL sp_get_tickets(?)', [req.user.id_user]);
    return res.status(200).json({ ok: true, data: procedureRows<RowDataPacket>(result) });
  } catch (error) {
    console.error('Error en sp_get_tickets:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener tickets.' });
  }
});

// POST /api/support/tickets — crear ticket
router.post<Record<string, never>, unknown, SubjectBody>('/tickets', authMiddleware, async (req, res) => {
  const { subject } = req.body;
  if (!subject) return res.status(400).json({ ok: false, message: 'El asunto es requerido.' });

  try {
    const [result] = await pool.execute('CALL sp_create_ticket(?, ?)', [subject, req.user.id_user]);
    const ticket = procedureRows<TicketRow>(result)[0];
    if (!ticket) throw new Error('No se pudo recuperar el ticket creado.');
    const id_ticket = ticket.id_ticket;

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
router.get<{ id: string }>('/tickets/:id/messages', authMiddleware, async (req, res) => {
  try {
    if (!await ensureTicketAccess(req.params.id, req.user.id_user)) {
      return res.status(404).json({ ok: false, message: 'Ticket no encontrado.' });
    }
    const [result] = await pool.execute('CALL sp_get_messages(?)', [req.params.id]);
    return res.status(200).json({ ok: true, data: procedureRows<RowDataPacket>(result) });
  } catch (error) {
    console.error('Error en sp_get_messages:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener mensajes.' });
  }
});

// POST /api/support/tickets/:id/messages — enviar mensaje
router.post<{ id: string }, unknown, MessageBody>('/tickets/:id/messages', authMiddleware, async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ ok: false, message: 'El mensaje es requerido.' });

  try {
    if (!await ensureTicketAccess(req.params.id, req.user.id_user)) {
      return res.status(404).json({ ok: false, message: 'Ticket no encontrado.' });
    }
    await pool.execute('CALL sp_create_message(?, ?, ?)', [message, req.params.id, req.user.id_user]);
    return res.status(201).json({ ok: true, message: 'Mensaje enviado.' });
  } catch (error) {
    console.error('Error en sp_create_message:', error);
    return res.status(500).json({ ok: false, message: 'Error al enviar mensaje.' });
  }
});

// GET /api/support/admin/tickets — todos los tickets (admin)
router.get('/admin/tickets', authMiddleware, requireAdmin, async (req, res) => {
  try {
    const [result] = await pool.execute('CALL sp_get_all_tickets()');
    return res.status(200).json({ ok: true, data: procedureRows<RowDataPacket>(result) });
  } catch (error) {
    console.error('Error en sp_get_all_tickets:', error);
    return res.status(500).json({ ok: false, message: 'Error al obtener tickets.' });
  }
});

// PUT /api/support/tickets/:id/close — cerrar ticket como admin
router.put<{ id: string }>('/tickets/:id/close', authMiddleware, requireAdmin, async (req, res) => {
  try {
    await pool.execute('CALL sp_close_ticket(?)', [req.params.id]);
    return res.status(200).json({ ok: true, message: 'Ticket cerrado.' });
  } catch (error) {
    console.error('Error en sp_close_ticket:', error);
    return res.status(500).json({ ok: false, message: 'Error al cerrar ticket.' });
  }
});

// PUT /api/support/tickets/:id/read
router.put<{ id: string }>('/tickets/:id/read', authMiddleware, async (req, res) => {
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
router.put<{ id: string }>('/tickets/:id/read-admin', authMiddleware, requireAdmin, async (req, res) => {
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

export default router;
