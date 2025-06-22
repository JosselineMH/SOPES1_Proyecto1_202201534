const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

const metricas = []; 

app.use(cors());
app.use(express.json());


app.post("/metricas", (req, res) => {
  const data = req.body;

  if (!data || !data.tipo) {
    return res.status(400).json({ success: false, message: "Datos inválidos" });
  }

  const timestamp = new Date();
  const metricaConTimestamp = { ...data, timestamp };
  metricas.push(metricaConTimestamp);

  console.log("Métrica recibida:", metricaConTimestamp);
  return res.status(200).json({ success: true, message: "Métrica recibida" });
});


app.get("/metricas", (req, res) => {
  const reversed = [...metricas].reverse();
  const ultimaRAM = reversed.find(m => m.tipo === 'ram');
  const ultimaCPU = reversed.find(m => m.tipo === 'cpu');
  const ultimaProc = reversed.find(m => m.tipo === 'procesos');

  const respuesta = [];
  if (ultimaRAM) respuesta.push(ultimaRAM);
  if (ultimaCPU) respuesta.push(ultimaCPU);
  if (ultimaProc) respuesta.push(ultimaProc);

  return res.json(respuesta);
});

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
