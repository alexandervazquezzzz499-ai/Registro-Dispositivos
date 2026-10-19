require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDB, getPool } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// ---------- MIDDLEWARE ----------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// ---------- MIDDLEWARE DE AUTENTICACIÓN ----------
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (req.path.startsWith('/api/')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  return res.redirect('/login.html');
}

function requireRole(role) {
  return (req, res, next) => {
    if (req.session && req.session.rol === role) return next();
    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de ' + role });
    }
    return res.redirect('/');
  };
}

// ---------- RUTAS DE AUTENTICACIÓN ----------
app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });

  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
    const user = rows[0];

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    req.session.userId = user.id;
    req.session.usuario = user.usuario;
    req.session.nombre = user.nombre;
    req.session.rol = user.rol;

    res.json({ ok: true, usuario: { id: user.id, usuario: user.usuario, nombre: user.nombre, rol: user.rol } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error en el servidor' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ ok: true });
  });
});

app.get('/api/session', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({
      autenticado: true,
      usuario: { id: req.session.userId, usuario: req.session.usuario, nombre: req.session.nombre, rol: req.session.rol }
    });
  }
  res.json({ autenticado: false });
});

app.post('/api/cambiar-password', requireAuth, async (req, res) => {
  const { passwordActual, passwordNueva } = req.body;
  if (!passwordActual || !passwordNueva) return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  if (passwordNueva.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });

  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE id = ?', [req.session.userId]);
    const user = rows[0];
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    if (!bcrypt.compareSync(passwordActual, user.password_hash)) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }

    const hash = bcrypt.hashSync(passwordNueva, 10);
    await pool.execute('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.session.userId]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error al cambiar la contraseña' });
  }
});

// ---------- GESTIÓN DE USUARIOS (solo admin) ----------
app.get('/api/usuarios', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, usuario, nombre, rol, creado_en FROM usuarios ORDER BY creado_en DESC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener usuarios' }); }
});

app.post('/api/usuarios', requireAuth, requireRole('admin'), async (req, res) => {
  const { usuario, password, nombre, rol } = req.body;
  if (!usuario || !password || !nombre) return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  if (password.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });

  const rolFinal = rol || 'tecnico';
  if (!['admin', 'tecnico'].includes(rolFinal)) return res.status(400).json({ error: 'Rol inválido' });

  try {
    const pool = getPool();
    const hash = bcrypt.hashSync(password, 10);
    const [result] = await pool.execute('INSERT INTO usuarios (usuario, password_hash, nombre, rol) VALUES (?, ?, ?, ?)', [usuario, hash, nombre, rolFinal]);
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El usuario ya existe' });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

app.delete('/api/usuarios/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  if (Number(id) === req.session.userId) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM usuarios WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar usuario' }); }
});

app.put('/api/usuarios/:id/password', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  const { passwordNueva } = req.body;
  if (!passwordNueva || passwordNueva.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });
  try {
    const pool = getPool();
    const hash = bcrypt.hashSync(passwordNueva, 10);
    await pool.execute('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al resetear contraseña' }); }
});

// ---------- RUTAS DE DISPOSITIVOS ----------
app.get('/api/dispositivos', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT d.*, u.nombre AS creado_por_nombre
      FROM dispositivos d
      LEFT JOIN usuarios u ON d.creado_por = u.id
      ORDER BY d.creado_en DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener dispositivos' }); }
});

app.post('/api/dispositivos', requireAuth, async (req, res) => {
  const { nombre, tipo, marca, modelo, serial, ubicacion, estado } = req.body;
  if (!nombre || !tipo || !estado) return res.status(400).json({ error: 'Nombre, tipo y estado son obligatorios' });
  try {
    const pool = getPool();
    const [result] = await pool.execute(`
      INSERT INTO dispositivos (nombre, tipo, marca, modelo, serial, ubicacion, estado, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [nombre, tipo, marca || '', modelo || '', serial || '', ubicacion || '', estado, req.session.userId]);
    const [rows] = await pool.execute('SELECT * FROM dispositivos WHERE id = ?', [result.insertId]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al crear dispositivo' }); }
});

app.put('/api/dispositivos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { nombre, tipo, marca, modelo, serial, ubicacion, estado } = req.body;
  if (!nombre || !tipo || !estado) return res.status(400).json({ error: 'Nombre, tipo y estado son obligatorios' });
  try {
    const pool = getPool();
    await pool.execute(`
      UPDATE dispositivos SET nombre = ?, tipo = ?, marca = ?, modelo = ?, serial = ?, ubicacion = ?, estado = ? WHERE id = ?
    `, [nombre, tipo, marca || '', modelo || '', serial || '', ubicacion || '', estado, id]);
    const [rows] = await pool.execute('SELECT * FROM dispositivos WHERE id = ?', [id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: 'Error al actualizar dispositivo' }); }
});

app.delete('/api/dispositivos/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM dispositivos WHERE id = ?', [id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar dispositivo' }); }
});

// ---------- PROTEGER INDEX ----------
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ---------- INICIAR SERVIDOR ----------
(async () => {
  try {
    await initDB();
        app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`🐬 Base de datos MySQL: ${process.env.DB_NAME || 'dispositivos_db'}`);
      console.log(`👤 Login por defecto → usuario: admin | contraseña: admin123\n`);
    });
  } catch (err) {
    console.error('❌ Error al inicializar la base de datos:', err);
    process.exit(1);
  }
})();