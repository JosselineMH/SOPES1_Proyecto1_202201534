const express = require("express");
const cors = require("cors");
const setupDatabase = require("./db/setup");
const pool = require("./db");

const app = express();
const PORT = 3000;

const metricas = []; 

app.use(cors());
app.use(express.json());

setupDatabase();

app.post("/metricas", async (req, res) => {
  const data = req.body;

  if (!data || !data.tipo) {
    return res.status(400).json({ success: false, message: "Datos inválidos" });
  }

  const timestamp = new Date();
  const metricaConTimestamp = { ...data, timestamp };
  metricas.push(metricaConTimestamp);

  try {
    if (data.tipo === "ram") {
      // Convertir a GB y redondear a 2 decimales
      const totalGB = +(data.total / 1024).toFixed(2);
      const libreGB = +(data.libre / 1024).toFixed(2);
      const usoGB = +(data.uso / 1024).toFixed(2);

      await pool.query(
        `INSERT INTO metricas_ram (total, libre, uso, porcentaje, timestamp)
         VALUES ($1, $2, $3, $4, $5)`,
        [totalGB, libreGB, usoGB, data.porcentaje, timestamp]
      );
    } else if (data.tipo === "cpu") {
      await pool.query(
        `INSERT INTO metricas_cpu (porcentajeUso, timestamp)
         VALUES ($1, $2)`,
        [data.porcentajeUso, timestamp]
      );
    }

    console.log("Métrica almacenada:", metricaConTimestamp);
    return res.status(200).json({ success: true, message: "Métrica recibida y almacenada" });
  } catch (err) {
    console.error("Error al guardar en la BD:", err);
    return res.status(500).json({ success: false, message: "Error interno del servidor" });
  }
});

app.get("/metricas", (req, res) => {
  const reversed = [...metricas].reverse();
  const ultimaRAM = reversed.find(m => m.tipo === 'ram');
  const ultimaCPU = reversed.find(m => m.tipo === 'cpu');

  const respuesta = [];
  if (ultimaRAM) respuesta.push(ultimaRAM);
  if (ultimaCPU) respuesta.push(ultimaCPU);

  return res.json(respuesta);
});

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
