# Manual Técnico - Proyecto Fase 2  
**Monitoreo Cloud de Máquinas Virtuales**  

**Estudiante**: Josseline Griselda Montecinos Hernández
**Carné**: 202201534 

---

## 1. Arquitectura General

Resumen general de la arquitectura implementada:

- **Kubernetes en Google Cloud Platform (GCP)** para la orquestación de contenedores.
- **Contenedores de APIs** desarrolladas en Python y NodeJS.
- **Canal de WebSocket** mediante una API adicional en NodeJS para conexión en tiempo real.
- **Locust** como herramienta de generación de tráfico, ejecutado localmente.
- **Cloud SQL** como base de datos relacional gestionada en GCP.
- **Cloud Run** para el despliegue del frontend realizado en React.
- **Módulos del kernel** escritos en C para la obtención de métricas del sistema desde la VM.
- **Traffic Split** configurado para distribuir el tráfico en dos rutas principales (API Python y API NodeJS).
---

## 2. Módulo del Kernel - procesos_202201534.c

 Módulo fue desarrollado en C para ejecutarse dentro del kernel de Linux. Su función es obtener información en tiempo real sobre los procesos activos del sistema y clasificarlos por su estado. Forma parte del sistema de monitoreo y proporciona los datos base que serán utilizados en las APIs y visualizados en la interfaz web.


### Funcionalidad

El módulo recorre la lista global de procesos del sistema utilizando `for_each_process` y clasifica cada uno de ellos en las siguientes categorías:

* **procesos\_corriendo**: procesos en estado de ejecución (`TASK_RUNNING`).
* **procesos\_durmiendo**: procesos en espera (`TASK_INTERRUPTIBLE`, `TASK_UNINTERRUPTIBLE`) o no categorizables directamente.
* **procesos\_zombie**: procesos finalizados pero aún registrados (`EXIT_ZOMBIE`).
* **procesos\_parados**: procesos detenidos (`TASK_STOPPED` o `__TASK_STOPPED`).
* **total\_procesos**: conteo total de procesos observados.

El resultado se imprime en formato JSON mediante `seq_printf` dentro del archivo `/proc/procesos_202201534`.

### Resultado esperado

Al cargar el módulo con `insmod`, el archivo `/proc/procesos_202201534` estará disponible y al consultarlo con `cat`, se obtendrá un JSON similar al siguiente:

```json
{
  "procesos_corriendo": 8,
  "total_procesos": 120,
  "procesos_durmiendo": 100,
  "procesos_zombie": 2,
  "procesos_parados": 10
}
```
---

## 3. Agente de Monitoreo - monitoring\_agent

Desarrollado en lenguaje Go y su función principal es recolectar, unificar y exponer las métricas obtenidas por los módulos del kernel desde los archivos ubicados en el sistema de archivos `/proc`.Se ejecuta de forma continua dentro de un contenedor y actúa como una fuente de datos centralizada para las APIs encargadas de registrar dicha información en la base de datos.

### Funcionalidad

El programa realiza las siguientes operaciones:

1. **Lectura periódica** de los archivos `/proc/cpu_202201534`, `/proc/ram_202201534` y `/proc/procesos_202201534`, que contienen métricas del sistema como uso de CPU, uso de memoria y estados de procesos, respectivamente.
2. **Unificación de métricas** en una estructura común `MetricaCompleta`.
3. **Exposición del último registro** como una respuesta en formato JSON mediante un servidor HTTP local, accesible desde el endpoint `/metricas`.

Este agente es ejecutado dentro de un contenedor Docker y consultado por Locust para generar tráfico o por las APIs para registrar los datos en la base de datos.

### Resultado esperado

```json
{
  "total_ram": 2072,
  "ram_libre": 1110552576,
  "uso_ram": 442,
  "porcentaje_ram": 22,
  "porcentaje_cpu_uso": 22,
  "porcentaje_cpu_libre": 78,
  "procesos_corriendo": 123,
  "total_procesos": 233,
  "procesos_durmiendo": 65,
  "procesos_zombie": 2,
  "procesos_parados": 4,
  "hora": "2025-06-17 02:21:54"
}
```
---

## 4. Generador de Tráfico - locust\_carga

La generación de tráfico se realiza utilizando **Locust**,se emplea para dos propósitos principales:

1. **Recolección de métricas desde la VM**.
2. **Envío masivo de métricas al servicio de Ingress para simular tráfico**.


### 4.1 Recolección de métricas – `locustfile_metricas.py`

Este script realiza múltiples peticiones GET al endpoint del agente de monitoreo (`/metricas` en el puerto 6000) para recolectar métricas del sistema y almacenarlas localmente en un archivo `metricas_recolectadas.json`.

**Comando de ejecución**:

```bash
locust -f locustfile_metricas.py --host=http://34.171.75.113:6000 -u 300 -r 1 --headless -t 185s
```

**Parámetros utilizados**:

* `-u 300`: número de usuarios virtuales.
* `-r 1`: tasa de generación de usuarios por segundo.
* `--host`: dirección IP pública de la VM en GCP.
* `-t 185s`: duración total de la prueba.
* `--headless`: ejecución sin interfaz gráfica.

Durante esta fase se obtienen más de 2000 registros que luego serán utilizados como base para las pruebas de envío.

---

### 4.2 Envío de métricas – `locustfile_envio.py`

Este script lee los datos previamente recolectados desde `metricas_recolectadas.json` y realiza múltiples solicitudes POST al endpoint `/insertar` del servicio expuesto por el **Ingress** en Kubernetes.

El tráfico es automáticamente dividido en un 50% para cada una de las rutas (Python y NodeJS) mediante el mecanismo de **traffic split** configurado en el Ingress.

**Comando de ejecución**:

```bash
locust -f locustfile_envio.py --host=http://34.28.204.8 -u 150 -r 1 --headless -t 30s
```

**Parámetros utilizados**:

* `-u 150`: número de usuarios virtuales.
* `-r 1`: tasa de usuarios por segundo.
* `--host`: dirección IP pública del Ingress en GCP.
* `--headless`: ejecución en modo consola.
* `-t 30s`: duración de la prueba de envío.

---

## 5. API de Inserción – api\_python

Desarrollada utilizando **Flask** en Python. Su función principal es recibir peticiones POST con los datos recolectados desde el agente de monitoreo y almacenarlos en una base de datos **MySQL** alojada en **Cloud SQL**. Esta API representa la primera ruta del sistema (Ruta 1) y forma parte del esquema de traffic split implementado en Kubernetes.

### Variables de entorno

El archivo `.env` contiene las credenciales necesarias para la conexión con la base de datos. Estas variables se cargan automáticamente.

```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=metricas_db
DB_USER=root
DB_PASSWORD=123
```

Estas variables son suministradas por Kubernetes y en el pod de la api ya se sobreescribe el valor real del host.

### Funcionalidad

La API define los siguientes endpoints:

#### `/insertar` – POST

Recibe un JSON con la estructura de métricas recolectadas y realiza la inserción en la tabla `metricas`. El campo `"api"` se fija internamente como `"PYTHON"` para permitir la trazabilidad.

**inserción:**

```python
query = """
INSERT INTO metricas (
    total_ram, ram_libre, uso_ram, porcentaje_ram,
    porcentaje_cpu_uso, porcentaje_cpu_libre, procesos_corriendo,
    total_procesos, procesos_durmiendo, procesos_zombie,
    procesos_parados, api ,hora
) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
"""

valores = (
    data["total_ram"],
    data["ram_libre"],
    data["uso_ram"],
    data["porcentaje_ram"],
    data["porcentaje_cpu_uso"],
    data["porcentaje_cpu_libre"],
    data["procesos_corriendo"],
    data["total_procesos"],
    data["procesos_durmiendo"],
    data["procesos_zombie"],
    data["procesos_parados"],
    "PYTHON",
    datetime.now()
)
```

---
#### `/test-conexion` – GET

Permite verificar si la conexión a la base de datos está activa y válida. Retorna el listado de tablas, estructura de la tabla `metricas` y cantidad de registros insertados.

---

## 6. API de Inserción – api\_node

Su función es recibir datos en formato JSON provenientes del generador de tráfico y almacenarlos en la base de datos MySQL ubicada en **Cloud SQL**. Esta implementación corresponde a la **Ruta 2**, y funciona en paralelo con la API Python, distribuyendo el tráfico de forma equitativa mediante el Ingress Controller y Traffic Split.

### Variables de entorno

Archivo `.env` con los datos de conexión a la base de datos y puerto de ejecución de la API:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=123
DB_NAME=metricas_db
DB_PORT=3306
PORT=3000
```

---

### Funcionalidad

#### `/insertar` – POST

Este endpoint recibe una estructura de métricas en formato JSON y las inserta en la tabla `metricas`. Internamente se registra el origen como `"NODEJS"`.

Antes de ejecutar la inserción, el código valida que no falte ningún campo obligatorio.

**Fragmento de código relevante:**

```javascript
const sql = `
  INSERT INTO metricas (
    total_ram, ram_libre, uso_ram, porcentaje_ram,
    porcentaje_cpu_uso, porcentaje_cpu_libre,
    procesos_corriendo, total_procesos,
    procesos_durmiendo, procesos_zombie, procesos_parados, api, hora
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const values = [
  total_ram, ram_libre, uso_ram, porcentaje_ram,
  porcentaje_cpu_uso, porcentaje_cpu_libre,
  procesos_corriendo, total_procesos,
  procesos_durmiendo, procesos_zombie, procesos_parados,
  "NODEJS", hora || new Date()
];
```
---

#### `/test-db` – GET

Permite verificar la conexión a la base de datos y obtener el número total de registros.

```json
{
  "success": true,
  "message": "Conexión a DB exitosa",
  "total_registros": 2050
}
```
---

## 7. API de Comunicación en Tiempo Real – api-socket

Desarrollada en **Node.js** utilizando **Socket.IO**. Encargada de ofrecer un canal de comunicación en tiempo real entre el backend y el frontend, permitiendo que la interfaz web visualice métricas actualizadas sin necesidad de realizar solicitudes periódicas por parte del cliente.

### Variables de entorno

Configuradas en el archivo `.env` para establecer la conexión con la base de datos MySQL alojada en Cloud SQL:

```env
DB_HOST=34.41.95.190
DB_USER=root
DB_PASSWORD=123
DB_NAME=metricas_db
DB_PORT=3306
PORT=4000
```

---

### Funcionalidad

#### Comunicación en tiempo real

El servidor expone una conexión WebSocket a través del puerto 4000. Una vez conectado un cliente, la API consulta las métricas más recientes cada segundo y las envía automáticamente.

**Principales componentes:**

1. **Establecimiento de conexión WebSocket:**

```javascript
io.on('connection', (socket) => {
  console.log('Cliente Conectado Vía WebSocket:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente Desconectado:', socket.id);
  });
});
```

2. **Consulta periódica a la base de datos:**

```javascript
async function ObtenerUltimasMetricas() {
  const [rows] = await ConexionBD.execute(
    `SELECT * FROM metricas ORDER BY hora DESC LIMIT 1`
  );
  return rows;
}
```

3. **Emisión automática cada segundo:**

```javascript
setInterval(() => {
  EnviarMetricas(); 
}, 1000);
```

---

## 8. Aplicación Web – frontend-react-gcp

La interfaz web fue desarrollada en **React.js** con el objetivo de ser desplegada utilizando **Cloud Run**. Su objetivo principal es mostrar de forma visual las métricas recolectadas en tiempo real. La comunicación con el backend se realiza a través de un canal WebSocket proporcionado por la API `api-socket`.


### Comunicación en tiempo real

La aplicación consume datos enviados por el backend en tiempo real a través de WebSocket. Esto se establece mediante la siguiente línea en `Dashboard.js`:

```javascript
const socket = io(`http://${process.env.REACT_APP_HOST}:${process.env.REACT_APP_PORT}`);
```

Estas variables están definidas en el archivo `.env`:

```env
REACT_APP_HOST=34.71.204.168
REACT_APP_PORT=4000
```

---

### Componentes principales

#### 8.1 `Dashboard.js`

Distribuye las métricas hacia los componentes visuales. Se encarga de recibir y transformar los datos para CPU, RAM y procesos.

* **Métricas de RAM**: uso, libre, porcentaje.
* **Métricas de CPU**: porcentaje de uso.
* **Métricas de procesos**: clasificados por estado (corriendo, durmiendo, zombie, parados).

El estado se actualiza automáticamente con cada nueva emisión del evento `nueva-metrica`.

---

#### 8.2 `ApexChartCard.js`

Este componente utiliza **React ApexCharts** para representar métricas circulares (RAM y CPU) en forma de gráfico de pastel. Muestra valores adicionales como el total de memoria, la cantidad libre y el porcentaje utilizado.

---

#### 8.3 `ProcessChartCard.js`

Utiliza un gráfico radial para representar visualmente los procesos del sistema según su estado.

* **Corriendo**: `procesos_corriendo`
* **Durmiendo**: `procesos_durmiendo`
* **Zombie**: `procesos_zombie`
* **Parados**: `procesos_parados`

Incluye un contador centralizado del total de procesos.

---

## 9. Despliegue en Kubernetes – cluster/

Todo fue desplegado en **Google Kubernetes Engine**. Se utilizaron archivos de configuración en formato YAML.

### 9.1 Namespace

Se crea un entorno aislado para todos los recursos del proyecto:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: so1-fase2
```

---

### 9.2 Secret – db-secret.yaml

Este archivo protege las credenciales de acceso a la base de datos MySQL utilizando un objeto `Secret`.

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
  namespace: so1-fase2
type: Opaque
data:
  DB_PASSWORD: MTIz  
```

---

### 9.3 Despliegue y servicio – api-nodejs.yaml

Implementa la API desarrollada en Node.js, expuesta internamente mediante un servicio `ClusterIP`.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-nodejs
  namespace: so1-fase2
spec:
  replicas: 1
  ...
  containers:
  - name: api-nodejs
    image: josselinemontecinos7/api-node-fase2:latest
    ports:
    - containerPort: 3000
```

```yaml
kind: Service
metadata:
  name: api-nodejs-service
spec:
  selector:
    app: api-nodejs
  ports:
    - port: 80
      targetPort: 3000
  type: ClusterIP
```

---

### 9.4 Despliegue y servicio – api-python.yaml

Implementa la API desarrollada en Python, también expuesta por un servicio interno.

```yaml
kind: Deployment
metadata:
  name: api-python
spec:
  containers:
  - name: api-python
    image: josselinemontecinos7/api-python:latest
    ports:
    - containerPort: 5000
```

```yaml
kind: Service
metadata:
  name: api-python-service
spec:
  ports:
    - port: 80
      targetPort: 5000
```

---

### 9.5 Despliegue y servicio – api-socket.yaml

El WebSocket está expuesto públicamente mediante un servicio tipo `LoadBalancer`.

```yaml
kind: Deployment
metadata:
  name: api-socket
spec:
  containers:
  - name: api-socket
    image: josselinemontecinos7/api-socket-fase2:latest
    ports:
    - containerPort: 4000
```

```yaml
kind: Service
metadata:
  name: api-socket-service
spec:
  ports:
    - port: 4000
      targetPort: 4000
  type: LoadBalancer
```

---

### 9.6 Ingress – tráfico balanceado

#### Tráfico principal: 100% al inicio para Python API

```yaml
metadata:
  name: api-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "false"
spec:
  rules:
  - http:
      paths:
      - path: /insertar
        backend:
          service:
            name: api-python-service
```

#### Traffic split (canary): 50% redirigido a NodeJS

```yaml
metadata:
  name: api-ingress-canary
  annotations:
    nginx.ingress.kubernetes.io/canary: "true"
    nginx.ingress.kubernetes.io/canary-weight: "50"
spec:
  rules:
  - http:
      paths:
      - path: /insertar
        backend:
          service:
            name: api-nodejs-service
```

Esto garantiza que el 50% de las peticiones a `/insertar` se dirijan a la API Python y el otro 50% a la API Node.js.

---

## 10. Configuración de la VM y scripts auxiliares – scripts/

Para facilitar la ejecución del proyecto en la máquina virtual (VM) creada en GCP, se crearon varios scripts y configuraciones. Estos archivos permiten:

* Instalar y verificar los módulos del kernel.
* Ejecutar contenedores de estrés para variar las métricas del sistema.
* Iniciar el agente de monitoreo en Go utilizando Docker Compose.


### 10.1 `install_modules.sh`

Este script automatiza la compilación e instalación de los módulos del kernel desarrollados en C. Además, imprime el contenido resultante de cada archivo `/proc` generado.

**Funciones principales:**

* Ejecuta `make` sobre el directorio `kernel_modules`.
* Inserta los módulos `.ko` correspondientes a RAM, CPU y procesos.
* Valida la carga correcta leyendo los archivos `/proc/ram_202201534`, `/proc/cpu_202201534` y `/proc/procesos_202201534`.

---

### 10.2 `stress_containers.sh`

Script utilizado para generar condiciones de carga artificial en la VM mediante la imagen `polinux/stress`. Esto permite obtener datos variados durante el monitoreo.

* Crea 10 contenedores aleatorios con estrés de CPU o memoria RAM.
* Espera a que finalicen y elimina todos los contenedores con nombre prefijado `stress_`.

---

### 10.3 `docker-compose.yml`

Archivo utilizado para ejecutar el **agente de monitoreo en Go** directamente en la VM, accediendo al sistema de archivos `/proc` de forma segura.

```yaml
version: '3.8'

services:
  monitor-go:
    image: josselinemontecinos7/api-go-monitor
    container_name: monitor_go_fase2
    ports:
      - "6000:6000"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
    privileged: true
    security_opt:
      - "apparmor=unconfined"
      - "seccomp=unconfined"
    environment:
      - PROC_PATH=/host/proc
```
---