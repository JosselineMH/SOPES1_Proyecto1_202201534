#!/bin/bash

OPTIONS=(
    "stress --cpu 1 --timeout 45s"
    "stress --vm 2 --vm-bytes 256M --timeout 45s"
)

for i in {1..10}; do
    RANDOM_INDEX=$((RANDOM % 2))
    OPTION="${OPTIONS[$RANDOM_INDEX]}"
    TYPE=$(echo "$OPTION" | awk '{print $2}' | sed 's/--//')
    RANDOM_ID=$(cat /dev/urandom | tr -dc 'a-z0-9' | head -c 8)
    CONTAINER_NAME="stress_${TYPE}_${RANDOM_ID}"

    # Crear contenedor
    docker run -d --name "$CONTAINER_NAME" polinux/stress $OPTION
    echo "Contenedor creado: $CONTAINER_NAME con opción: $OPTION"
done

# Esperar tiempo suficiente para que los contenedores terminen (45s + margen)
echo "Esperando 60 segundos a que los contenedores terminen..."
sleep 60

# Eliminar contenedores creados
echo "Eliminando contenedores de stress..."
docker ps -a --filter "name=stress_" --format "{{.Names}}" | xargs -r docker rm -f
