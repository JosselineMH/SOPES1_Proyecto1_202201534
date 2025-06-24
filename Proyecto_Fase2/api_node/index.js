require('dotenv').config();
const express = require('express');
const db = require('./db');
const app = express();

app.use(express.json());

app.post('/insertar-metrica', (req, res) => {
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

  const sql = `
    INSERT INTO metricas (
      total_ram, ram_libre, uso_ram, porcentaje_ram,
      porcentaje_cpu_uso, porcentaje_cpu_libre,
      procesos_corriendo, total_procesos,
      procesos_durmiendo, procesos_zombie, procesos_parados, hora
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    total_ram, ram_libre, uso_ram, porcentaje_ram,
    porcentaje_cpu_uso, porcentaje_cpu_libre,
    procesos_corriendo, total_procesos,
    procesos_durmiendo, procesos_zombie, procesos_parados, hora
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Error al insertar:', err);
      return res.status(500).json({ success: false, message: 'Error al insertar datos' });
    }
    res.status(200).json({ success: true, message: 'Métrica insertada correctamente' });
  });
});

app.listen(process.env.PORT, () => {
  console.log(`API Node.js escuchando en puerto ${process.env.PORT}`);
});
