CREATE TABLE IF NOT EXISTS metricas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    total_ram FLOAT,
    ram_libre FLOAT,
    uso_ram FLOAT,
    porcentaje_ram FLOAT,
    porcentaje_cpu_uso FLOAT,
    porcentaje_cpu_libre FLOAT,
    procesos_corriendo INT,
    total_procesos INT,
    procesos_durmiendo INT,
    procesos_zombie INT,
    procesos_parados INT,
    api VARCHAR(255) NOT NULL,
    hora DATETIME
);
