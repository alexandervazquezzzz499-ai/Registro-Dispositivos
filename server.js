require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const { initDB, getPool } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto_super_seguro',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8, httpOnly: true, sameSite: 'lax' }
}));

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'No autorizado' });
  return res.redirect('/login.html');
}

// ---------- AUTENTICACIÓN ----------
app.post('/api/login', async (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM usuarios WHERE usuario = ?', [usuario]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    
    req.session.userId = user.id;
    req.session.usuario = user.usuario;
    req.session.nombre = user.nombre;
    req.session.rol = user.rol;
    res.json({ ok: true, usuario: { id: user.id, usuario: user.usuario, nombre: user.nombre, rol: user.rol } });
  } catch (err) { res.status(500).json({ error: 'Error en el servidor' }); }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => { res.clearCookie('connect.sid'); res.json({ ok: true }); });
});

app.get('/api/session', (req, res) => {
  if (req.session && req.session.userId) {
    return res.json({ autenticado: true, usuario: { id: req.session.userId, usuario: req.session.usuario, nombre: req.session.nombre, rol: req.session.rol } });
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
    if (!bcrypt.compareSync(passwordActual, user.password_hash)) return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    const hash = bcrypt.hashSync(passwordNueva, 10);
    await pool.execute('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.session.userId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al cambiar la contraseña' }); }
});

// ---------- USUARIOS ----------
app.get('/api/usuarios', requireAuth, async (req, res) => {
  if (req.session.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT id, usuario, nombre, rol, creado_en FROM usuarios ORDER BY id ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener usuarios' }); }
});

app.post('/api/usuarios', requireAuth, async (req, res) => {
  if (req.session.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  const { usuario, password, nombre, rol } = req.body;
  if (!usuario || !password || !nombre) return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  try {
    const pool = getPool();
    const hash = bcrypt.hashSync(password, 10);
    const [result] = await pool.execute('INSERT INTO usuarios (usuario, password_hash, nombre, rol) VALUES (?, ?, ?, ?)', [usuario, hash, nombre, rol || 'usuario']);
    res.json({ ok: true, id: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'El usuario ya existe' });
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

// ---------- DISPOSITIVOS ----------
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
  try {
    const { departamento, usuario_responsable, fabricante, modelo, tipo, estado, procesador, nucleos, frecuencia, ram_total, detalles_ram } = req.body;
    if (!departamento || !tipo) return res.status(400).json({ error: 'Departamento y Tipo son obligatorios.' });
    const pool = getPool();
    const [result] = await pool.execute(`
      INSERT INTO dispositivos (departamento, usuario_responsable, fabricante, modelo, tipo, estado, procesador, nucleos, frecuencia, ram_total, detalles_ram, creado_por)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [departamento, usuario_responsable || '', fabricante || '', modelo || '', tipo, estado || 'Activo', procesador || '', nucleos || '', frecuencia || '', ram_total || '', detalles_ram || '', req.session.userId]);
    res.json({ ok: true, id: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Error BD: ' + err.message }); }
});

app.put('/api/dispositivos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { departamento, usuario_responsable, fabricante, modelo, tipo, estado, procesador, nucleos, frecuencia, ram_total, detalles_ram } = req.body;
    const pool = getPool();
    await pool.execute(`
      UPDATE dispositivos SET departamento = ?, usuario_responsable = ?, fabricante = ?, modelo = ?, tipo = ?, estado = ?, procesador = ?, nucleos = ?, frecuencia = ?, ram_total = ?, detalles_ram = ? WHERE id = ?
    `, [departamento, usuario_responsable || '', fabricante || '', modelo || '', tipo, estado || 'Activo', procesador || '', nucleos || '', frecuencia || '', ram_total || '', detalles_ram || '', id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error BD: ' + err.message }); }
});

app.delete('/api/dispositivos/:id', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM dispositivos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar' }); }
});

// ---------- MANTENIMIENTOS ----------
app.get('/api/dispositivos/:id/mantenimientos', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM mantenimientos WHERE dispositivo_id = ? ORDER BY fecha DESC', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener mantenimientos' }); }
});

app.post('/api/dispositivos/:id/mantenimientos', requireAuth, async (req, res) => {
  const { falla, solucion } = req.body;
  if (!falla || !solucion) return res.status(400).json({ error: 'Falla y Solución son obligatorios.' });
  try {
    const pool = getPool();
    await pool.execute(`
      INSERT INTO mantenimientos (dispositivo_id, falla, solucion, tecnico) VALUES (?, ?, ?, ?)
    `, [req.params.id, falla, solucion, req.session.nombre]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error BD: ' + err.message }); }
});

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

(async () => {
  try {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Servidor en puerto ${PORT}`);
    });
  } catch (err) {
    console.error('❌ Error BD:', err);
    process.exit(1);
  }
})();