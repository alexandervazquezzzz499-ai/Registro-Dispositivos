require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const path = require('path');
const crypto = require('crypto');
const { initDB, getPool } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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

// ================== LOGICA DE INACTIVIDAD ==================
async function calcularFechaLimite(dias) {
  const pool = getPool();
  const [festivosRows] = await pool.query('SELECT fecha FROM festivos');
  const festivos = new Set(festivosRows.map(f => new Date(f.fecha).toISOString().split('T')[0]));

  let date = new Date();
  let count = 0;
  while (count < dias) {
    date.setDate(date.getDate() - 1);
    const dayOfWeek = date.getDay(); 
    const dateStr = date.toISOString().split('T')[0];
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !festivos.has(dateStr)) {
      count++;
    }
  }
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

async function verificarInactividad() {
  try {
    const pool = getPool();
    const [config] = await pool.query("SELECT valor FROM configuraciones WHERE clave = 'dias_inactividad'");
    const dias = parseInt(config[0]?.valor || '15');
    const fechaLimite = await calcularFechaLimite(dias);

    await pool.query(`
      UPDATE dispositivos 
      SET estado = 'Bloqueado' 
      WHERE actualizado_en < ? AND estado NOT IN ('Baja', 'Bloqueado')
    `, [fechaLimite]);
    console.log(`[CRON] Verificacion de inactividad completada. Fecha limite: ${fechaLimite}`);
  } catch (err) {
    console.error('Error en verificacion de inactividad:', err);
  }
}
// ============================================================

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

// NOTIFICACIONES
app.get('/api/notificaciones', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [reports] = await pool.query(`
      SELECT m.id, m.falla, m.tecnico, m.fecha, d.fabricante, d.modelo, d.id as dev_id
      FROM mantenimientos m JOIN dispositivos d ON m.dispositivo_id = d.id
      ORDER BY m.fecha DESC LIMIT 5
    `);
    const [updates] = await pool.query(`
      SELECT id as dev_id, fabricante, modelo, estado, actualizado_en
      FROM dispositivos
      WHERE actualizado_en >= NOW() - INTERVAL 2 DAY AND estado != 'Bloqueado'
      ORDER BY actualizado_en DESC LIMIT 5
    `);
    
    const notifs = [
      ...reports.map(r => ({ type: 'reporte', title: `Nuevo reporte: ${r.fabricante} ${r.modelo}`, desc: r.falla, date: r.fecha, icon: 'tool' })),
      ...updates.map(u => ({ type: 'estado', title: `Estado actualizado: ${u.fabricante} ${u.modelo}`, desc: `Nuevo estado: ${u.estado}`, date: u.actualizado_en, icon: 'refresh' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    
    res.json(notifs);
  } catch (err) { res.status(500).json({ error: 'Error al cargar notificaciones' }); }
});

// CONFIGURACION Y FESTIVOS
app.get('/api/configuracion', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [config] = await pool.query('SELECT * FROM configuraciones');
    const [festivos] = await pool.query('SELECT * FROM festivos ORDER BY fecha ASC');
    const dias = config.find(c => c.clave === 'dias_inactividad')?.valor || '15';
    res.json({ dias_inactividad: dias, festivos });
  } catch (err) { res.status(500).json({ error: 'Error al obtener configuracion' }); }
});

app.post('/api/configuracion/dias', requireAuth, async (req, res) => {
  if (req.session.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  const { dias } = req.body;
  try {
    const pool = getPool();
    await pool.query('UPDATE configuraciones SET valor = ? WHERE clave = ?', [dias, 'dias_inactividad']);
    await verificarInactividad();
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al guardar dias' }); }
});

app.post('/api/festivos', requireAuth, async (req, res) => {
  if (req.session.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  const { fecha, nombre } = req.body;
  try {
    const pool = getPool();
    await pool.query('INSERT INTO festivos (fecha, nombre) VALUES (?, ?)', [fecha, nombre]);
    await verificarInactividad();
    res.json({ ok: true });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(400).json({ error: 'Ese festivo ya existe' });
    res.status(500).json({ error: 'Error al guardar festivo' });
  }
});

app.delete('/api/festivos/:id', requireAuth, async (req, res) => {
  if (req.session.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  try {
    const pool = getPool();
    await pool.query('DELETE FROM festivos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar festivo' }); }
});

app.post('/api/dispositivos/:id/desbloquear', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    await pool.query("UPDATE dispositivos SET estado = 'Activo', actualizado_en = CURRENT_TIMESTAMP WHERE id = ?", [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al desbloquear' }); }
});

// RESTO DE RUTAS
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

app.delete('/api/usuarios/:id', requireAuth, async (req, res) => {
  if (req.session.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  if (Number(req.params.id) === req.session.userId) return res.status(400).json({ error: 'No puedes eliminarte a ti mismo' });
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM usuarios WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar usuario' }); }
});

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
    const { departamento, usuario_responsable, fabricante, modelo, tipo, estado, serie, procesador, nucleos, frecuencia, ram_total, detalles_ram, perifericos } = req.body;
    if (!departamento || !tipo) return res.status(400).json({ error: 'Departamento y Tipo son obligatorios.' });
    const pool = getPool();
    const qr_code = crypto.randomUUID();
    const [result] = await pool.execute(`
      INSERT INTO dispositivos (departamento, usuario_responsable, fabricante, modelo, tipo, estado, serie, procesador, nucleos, frecuencia, ram_total, detalles_ram, perifericos, creado_por, qr_code)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [departamento, usuario_responsable || '', fabricante || '', modelo || '', tipo, estado || 'Activo', serie || '', procesador || '', nucleos || '', frecuencia || '', ram_total || '', detalles_ram || '', perifericos || '', req.session.userId || null, qr_code]);
    res.json({ ok: true, id: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Error BD: ' + err.message }); }
});

app.put('/api/dispositivos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { departamento, usuario_responsable, fabricante, modelo, tipo, estado, serie, procesador, nucleos, frecuencia, ram_total, detalles_ram, perifericos } = req.body;
    const pool = getPool();
    await pool.execute(`
      UPDATE dispositivos SET departamento = ?, usuario_responsable = ?, fabricante = ?, modelo = ?, tipo = ?, estado = ?, serie = ?, procesador = ?, nucleos = ?, frecuencia = ?, ram_total = ?, detalles_ram = ?, perifericos = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?
    `, [departamento, usuario_responsable || '', fabricante || '', modelo || '', tipo, estado || 'Activo', serie || '', procesador || '', nucleos || '', frecuencia || '', ram_total || '', detalles_ram || '', perifericos || '', id]);
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

app.get('/api/dispositivos/:id/mantenimientos', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.execute('SELECT * FROM mantenimientos WHERE dispositivo_id = ? ORDER BY fecha DESC', [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener mantenimientos' }); }
});

app.post('/api/dispositivos/:id/mantenimientos', requireAuth, async (req, res) => {
  const { falla, solucion, tipo_mantenimiento } = req.body;
  if (!falla) return res.status(400).json({ error: 'La Falla reportada es obligatoria.' });
  try {
    const pool = getPool();
    const [devRows] = await pool.execute('SELECT estado FROM dispositivos WHERE id = ?', [req.params.id]);
    if (devRows[0]?.estado === 'Bloqueado') {
      return res.status(403).json({ error: 'El equipo esta bloqueado. Desbloquéelo antes de agregar mantenimientos.' });
    }
    await pool.execute(`INSERT INTO mantenimientos (dispositivo_id, falla, solucion, tecnico, tipo_mantenimiento) VALUES (?, ?, ?, ?, ?)`, [req.params.id, falla, solucion || null, req.session.nombre, tipo_mantenimiento || 'Falla']);
    await pool.execute('UPDATE dispositivos SET actualizado_en = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error BD: ' + err.message }); }
});

app.put('/api/mantenimientos/:id/solucion', requireAuth, async (req, res) => {
  const { solucion } = req.body;
  if (!solucion) return res.status(400).json({ error: 'La solución es obligatoria.' });
  try {
    const pool = getPool();
    await pool.execute('UPDATE mantenimientos SET solucion = ? WHERE id = ?', [solucion, req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al actualizar la solución' }); }
});

app.get('/api/todos-mantenimientos', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query(`
      SELECT m.*, d.fabricante, d.modelo, d.departamento, d.serie
      FROM mantenimientos m
      JOIN dispositivos d ON m.dispositivo_id = d.id
      ORDER BY m.fecha DESC
    `);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener historial general' }); }
});

app.delete('/api/mantenimientos/:id', requireAuth, async (req, res) => {
  if (req.session.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden eliminar historiales' });
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM mantenimientos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar mantenimiento' }); }
});

app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

(async () => {
  try {
    await initDB();
    await verificarInactividad();
    setInterval(verificarInactividad, 1000 * 60 * 60 * 24);
    app.listen(PORT, '0.0.0.0', () => { console.log(`\n🚀 Servidor en puerto ${PORT}`); });
  } catch (err) {
    console.error('❌ Error BD:', err);
    process.exit(1);
  }
})();