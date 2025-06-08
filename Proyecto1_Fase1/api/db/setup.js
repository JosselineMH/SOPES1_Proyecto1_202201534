const fs = require('fs');
const path = require('path');
const pool = require('./index');

async function setupDatabase() {
  try {
    const sql = fs.readFileSync(path.join(__dirname, '../sql/tables.sql'), 'utf8');
    await pool.query(sql);
    console.log('Tablas creadas correctamente');
  } catch (err) {
    console.error('Error al crear tablas:', err);
  }
}

module.exports = setupDatabase;
