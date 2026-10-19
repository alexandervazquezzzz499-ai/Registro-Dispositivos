require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB_NAME = process.env.DB_NAME || 'dispositivos_db';

let pool = null;

async function initDB() {
  // 1. Crear la base de datos si no existe (conexión sin base de datos)
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();

  // 2. Crear pool de conexiones
pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: DB_NAME,
  port: process.env.DB_PORT || 4000,
  // Forzamos explícitamente la conexión TLS
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
  // 3. Crear tablas
  await pool.query(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      usuario VARCHAR(50) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      nombre VARCHAR(100) NOT NULL,
      rol ENUM('admin', 'tecnico') DEFAULT 'tecnico' NOT NULL,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS dispositivos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      tipo VARCHAR(50) NOT NULL,
      marca VARCHAR(100),
      modelo VARCHAR(100),
      serial VARCHAR(100),
      ubicacion VARCHAR(150),
      estado VARCHAR(50) NOT NULL,
      creado_por INT,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
    )
  `);

  // 4. Crear usuario admin por defecto si no existe
  const [rows] = await pool.execute('SELECT id FROM usuarios WHERE usuario = ?', ['admin']);
  if (rows.length === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    await pool.execute(
      'INSERT INTO usuarios (usuario, password_hash, nombre, rol) VALUES (?, ?, ?, ?)',
      ['admin', hash, 'Administrador', 'admin']
    );
    console.log('✅ Usuario admin creado → usuario: admin | contraseña: admin123');
    console.log('⚠️  Cambia la contraseña después del primer login.');
  }

  return pool;
}

function getPool() {
  if (!pool) throw new Error('La base de datos no ha sido inicializada');
  return pool;
}

module.exports = { initDB, getPool };