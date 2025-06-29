const express = require('express');
const path = require('path');

const app = express();
const port = process.env.PORT;

// Servir archivos estáticos desde la carpeta build
app.use(express.static(path.join(__dirname, 'build')));

// Manejar todas las rutas y devolver index.html (para React Router)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Servidor corriendo en http://0.0.0.0:${port}`);
  console.log(`Sirviendo archivos desde: ${path.join(__dirname, 'build')}`);
});