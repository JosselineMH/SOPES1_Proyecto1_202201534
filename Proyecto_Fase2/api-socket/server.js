require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*", // o el dominio del frontend
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});


const PORT = process.env.PORT;

app.use(cors());
app.use(express.json());

const ConfigBD = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
};

// Establecer conexión a la base de datos
async function EstablecerConexionBD() {
  try {
    const ConexionBD = await mysql.createConnection(ConfigBD);
    return ConexionBD;
  } catch (error) {
    console.error('Error Conectando a La Base De Datos:', error.message);
    throw error;
  }
}

async function ObtenerUltimasMetricas() {
  let ConexionBD;
  try {
    ConexionBD = await EstablecerConexionBD();
    const [rows] = await ConexionBD.execute(
        `SELECT * FROM metricas ORDER BY hora DESC LIMIT 1`
    );
    return rows;
  } catch (error) {
    console.error('Error Al Obtener métricas:', error.message);
    return [];
  } finally {
    if (ConexionBD) await ConexionBD.end();
  }
}

// WebSocket - CORREGIDO
io.on('connection', (socket) => {
  console.log('Cliente Conectado Vía WebSocket:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente Desconectado:', socket.id);
  });
});


async function EnviarMetricas() {
    const metricas = await ObtenerUltimasMetricas();
    
    if (metricas.length === 0) {
        console.log('No Hay Métricas En La Base De Datos');
        return;
    }

    io.emit('nueva-metrica', metricas);

}

setInterval(() => {
  EnviarMetricas();
}, 1000);

// Iniciar servidor
server.listen(PORT, () => {
  console.log(`API WebSocket escuchando en http://localhost:${PORT}`);
});
