from locust import HttpUser, TaskSet, task, between, LoadTestShape
import json
from threading import Lock

# Cargar las métricas recolectadas desde el JSON
with open("metricas_recolectadas.json", "r") as archivo:
    metricas = json.load(archivo)

indice_envio = 0
lock = Lock()

class EnvioMetricas(TaskSet):
    @task
    def enviar_metricas(self):
        global indice_envio

        with lock:
            if indice_envio < len(metricas):
                data = metricas[indice_envio]
                indice_envio += 1
            else:
                self.interrupt()

        with self.client.post("/traffic-split", json=data, catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Error al enviar: {response.status_code}")

class UsuarioEnvio(HttpUser):
    tasks = [EnvioMetricas]
    wait_time = between(1, 4)  

class CargaProgresiva(LoadTestShape):
    max_users = 150
    spawn_rate = 1  

    def tick(self):
        run_time = self.get_run_time()
        if run_time < self.max_users:
            return (run_time, self.spawn_rate)  
        else:
            return (self.max_users, 0)  
