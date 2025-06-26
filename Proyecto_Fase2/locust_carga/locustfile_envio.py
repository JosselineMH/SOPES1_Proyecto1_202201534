from locust import HttpUser, task, between, events
import json
import random
import os
import threading

datos_metricas = []

indice_lock = threading.Lock()
indice_global = 0

def cargar_datos():
    """Carga los datos del archivo JSON generado"""
    global datos_metricas
    try:
        with open("metricas_recolectadas.json", "r") as f:
            datos_metricas = json.load(f)
        print(f"Cargados {len(datos_metricas)} registros del archivo JSON")
    except FileNotFoundError:
        print("Error: No se encontró el archivo Metricas_Totales.json")
        exit(1)
    except json.JSONDecodeError:
        print("Error: El archivo JSON no tiene formato válido")
        exit(1)

class TrafficSplitUser(HttpUser):
    wait_time = between(1, 4)
    
    @task
    def send_metrics_to_ingress(self):
        """Envía datos al Ingress - Traffic Split distribuye automáticamente 50/50"""
        global indice_global
        
        if not datos_metricas:
            return
        
        with indice_lock:
            registro = datos_metricas[indice_global % len(datos_metricas)]
            indice_actual = indice_global
            indice_global += 1
        
        with self.client.post("/insertar", 
                             json=registro,
                             headers={"Content-Type": "application/json"},
                             catch_response=True) as response:
            if response.status_code in [200, 201]:
                response.success()
            else:
                print("Falló envío:", response.status_code, response.text)
                response.failure(f"Error: {response.status_code} - {response.text}")


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Cargar datos al inicio de la prueba"""
    cargar_datos()


if __name__ == "__main__":
    pass