require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const DB_NAME = process.env.DB_NAME || 'dispositivos_db';
let pool = null;

async function initDB() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT || 4000,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
  });
  
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: DB_NAME,
    port: process.env.DB_PORT || 4000,
    ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      nombre VARCHAR(100) NOT NULL,
      rol ENUM('admin', 'usuario') DEFAULT 'usuario' NOT NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dispositivos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      departamento VARCHAR(150) NOT NULL,
      usuario_responsable VARCHAR(150),
      fabricante VARCHAR(100),
      modelo VARCHAR(100),
      tipo VARCHAR(50) NOT NULL,
      estado VARCHAR(50) NOT NULL DEFAULT 'Activo',
      serie VARCHAR(100),
      procesador VARCHAR(100),
      nucleos VARCHAR(50),
      frecuencia VARCHAR(50),
      ram_total VARCHAR(50),
      detalles_ram VARCHAR(255),
      perifericos VARCHAR(255) DEFAULT '',
      qr_code VARCHAR(100) DEFAULT NULL,
      creado_por INT,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `);

  // Columnas de compatibilidad y nuevas funciones
  try { await pool.query(`ALTER TABLE dispositivos ADD COLUMN perifericos VARCHAR(255) DEFAULT ''`); } catch (err) { if (err.code !== 'ER_DUP_FIELDNAME') console.log(err); }
  try { await pool.query(`ALTER TABLE dispositivos ADD COLUMN qr_code VARCHAR(100) DEFAULT NULL`); } catch (err) { if (err.code !== 'ER_DUP_FIELDNAME') console.log(err); }
  try { await pool.query(`ALTER TABLE dispositivos ADD UNIQUE INDEX idx_qr_code (qr_code)`); } catch (err) { if (err.code !== 'ER_DUP_KEYNAME' && err.code !== 'ER_DUP_INDEX') console.log(err); }
  
  // NUEVAS COLUMNAS PARA GARANTIA
  try { await pool.query(`ALTER TABLE dispositivos ADD COLUMN fecha_compra DATE DEFAULT NULL`); } catch (err) { if (err.code !== 'ER_DUP_FIELDNAME') console.log(err); }
  try { await pool.query(`ALTER TABLE dispositivos ADD COLUMN meses_garantia INT DEFAULT 0`); } catch (err) { if (err.code !== 'ER_DUP_FIELDNAME') console.log(err); }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS configuraciones (
      clave VARCHAR(50) PRIMARY KEY,
      valor VARCHAR(255)
    )
  `);
  await pool.query(`INSERT IGNORE INTO configuraciones (clave, valor) VALUES ('dias_inactividad', '15')`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS festivos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fecha DATE UNIQUE,
      nombre VARCHAR(100)
    )
  `);

  const [equiposSinQr] = await pool.query('SELECT id FROM dispositivos WHERE qr_code IS NULL');
  for (let equipo of equiposSinQr) {
    const uuid = crypto.randomUUID();
    await pool.query('UPDATE dispositivos SET qr_code = ? WHERE id = ?', [uuid, equipo.id]);
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mantenimientos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dispositivo_id INT,
      falla TEXT,
      solucion TEXT,
      tecnico VARCHAR(100),
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      tipo_mantenimiento VARCHAR(50) DEFAULT 'Falla',
      FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE CASCADE
    )
  `);
  try { await pool.query(`ALTER TABLE mantenimientos ADD COLUMN tipo_mantenimiento VARCHAR(50) DEFAULT 'Falla'`); } catch (err) { if (err.code !== 'ER_DUP_FIELDNAME') console.log(err); }

  const [rows] = await pool.execute('SELECT id FROM usuarios WHERE usuario = ?', ['admin']);
  if (rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.execute('INSERT INTO usuarios (usuario, password_hash, nombre, rol) VALUES (?, ?, ?, ?)', ['admin', hash, 'Administrador', 'admin']);
  }
  return pool;
}

function getPool() {
  if (!pool) throw new Error('La base de datos no ha sido inicializada');
  return pool;
}

module.exports = { initDB, getPool };