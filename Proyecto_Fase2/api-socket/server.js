require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const socketIo = require('socket.io');
const db = require('./db');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"],
  }
});

const PORT = process.env.PORT ;

io.on('connection', socket => {
  console.log('Cliente conectado via Socket.IO');

  const interval = setInterval(() => {
    db.query('SELECT * FROM metricas ORDER BY hora DESC LIMIT 1', (err, results) => {
      if (err) {
        console.error('Error al consultar métricas:', err);
        return;
      }

      if (results.length > 0) {
        const row = results[0];
        socket.emit('metricas', {
          ram: {
            total: row.total_ram,
            libre: row.ram_libre,
            uso: row.uso_ram,
            porcentaje: row.porcentaje_ram
          },
          cpu: {
            porcentajeUso: row.porcentaje_cpu_uso,
            porcentajeLibre: row.porcentaje_cpu_libre
          },
          procesos: {
            ejecucion: row.procesos_corriendo,
            total: row.total_procesos,
            dormido: row.procesos_durmiendo,
            zombie: row.procesos_zombie,
            detenido: row.procesos_parados
          },
          hora: row.hora
        });
      }
    });
  }, 5000);

  socket.on('disconnect', () => {
    clearInterval(interval);
    console.log('Cliente desconectado');
  });
});

server.listen(PORT, () => {
  console.log(`API WebSocket escuchando en http://localhost:${PORT}`);
});
