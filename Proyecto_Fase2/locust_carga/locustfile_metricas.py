from locust import HttpUser, TaskSet, task, between
import json
import time
from threading import Lock

metricas_guardadas = []
lock = Lock()
tiempo_inicio = time.time()
archivo_guardado = False

class UsuarioSimulado(TaskSet):
    @task
    def obtener_metricas(self):
        global tiempo_inicio, archivo_guardado

        with self.client.get("/metricas", catch_response=True) as response:
            if response.status_code == 200:
                try:
                    data = response.json()
                    with lock:
                        metricas_guardadas.append(data)
                except json.JSONDecodeError:
                    response.failure("Respuesta no es JSON válido")
            else:
                response.failure(f"Fallo con status {response.status_code}")

      
        if not archivo_guardado and (time.time() - tiempo_inicio > 180):
            with lock:
                with open("metricas_recolectadas.json", "w") as archivo:
                    json.dump(metricas_guardadas, archivo, indent=4)
                print("Archivo guardado automáticamente tras 3 minutos.")
                archivo_guardado = True

      
        if time.time() - tiempo_inicio > 185:  
            self.interrupt()

class Usuario(HttpUser):
    tasks = [UsuarioSimulado]
    wait_time = between(1, 2)
