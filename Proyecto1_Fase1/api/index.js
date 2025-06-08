
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

  console.log("Métrica recibida:", data);
  metricas.push({ ...data, timestamp: new Date() });

  return res.status(200).json({ success: true, message: "Métrica almacenada" });
});

app.get("/metricas", (req, res) => {
  res.json(metricas);
});

app.listen(PORT, () => {
  console.log(`API escuchando en http://localhost:${PORT}`);
});
