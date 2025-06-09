const fs = require('fs');
const path = require('path');
const pool = require('./index');

async function waitForPostgresReady(retries = 10, delay = 3000) {
  for (let i = 0; i < retries; i++) {
    try {
      await pool.query('SELECT 1');
      return true;
    } catch (err) {
      console.log(`Postgres aún no está listo. Reintentando en ${delay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('No se pudo conectar a Postgres después de varios intentos.');
}

async function setupDatabase() {
  try {
    await waitForPostgresReady();
    const sql = fs.readFileSync(path.join(__dirname, '../sql/tables.sql'), 'utf8');
    await pool.query(sql);
    console.log('Tablas creadas correctamente');
  } catch (err) {
    console.error('Error al crear tablas:', err);
  }
}

module.exports = setupDatabase;
