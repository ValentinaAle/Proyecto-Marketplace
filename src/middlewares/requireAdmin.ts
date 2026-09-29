import type { NextFunction, Request, Response } from 'express';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import { selectRows } from '../types/database';

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const [result] = await pool.execute(
      `SELECT 1
       FROM users_roles ur
       INNER JOIN roles r ON r.id_role = ur.id_role
       WHERE ur.id_user = ? AND r.name = 'ADMIN'
       LIMIT 1`,
      [req.user.id_user]
    );
    const rows = selectRows<RowDataPacket>(result);

    if (rows.length === 0) {
      return res.status(403).json({ ok: false, message: 'Acceso exclusivo para administradores.' });
    }

    next();
  } catch (error) {
    console.error('Error al validar rol de administrador:', error);
    return res.status(500).json({ ok: false, message: 'No se pudo validar el rol.' });
  }
};

export default requireAdmin;
