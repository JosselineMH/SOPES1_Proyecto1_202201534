from flask import Flask, request, jsonify
import mysql.connector
from datetime import datetime

app = Flask(__name__)

# Configuración de conexión a MySQL (desde docker-compose)
config = {
    'host': 'localhost',
    'user': 'josseline',
    'password': 'clave123',
    'database': 'metricas_db',
    'port': 3306
}

@app.route('/insertar', methods=['POST'])
def insertar_datos():
    data = request.get_json()

    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()

        query = """
        INSERT INTO metricas (
            total_ram, ram_libre, uso_ram, porcentaje_ram,
            porcentaje_cpu_uso, porcentaje_cpu_libre, procesos_corriendo,
            total_procesos, procesos_durmiendo, procesos_zombie,
            procesos_parados, hora
        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
            datetime.now()
        )

        cursor.execute(query, valores)
        conn.commit()

        return jsonify({"success": True, "message": "Datos insertados correctamente"}), 201
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
