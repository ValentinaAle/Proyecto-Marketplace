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
interface TicketStatusBody { status?: 'OPEN' | 'CLOSED'; reason?: string }

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
    const [result] = await pool.execute(
      `SELECT t.id_ticket, t.subject, t.status, t.created_at, t.closed_at, t.id_user,
              SUM(CASE WHEN r.name = 'ADMIN' AND sm.message NOT LIKE '¡Hola! Gracias por elegir FIVOX.%' THEN 1 ELSE 0 END) AS admin_replies
       FROM support_tickets t
       LEFT JOIN support_messages sm ON sm.id_ticket = t.id_ticket
       LEFT JOIN users_roles ur ON ur.id_user = sm.id_user
       LEFT JOIN roles r ON r.id_role = ur.id_role
       WHERE t.id_user = ?
       GROUP BY t.id_ticket, t.subject, t.status, t.created_at, t.closed_at, t.id_user
       ORDER BY COALESCE(MAX(sm.created_at), t.created_at) DESC`,
      [req.user.id_user],
    );
    return res.status(200).json({ ok: true, data: selectRows<RowDataPacket>(result) });
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
    const [result] = await pool.execute(
      `SELECT t.id_ticket, t.subject, t.status, t.created_at, t.closed_at, t.id_user,
              COALESCE(p.name, u.email) AS user_name,
              SUM(CASE WHEN r.name = 'ADMIN' AND sm.message NOT LIKE '¡Hola! Gracias por elegir FIVOX.%' THEN 1 ELSE 0 END) AS admin_replies
       FROM support_tickets t
       INNER JOIN users u ON u.id_user = t.id_user
       LEFT JOIN profiles p ON p.id_user = t.id_user
       LEFT JOIN support_messages sm ON sm.id_ticket = t.id_ticket
       LEFT JOIN users_roles ur ON ur.id_user = sm.id_user
       LEFT JOIN roles r ON r.id_role = ur.id_role
       GROUP BY t.id_ticket, t.subject, t.status, t.created_at, t.closed_at, t.id_user, p.name, u.email
       ORDER BY COALESCE(MAX(sm.created_at), t.created_at) DESC`,
    );
    return res.status(200).json({ ok: true, data: selectRows<RowDataPacket>(result) });
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

router.put<{ id: string }, unknown, TicketStatusBody>('/tickets/:id/status', authMiddleware, async (req, res) => {
  const status = req.body.status;
  const reason = req.body.reason?.trim();
  if (!status || !['OPEN', 'CLOSED'].includes(status)) return res.status(400).json({ ok: false, message: 'Estado inválido.' });
  if (!reason || reason.length < 5) return res.status(400).json({ ok: false, message: 'Explicá brevemente el motivo del cambio.' });
  if (!await ensureTicketAccess(req.params.id, req.user.id_user)) return res.status(404).json({ ok: false, message: 'Consulta no encontrada.' });

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [ticketResult] = await connection.execute('SELECT status FROM support_tickets WHERE id_ticket = ? FOR UPDATE', [req.params.id]);
    const ticket = selectRows<RowDataPacket>(ticketResult)[0];
    if (!ticket) { await connection.rollback(); return res.status(404).json({ ok: false, message: 'Consulta no encontrada.' }); }
    if (ticket.status === status) { await connection.rollback(); return res.status(400).json({ ok: false, message: 'La consulta ya se encuentra en ese estado.' }); }

    await connection.execute(
      'UPDATE support_tickets SET status = ?, closed_at = CASE WHEN ? = \'CLOSED\' THEN NOW() ELSE NULL END, last_message_at = NOW() WHERE id_ticket = ?',
      [status, status, req.params.id],
    );
    const action = status === 'CLOSED' ? 'Consulta cerrada' : 'Consulta reabierta';
    await connection.execute(
      'INSERT INTO support_messages (message, created_at, id_ticket, id_user) VALUES (?, NOW(), ?, ?)',
      [`${action}: ${reason}`, req.params.id, req.user.id_user],
    );
    await connection.commit();
    return res.status(200).json({ ok: true, message: status === 'CLOSED' ? 'Consulta cerrada.' : 'Consulta reabierta.' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al cambiar el estado del ticket:', error);
    return res.status(500).json({ ok: false, message: 'No se pudo cambiar el estado de la consulta.' });
  } finally { connection.release(); }
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
  return res.status(200).json({ ok: true });
});

export default router;
