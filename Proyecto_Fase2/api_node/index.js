require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Middleware para logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Endpoint para insertar métricas
app.post('/insertar-metrica', (req, res) => {
  console.log('Datos recibidos:', req.body);

  const {
    total_ram,
    ram_libre,
    uso_ram,
    porcentaje_ram,
    porcentaje_cpu_uso,
    porcentaje_cpu_libre,
    procesos_corriendo,
    total_procesos,
    procesos_durmiendo,
    procesos_zombie,
    procesos_parados,
    hora
  } = req.body;


  const campos = {
    total_ram,
    ram_libre,
    uso_ram,
    porcentaje_ram,
    porcentaje_cpu_uso,
    porcentaje_cpu_libre,
    procesos_corriendo,
    total_procesos,
    procesos_durmiendo,
    procesos_zombie,
    procesos_parados
  };

  const camposFaltantes = Object.entries(campos)
    .filter(([_, value]) => value === undefined || value === null)
    .map(([key]) => key);

  if (camposFaltantes.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Faltan campos requeridos: ${camposFaltantes.join(', ')}`
    });
  }

  const sql = `
    INSERT INTO metricas (
      total_ram, ram_libre, uso_ram, porcentaje_ram,
      porcentaje_cpu_uso, porcentaje_cpu_libre,
      procesos_corriendo, total_procesos,
      procesos_durmiendo, procesos_zombie, procesos_parados, api ,hora
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const horaFinal = hora || new Date();

  const values = [
    total_ram, ram_libre, uso_ram, porcentaje_ram,
    porcentaje_cpu_uso, porcentaje_cpu_libre,
    procesos_corriendo, total_procesos,
    procesos_durmiendo, procesos_zombie, procesos_parados, "NODEJS", horaFinal
  ];

  console.log('Ejecutando query con valores:', values);

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error al insertar:', err);
      return res.status(500).json({
        success: false,
        message: 'Error al insertar datos',
        error: err.message
      });
    }

    console.log('Métrica insertada correctamente. ID:', result.insertId);
    res.status(201).json({
      success: true,
      message: 'Métrica insertada correctamente',
      insertId: result.insertId,
      affectedRows: result.affectedRows
    });
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'API Node.js funcionando correctamente',
    timestamp: new Date().toISOString()
  });
});

app.get('/test-db', (req, res) => {
  db.query('SELECT COUNT(*) as total FROM metricas', (err, results) => {
    if (err) {
      console.error('Error al consultar DB:', err);
      return res.status(500).json({
        success: false,
        message: 'Error al conectar con la base de datos',
        error: err.message
      });
    }

    res.json({
      success: true,
      message: 'Conexión a DB exitosa',
      total_registros: results[0].total
    });
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint no encontrado'
  });
});

app.use((err, req, res, next) => {
  console.error('Error no manejado:', err);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`API Node.js escuchando en puerto ${PORT}`);
  console.log(`   POST http://localhost:${PORT}/insertar-metrica`);
  console.log(`   GET  http://localhost:${PORT}/health`);
  console.log(`   GET  http://localhost:${PORT}/test-db`);
});
