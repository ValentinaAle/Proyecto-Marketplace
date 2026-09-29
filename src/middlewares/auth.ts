import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2/promise';
import pool from '../config/db';
import type { AuthenticatedUser } from '../types/auth';
import { selectRows } from '../types/database';

interface ActiveUserRow extends RowDataPacket {
  id_user: number;
}

function isAuthenticatedUser(payload: string | jwt.JwtPayload): payload is AuthenticatedUser {
  return typeof payload !== 'string'
    && typeof payload.id_user === 'number'
    && typeof payload.email === 'string';
}

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Espera el header: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      message: 'Token no proporcionado.',
    });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ ok: false, message: 'Token no proporcionado.' });
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET no está configurado.');

    const decoded = jwt.verify(token, secret);
    if (!isAuthenticatedUser(decoded)) throw new Error('Contenido de token inválido.');

    const [result] = await pool.execute(
      'SELECT id_user FROM users WHERE id_user = ? AND email = ? AND is_active = 1',
      [decoded.id_user, decoded.email]
    );
    const users = selectRows<ActiveUserRow>(result);

    if (users.length === 0) {
      return res.status(401).json({ ok: false, message: 'Cuenta no disponible.' });
    }

    req.user = decoded; // { id_user, email, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({
      ok: false,
      message: 'Token inválido o expirado.',
    });
  }
};

export default authMiddleware;
