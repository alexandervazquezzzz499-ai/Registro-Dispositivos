require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

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
      creado_por INT,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS mantenimientos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      dispositivo_id INT,
      falla TEXT,
      solucion TEXT,
      tecnico VARCHAR(100),
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dispositivo_id) REFERENCES dispositivos(id) ON DELETE CASCADE
    )
  `);

  const [rows] = await pool.execute('SELECT id FROM usuarios WHERE usuario = ?', ['admin']);
  if (rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.execute(
      'INSERT INTO usuarios (usuario, password_hash, nombre, rol) VALUES (?, ?, ?, ?)',
      ['admin', hash, 'Administrador', 'admin']
    );
  }
  return pool;
}

function getPool() {
  if (!pool) throw new Error('La base de datos no ha sido inicializada');
  return pool;
}

module.exports = { initDB, getPool };