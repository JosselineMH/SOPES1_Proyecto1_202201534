from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import mysql.connector
import os
from datetime import datetime

# Cargar variables del archivo .env
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración desde el .env
config = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', 'password'),
    'database': os.getenv('DB_NAME', 'test'),
    'port': int(os.getenv('DB_PORT', 3306))
}


@app.route('/insertar', methods=['POST'])
def insertar_datos():
    data = request.get_json()
    conn = None
    cursor = None

    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()

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

        cursor.execute(query, valores)
        conn.commit()

        return jsonify({
            "success": True,
            "message": "Datos insertados correctamente",
            "rows_affected": cursor.rowcount
        }), 201

    except mysql.connector.Error as db_error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": f"Error de base de datos: {str(db_error)}"}), 500

    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if cursor:
            cursor.close()
        if conn and conn.is_connected():
            conn.close()


@app.route('/test-conexion', methods=['GET'])
def test_conexion():
    try:
        conn = mysql.connector.connect(**config)
        cursor = conn.cursor()

        cursor.execute("SHOW TABLES")
        tablas = cursor.fetchall()

        cursor.execute("DESCRIBE metricas")
        estructura = cursor.fetchall()

        cursor.execute("SELECT COUNT(*) FROM metricas")
        total_registros = cursor.fetchone()[0]

        return jsonify({
            "success": True,
            "message": "Conexión exitosa",
            "tablas": [tabla[0] for tabla in tablas],
            "estructura_metricas": [{"Field": col[0], "Type": col[1], "Null": col[2], "Key": col[3]} for col in estructura],
            "total_registros": total_registros
        }), 200

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

    finally:
        if conn and conn.is_connected():
            cursor.close()
            conn.close()

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "OK", "message": "API funcionando correctamente"}), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
