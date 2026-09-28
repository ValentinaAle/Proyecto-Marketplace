require('dotenv').config();
const path       = require('path');
const express    = require('express');
const cors       = require('cors');
const pool       = require('./src/config/db');
const authRoutes  = require('./src/routes/authRoutes');
const postsRoutes = require('./src/routes/postsRoutes');
const supportRoutes = require('./src/routes/supportRoutes');
const termsRoutes = require('./src/routes/termsRoutes');
const usersRoutes = require('./src/routes/usersRoutes');
const passwordRoutes = require('./src/routes/passwordRoutes');
const reviewsRoutes = require('./src/routes/reviewsRoutes');

const app  = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  process.env.FRONTEND_URL,
  `http://localhost:${PORT}`,
  `http://127.0.0.1:${PORT}`,
  'http://localhost:5500',
  'http://127.0.0.1:5500',
].filter(Boolean);

/* ─────────────────────────────────────────
   Middlewares globales
───────────────────────────────────────── */

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else if (process.env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Origen no permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ─────────────────────────────────────────
   API
───────────────────────────────────────── */
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/terms', termsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/reviews', reviewsRoutes);

app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, message: 'FIVOX API corriendo 🚀' });
  } catch {
    res.status(503).json({ ok: false, message: 'Base de datos no disponible.' });
  }
});

/* ─────────────────────────────────────────
   Frontend estático
───────────────────────────────────────── */
const publicDir = path.join(__dirname, 'public');
const htmlDir   = path.join(publicDir, 'html');

const htmlPages = {
  '/':                  'index.html',
  '/login':             'index.html',
  '/index.html':        'index.html',
  '/home':              'home.html',
  '/home.html':         'home.html',
  '/html/home.html':    'home.html',
  '/register':          'register.html',
  '/register.html':     'register.html',
  '/forgot-password':   'forgot-password.html',
  '/forgot-password.html': 'forgot-password.html',
};

Object.entries(htmlPages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    // Las páginas pueden contener información de una sesión autenticada.
    // Evita que el navegador las restaure desde su caché al navegar atrás/adelante.
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
      Expires: '0',
    });
    res.sendFile(path.join(htmlDir, file));
  });
});

app.use(express.static(publicDir));

app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ ok: false, message: 'Ruta no encontrada.' });
  }
  res.status(404).send('Página no encontrada.');
});

/* ─────────────────────────────────────────
   Iniciar servidor
───────────────────────────────────────── */
require('./src/config/db');

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
