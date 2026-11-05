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
      ORDER BY m.fecha DESC LIMIT 3
    `);

    const [updates] = await pool.query(`
      SELECT id as dev_id, fabricante, modelo, estado, actualizado_en
      FROM dispositivos
      WHERE actualizado_en >= NOW() - INTERVAL 1 DAY AND estado != 'Bloqueado'
      ORDER BY actualizado_en DESC LIMIT 3
    `);

    const [warranties] = await pool.query(`
      SELECT id as dev_id, fabricante, modelo, fecha_compra, meses_garantia,
             DATE_ADD(fecha_compra, INTERVAL meses_garantia MONTH) as fecha_vencimiento
      FROM dispositivos
      WHERE fecha_compra IS NOT NULL AND meses_garantia > 0
        AND DATE_ADD(fecha_compra, INTERVAL meses_garantia MONTH) BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 30 DAY)
    `);

    const [lowStock] = await pool.query(`
      SELECT id, nombre, stock, stock_minimo FROM repuestos WHERE stock <= stock_minimo AND stock > 0
    `);
    
    const notifs = [
      ...reports.map(r => ({ type: 'reporte', title: `Nuevo reporte: ${r.fabricante} ${r.modelo}`, desc: r.falla, date: r.fecha })),
      ...updates.map(u => ({ type: 'estado', title: `Estado actualizado: ${u.fabricante} ${u.modelo}`, desc: `Nuevo estado: ${u.estado}`, date: u.actualizado_en })),
      ...warranties.map(w => {
        const diasRestantes = Math.ceil((new Date(w.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
        return { 
          type: 'garantia', 
          title: `Garantía por vencer: ${w.fabricante} ${w.modelo}`, 
          desc: `Vence en ${diasRestantes} días (${new Date(w.fecha_vencimiento).toLocaleDateString()})`, 
          date: new Date()
        };
      }),
      ...lowStock.map(l => ({
        type: 'inventario',
        title: `Stock Bajo: ${l.nombre}`,
        desc: `Quedan ${l.stock} unidades (Mínimo: ${l.stock_minimo})`,
        date: new Date()
      }))
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

// REPUESTOS
app.get('/api/repuestos', requireAuth, async (req, res) => {
  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM repuestos ORDER BY nombre ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener repuestos' }); }
});

app.post('/api/repuestos', requireAuth, async (req, res) => {
  const { nombre, stock, stock_minimo } = req.body;
  if (!nombre) return res.status(400).json({ error: 'El nombre es obligatorio' });
  try {
    const pool = getPool();
    const [result] = await pool.execute(
      'INSERT INTO repuestos (nombre, stock, stock_minimo) VALUES (?, ?, ?)',
      [nombre, stock || 0, stock_minimo || 1]
    );
    res.json({ ok: true, id: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Error al crear repuesto' }); }
});

app.put('/api/repuestos/:id', requireAuth, async (req, res) => {
  const { nombre, stock, stock_minimo } = req.body;
  try {
    const pool = getPool();
    await pool.execute(
      'UPDATE repuestos SET nombre = ?, stock = ?, stock_minimo = ? WHERE id = ?',
      [nombre, stock, stock_minimo, req.params.id]
    );
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al actualizar repuesto' }); }
});

app.delete('/api/repuestos/:id', requireAuth, async (req, res) => {
  if (req.session.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores' });
  try {
    const pool = getPool();
    await pool.execute('DELETE FROM repuestos WHERE id = ?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: 'Error al eliminar repuesto' }); }
});

// USUARIOS Y DISPOSITIVOS
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
    const { departamento, usuario_responsable, fabricante, modelo, tipo, estado, serie, procesador, nucleos, frecuencia, ram_total, detalles_ram, perifericos, fecha_compra, meses_garantia } = req.body;
    if (!departamento || !tipo) return res.status(400).json({ error: 'Departamento y Tipo son obligatorios.' });
    const pool = getPool();
    const qr_code = crypto.randomUUID();
    const [result] = await pool.execute(`
      INSERT INTO dispositivos (departamento, usuario_responsable, fabricante, modelo, tipo, estado, serie, procesador, nucleos, frecuencia, ram_total, detalles_ram, perifericos, creado_por, qr_code, fecha_compra, meses_garantia)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [departamento, usuario_responsable || '', fabricante || '', modelo || '', tipo, estado || 'Activo', serie || '', procesador || '', nucleos || '', frecuencia || '', ram_total || '', detalles_ram || '', perifericos || '', req.session.userId || null, qr_code, fecha_compra || null, meses_garantia || 0]);
    res.json({ ok: true, id: result.insertId });
  } catch (err) { res.status(500).json({ error: 'Error BD: ' + err.message }); }
});

app.put('/api/dispositivos/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { departamento, usuario_responsable, fabricante, modelo, tipo, estado, serie, procesador, nucleos, frecuencia, ram_total, detalles_ram, perifericos, fecha_compra, meses_garantia } = req.body;
    const pool = getPool();
    await pool.execute(`
      UPDATE dispositivos SET departamento = ?, usuario_responsable = ?, fabricante = ?, modelo = ?, tipo = ?, estado = ?, serie = ?, procesador = ?, nucleos = ?, frecuencia = ?, ram_total = ?, detalles_ram = ?, perifericos = ?, fecha_compra = ?, meses_garantia = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?
    `, [departamento, usuario_responsable || '', fabricante || '', modelo || '', tipo, estado || 'Activo', serie || '', procesador || '', nucleos || '', frecuencia || '', ram_total || '', detalles_ram || '', perifericos || '', fecha_compra || null, meses_garantia || 0, id]);
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
    const [rows] = await pool.query(`
      SELECT m.*, 
             (SELECT GROUP_CONCAT(CONCAT(r.nombre, ' (x', mr.cantidad, ')') SEPARATOR ', ') 
              FROM mantenimientos_repuestos mr 
              JOIN repuestos r ON mr.repuesto_id = r.id 
              WHERE mr.mantenimiento_id = m.id) AS repuestos_usados
      FROM mantenimientos m 
      WHERE m.dispositivo_id = ? ORDER BY m.fecha DESC
    `, [req.params.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error al obtener mantenimientos' }); }
});

app.post('/api/dispositivos/:id/mantenimientos', requireAuth, async (req, res) => {
  const { falla, solucion, tipo_mantenimiento, repuestos } = req.body;
  if (!falla) return res.status(400).json({ error: 'La Falla reportada es obligatoria.' });
  
  const pool = getPool();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [devRows] = await conn.execute('SELECT estado FROM dispositivos WHERE id = ?', [req.params.id]);
    if (devRows[0]?.estado === 'Bloqueado') {
      await conn.rollback();
      return res.status(403).json({ error: 'El equipo esta bloqueado. Desbloquéelo antes de agregar mantenimientos.' });
    }

    const [mantResult] = await conn.execute(
      `INSERT INTO mantenimientos (dispositivo_id, falla, solucion, tecnico, tipo_mantenimiento) VALUES (?, ?, ?, ?, ?)`, 
      [req.params.id, falla, solucion || null, req.session.nombre, tipo_mantenimiento || 'Falla']
    );
    const mantenimientoId = mantResult.insertId;

    if (repuestos && Array.isArray(repuestos) && repuestos.length > 0) {
      for (let r of repuestos) {
        if (r.id && r.cantidad > 0) {
          await conn.execute(
            'INSERT INTO mantenimientos_repuestos (mantenimiento_id, repuesto_id, cantidad) VALUES (?, ?, ?)',
            [mantenimientoId, r.id, r.cantidad]
          );
          await conn.execute(
            'UPDATE repuestos SET stock = stock - ? WHERE id = ?',
            [r.cantidad, r.id]
          );
        }
      }
    }

    await conn.execute('UPDATE dispositivos SET actualizado_en = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);

    await conn.commit();
    res.json({ ok: true });
  } catch (err) { 
    await conn.rollback();
    res.status(500).json({ error: 'Error BD: ' + err.message }); 
  } finally {
    conn.release();
  }
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
      SELECT m.*, d.fabricante, d.modelo, d.departamento, d.serie,
             (SELECT GROUP_CONCAT(CONCAT(r.nombre, ' (x', mr.cantidad, ')') SEPARATOR ', ') 
              FROM mantenimientos_repuestos mr 
              JOIN repuestos r ON mr.repuesto_id = r.id 
              WHERE mr.mantenimiento_id = m.id) AS repuestos_usados
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