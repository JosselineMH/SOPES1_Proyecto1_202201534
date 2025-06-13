# Manual Técnico 

### Script: `stress_containers.sh`

Despliega de 10 contenedores Docker diseñados para generar carga sobre la CPU y la RAM. 

#### Funcionamiento

1. **Opciones de estrés**

   Se establecen dos configuraciones posibles:

   * Estrés sobre CPU: Genera una carga con 1 hilo de CPU durante 60 segundos.

   * Estrés sobre RAM: Genera carga con 2 procesos de uso de memoria, cada uno de 256 MB    
     durante 60 segundos.
 

   Código:

   ```bash
   OPTIONS=(
       "--cpu 1 --timeout 60s"
       "--vm 2 --vm-bytes 256M --timeout 60s"
   )
   ```

2. **Bucle para crear 10 contenedores**

   El script recorre un ciclo de 1 a 10 para generar 10 contenedores con configuraciones aleatorias.

   Código:

   ```bash
   for i in {1..10}; do
   ```

3. **Selección aleatoria de tipo de estrés**

   Se escoge una de las dos opciones definidas previamente de manera aleatoria.

   Código:

   ```bash
   RANDOM_INDEX=$((RANDOM % 2))
   OPTION="${OPTIONS[$RANDOM_INDEX]}"
   ```

4. **Construcción del nombre del contenedor**

   Se define el tipo (`cpu` o `vm`) a partir de la opción seleccionada, y se genera un identificador aleatorio de 8 caracteres para evitar colisiones de nombres.

   Código:

   ```bash
   TYPE=$(echo "$OPTION" | awk '{print $1}' | sed 's/--//')
   RANDOM_ID=$(cat /dev/urandom | tr -dc 'a-z0-9' | head -c 8)
   CONTAINER_NAME="stress_${TYPE}_${RANDOM_ID}"
   ```

5. **Ejecución del contenedor**

   Se lanza el contenedor en segundo plano utilizando la imagen `containerstack/alpine-stress` y se le pasa el comando de estrés como parámetro.

   Código:

   ```bash
   docker run -d --name "$CONTAINER_NAME" containerstack/alpine-stress sh -c "exec stress $OPTION"
   echo "Contenedor creado: $CONTAINER_NAME con opción $OPTION"
   ```
---

### Script: `install_modules.sh`

Instala y carga de módulos personalizados del kernel de Linux de la monitorización de CPU y RAM. 


1. **Cambio de directorio**
   Cambia al directorio `../kernel_modules` donde se encuentran los archivos `.c`, el `Makefile` y la configuración de los módulos.

   ```bash
   cd ../kernel_modules || exit 1
   ```

2. **Eliminación de módulos previos**
   Elimina los módulos si ya están cargados, para evitar errores de duplicación al insertar.

   ```bash
   sudo rmmod ram_202201534 2>/dev/null
   sudo rmmod cpu_202201534 2>/dev/null
   ```
   La salida de errores apunta a `/dev/null` para evitar mensajes innecesarios si los módulos no estaban cargados.

3. **Compilación de módulos**
   Elimina binarios previos y compila los módulos con `make`.

   ```bash
   make clean
   make
   ```

4. **Carga de módulos**
   Inserta los módulos compilados en el kernel usando `insmod`.

   ```bash
   sudo insmod ram_202201534.ko
   sudo insmod cpu_202201534.ko
   ```
---

### Script: `clean_containers.sh`

Elimina todos los contenedores Docker que fueron creados para realizar pruebas de estrés al sistema con nombre que comienza con `stress_`.

1. **Eliminación de contenedores**
   Ejecuta el comando `docker rm -f` para forzar la eliminación de todos los contenedores cuyo nombre coincida con el patrón `stress_*`.

   * `docker ps -aq`: lista los IDs de todos los contenedores, sin importar su estado.
   * `--filter "name=stress_"`: filtra solo aquellos cuyo nombre contiene `stress_`.
   * `docker rm -f`: elimina los contenedores forzadamente (aunque estén en ejecución).


---

### Módulo del Kernel `cpu_202201534`

Calcula el porcentaje de uso de la CPU del sistema durante un intervalo de 2 segundos, utilizando los contadores proporcionados por el kernel.

1. **Lectura inicial**: Se obtiene el estado actual de los contadores de tiempo de CPU (`user`, `nice`, `system`, `idle`, `iowait`, `irq`, `softirq`) desde `kcpustat_cpu(0)`.

2. **Espera**: El módulo duerme durante 2 segundos (`msleep(2000)`).

3. **Lectura posterior**: Se realiza una segunda lectura de los mismos contadores.

4. **Cálculo**:

   * Se calcula el tiempo "usado" (sumatoria de `user`, `nice`, `system`, `irq`, `softirq`) y el tiempo "total" (usado + `idle` + `iowait`) para ambos momentos.
   * A partir de estas lecturas, se calcula el cambio (`delta`) en el tiempo usado y total.
   * Se determina el porcentaje de uso como:

     $$
     \text{porcentaje} = \frac{\text{delta\_used} \times 100}{\text{delta\_total}}
     $$

---

### Módulo del Kernel `ram_202201534`

Obtiene información del uso de la memoria RAM del sistema directamente desde el espacio del kernel.

1. **Obtención de información de RAM**
   Dentro de la función `ram_show`, se utiliza la función `si_meminfo()` que llena una estructura `sysinfo` con información sobre la memoria actual del sistema:

   ```c
   struct sysinfo info;
   si_meminfo(&info);
   ```

2. **Cálculo de valores**
   Se realizan los cálculos necesarios para presentar los datos en megabytes (MB) y porcentaje de uso:

   ```c
   total = info.totalram * info.mem_unit / (1024 * 1024);
   libre = info.freeram * info.mem_unit / (1024 * 1024);
   usado = total - libre;
   porcentaje = (usado * 100) / total;
   ```
---

## Monitor en go para la recolección de métricas de CPU y RAM

Se encarga de leer periódicamente los archivos del sistema `/proc/cpu_202201534` y `/proc/ram_202201534`, generados por los módulos del kernel, para enviar sus métricas a una API en node.js

Se definen dos estructuras para representar las métricas obtenidas:

* `MetricaCPU`

  * `tipo`: identificador "cpu"
  * `porcentajeUso`: porcentaje actual de uso de CPU

* `MetricaRAM`

  * `tipo`: identificador "ram"
  * `total`: memoria total del sistema
  * `libre`: memoria libre
  * `uso`: memoria usada
  * `porcentaje`: porcentaje de uso de RAM

---
1. **Lectura de datos desde `/proc`**
   Se utilizan las funciones `leerCPU()` y `leerRAM()` para leer y deserializar el contenido JSON de los archivos del sistema expuestos por los módulos del kernel.

2. **Recolección**
   Se usa un ciclo infinito de recolección (`recolectar()`) para:

   * Lee los datos de RAM y CPU en paralelo.
   * Usar un canal para sincronizar los resultados.
   * Si la lectura fue exitosa, envía los datos al servidor API mediante `enviarMetrica()`.

3. **Envío de métricas**
   La función `enviarMetrica()` convierte la estructura en JSON y la envía a través de una solicitud HTTP POST.

4. **Servidor web integrado**
   Se levanta un servidor HTTP con dos rutas:

   * `/status`: responde con texto indicando que el cliente está activo.
   * `/metricas`: devuelve la última métrica de CPU y RAM recolectada, en formato JSON.

---
### Variables de entorno

* `API_URL`: permite definir una URL personalizada para el endpoint receptor de métricas, se utiliza `http://localhost:3000/metricas`.

---

## API Node.js – `index.js`

Archivo principal del servidor que recibe y almacena métricas de CPU y RAM en una base de datos PostgreSQL.

---

### Dependencias y configuración inicial

```js
const express = require("express");
const cors = require("cors");
const setupDatabase = require("./db/setup");
const pool = require("./db");
```

1. **Inicialización del servidor**

   * Se instancia Express.
   * Se define el puerto de escucha como `3000`.
   * Se habilita CORS para permitir solicitudes externas.
   * Se habilita el middleware para procesar JSON.
   * Se ejecuta `setupDatabase()` para asegurar que las tablas estén creadas.

   ```js
   const app = express();
   const PORT = 3000;
   const metricas = [];

   app.use(cors());
   app.use(express.json());

   setupDatabase();
   ```

---

### Ruta: `POST /metricas`

Recibe una métrica desde el recolector Go y la almacena en PostgreSQL.

1. **Preparación de datos**

   * Se agrega un `timestamp` con la fecha y hora actual.
   * La métrica se almacena temporalmente en el arreglo en memoria `metricas`.

   ```js
   const timestamp = new Date();
   const metricaConTimestamp = { ...data, timestamp };
   metricas.push(metricaConTimestamp);
   ```

2. **Almacenamiento en base de datos**

   * Para `ram`:

     * Se convierte el valor a GB (`/1024`) y se redondea a 2 decimales.
     * Se insertan `total`, `libre`, `uso`, `porcentaje` y `timestamp`.

   * Para `cpu`:

     * Se inserta únicamente `porcentajeUso` y `timestamp`.

   ```js
   if (data.tipo === "ram") {
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
   ```

### Ruta: `GET /metricas`

Devuelve la métrica más reciente de CPU y RAM almacenada en memoria.

1. **Búsqueda de últimas métricas**

   * Se invierte el arreglo `metricas` para obtener los valores más recientes.
   * Se filtran las últimas métricas por tipo (`ram` y `cpu`).

   ```js
   const reversed = [...metricas].reverse();
   const ultimaRAM = reversed.find(m => m.tipo === 'ram');
   const ultimaCPU = reversed.find(m => m.tipo === 'cpu');
   ```
---

## Configuración de la Base de Datos 

### `setup.js`

Se encarga de asegurar que las tablas necesarias para almacenar las métricas estén creadas antes de que la API comience a funcionar.

---

1. **Importación de dependencias**

   * `fs`: permite leer archivos del sistema.
   * `path`: gestiona rutas del sistema de archivos.
   * `pool`: conexión a PostgreSQL.


2. **Esperar conexión a PostgreSQL**

   Función `waitForPostgresReady` intenta conectarse a la base de datos hasta 10 veces, con 3 segundos de espera entre cada intento.

   ```js
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
   ```

3. **Creación de las tablas**

   Si la conexión es exitosa, lee el contenido del archivo SQL y lo ejecuta directamente con `pool.query`.

   ```js
   const sql = fs.readFileSync(path.join(__dirname, '../sql/tables.sql'), 'utf8');
   await pool.query(sql);
   ```

---

### `index.js` (Conexión a PostgreSQL)

Configura y exporta la conexión a la base de datos PostgreSQL usando las variables definidas en `.env`.

### `tables.sql`

Contiene las sentencias SQL necesarias para crear las tablas `metricas_ram` y `metricas_cpu` si no existen.

---

## Frontend – Visualización de métricas

### Componente: `ApexChartCard.jsx`

Es reutilizable y recibe como propiedades la información para representar una gráfica circular con métricas del sistema.


### Componente: `Dashboard.jsx`

Este es el componente principal que consume la API de métricas y muestra las gráficas para RAM y CPU usando `ApexChartCard`.

1. **Carga de datos**

   Utiliza `fetch()` para obtener las métricas desde `http://localhost:3000/metricas`. Refresca cada 5 segundos automáticamente mediante `setInterval`.

   ```js
   const interval = setInterval(fetchMetricas, 5000);
   ```

2. **Procesamiento de la respuesta**

   La respuesta es un arreglo de objetos tipo RAM y CPU, desde el cual se extrae la última lectura de cada uno.

3. **Visualización**

   Se muestran dos tarjetas:

   * **RAM**: muestra `uso`, `libre` y `total` en GB.
   * **CPU**: muestra porcentaje de uso vs porcentaje libre.
---
