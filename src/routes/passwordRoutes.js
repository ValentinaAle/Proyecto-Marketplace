const express     = require('express');
const router      = express.Router();
const pool        = require('../config/db');
const bcrypt      = require('bcryptjs');
const crypto      = require('crypto');
const transporter = require('../config/mailer');
const requests = new Map();
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;

const isLimited = (store, key, limit) => {
  const now = Date.now();
  const values = (store.get(key) || []).filter(time => now - time < WINDOW_MS);
  if (values.length >= limit) return true;
  values.push(now);
  store.set(key, values);
  return false;
};

router.post('/forgot', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ ok: false, message: 'El email es requerido.' });
  if (isLimited(requests, `${req.ip}:${email.toLowerCase()}`, 3)) {
    return res.status(429).json({ ok: false, message: 'Demasiadas solicitudes. Intentá más tarde.' });
  }

  try {
    const [rows] = await pool.execute('CALL sp_check_email_exists(?)', [email]);
    const user = rows[0][0];

    if (!user) {
      return res.status(200).json({ ok: true, message: 'Si el email existe, recibirás un código.' });
    }

    // Generar código de 6 dígitos
    const code = crypto.randomInt(100000, 1000000).toString();

    await pool.execute(
      'UPDATE users SET reset_token = ?, reset_token_expires = NOW() + INTERVAL 15 MINUTE WHERE id_user = ?',
      [code, user.id_user]
    );

    // Enviar email
    await transporter.sendMail({
      from:    `"FIVOX" <${process.env.EMAIL_USER}>`,
      to:      email,
      subject: 'Código de recuperación de contraseña - FIVOX',
      html: `
        <div style="font-family:'Poppins',sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#fff;border-radius:16px;border:1px solid #e8edf5;">
          <h2 style="color:#17212b;margin-bottom:8px;">Recuperar contraseña</h2>
          <p style="color:#6b7280;margin-bottom:24px;">Recibimos una solicitud para restablecer la contraseña de tu cuenta en FIVOX.</p>
          <div style="background:#f0fdf9;border:1px solid #3ed6bc;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <p style="color:#6b7280;font-size:14px;margin:0 0 8px;">Tu código de verificación es:</p>
            <h1 style="color:#20b39d;font-size:42px;letter-spacing:10px;margin:0;">${code}</h1>
          </div>
          <p style="color:#6b7280;font-size:13px;">Este código expira en <strong>15 minutos</strong>. Si no solicitaste este cambio, ignorá este mensaje.</p>
          <hr style="border-color:#e8edf5;margin:24px 0;">
          <p style="color:#9ba5b3;font-size:12px;text-align:center;">FIVOX — Marketplace de servicios</p>
        </div>
      `,
    });

    return res.status(200).json({ ok: true, message: 'Código enviado al email.' });

  } catch (error) {
    console.error('Error en forgot password:', error);
    return res.status(500).json({ ok: false, message: 'Error al enviar el email.' });
  }
});

// POST /api/password/verify
router.post('/verify', async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) return res.status(400).json({ ok: false, message: 'Email y código son requeridos.' });
  if (isLimited(attempts, `${req.ip}:${email.toLowerCase()}`, 5)) {
    return res.status(429).json({ ok: false, message: 'Demasiados intentos. Solicitá un nuevo código.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND reset_token = ? AND reset_token_expires > NOW()',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, message: 'Código inválido o expirado.' });
    }

    return res.status(200).json({ ok: true, message: 'Código válido.' });

  } catch (error) {
    console.error('Error en verify:', error);
    return res.status(500).json({ ok: false, message: 'Error al verificar el código.' });
  }
});

// POST /api/password/reset
router.post('/reset', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ ok: false, message: 'Todos los campos son requeridos.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ ok: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
  }
  if (isLimited(attempts, `${req.ip}:${email.toLowerCase()}`, 5)) {
    return res.status(429).json({ ok: false, message: 'Demasiados intentos. Solicitá un nuevo código.' });
  }

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM users WHERE email = ? AND reset_token = ? AND reset_token_expires > NOW()',
      [email, code]
    );

    if (rows.length === 0) {
      return res.status(400).json({ ok: false, message: 'Código inválido o expirado.' });
    }

    const user         = rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await pool.execute(
      'UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id_user = ?',
      [passwordHash, user.id_user]
    );
    attempts.delete(`${req.ip}:${email.toLowerCase()}`);

    return res.status(200).json({ ok: true, message: 'Contraseña actualizada correctamente.' });

  } catch (error) {
    console.error('Error en reset:', error);
    return res.status(500).json({ ok: false, message: 'Error al actualizar la contraseña.' });
  }
});

module.exports = router;
