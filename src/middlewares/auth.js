const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const authMiddleware = async (req, res, next) => {
  // Espera el header: Authorization: Bearer <token>
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      ok: false,
      message: 'Token no proporcionado.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await pool.execute(
      'SELECT id_user FROM users WHERE id_user = ? AND email = ? AND is_active = 1',
      [decoded.id_user, decoded.email]
    );

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

module.exports = authMiddleware;
