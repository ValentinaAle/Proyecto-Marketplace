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
  'http://localhost:5173',
  'http://127.0.0.1:5173',
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
const reactDist = path.join(__dirname, 'frontend', 'dist');
const reactIndex = path.join(reactDist, 'index.html');

const htmlPages = {
  '/home-legacy':       'home.html',
  '/home.html':         'home.html',
};

Object.entries(htmlPages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(htmlDir, file));
  });
});

app.use(express.static(publicDir));

if (require('fs').existsSync(reactIndex)) {
  app.use(express.static(reactDist));
  ['/', '/login', '/register', '/forgot-password', '/home', '/home-react'].forEach((route) => {
    app.get(route, (_req, res) => res.sendFile(reactIndex));
  });
} else {
  const legacyAuthPages = {
    '/': 'index.html',
    '/login': 'index.html',
    '/register': 'register.html',
    '/forgot-password': 'forgot-password.html',
  };
  Object.entries(legacyAuthPages).forEach(([route, file]) => {
    app.get(route, (_req, res) => res.sendFile(path.join(htmlDir, file)));
  });
}

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
