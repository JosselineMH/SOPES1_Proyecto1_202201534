# Script para desplegar 10 contenedores para estresar CPU y RAM

OPTIONS=(
    "--cpu 1 --timeout 45s"
    "--vm 2 --vm-bytes 256M --timeout 45s"
)

for i in {1..10}; do
    RANDOM_INDEX=$((RANDOM % 2))
    OPTION="${OPTIONS[$RANDOM_INDEX]}"
    TYPE=$(echo "$OPTION" | awk '{print $1}' | sed 's/--//')
    RANDOM_ID=$(cat /dev/urandom | tr -dc 'a-z0-9' | head -c 8)
    CONTAINER_NAME="stress_${TYPE}_${RANDOM_ID}"

    docker run -d --name "$CONTAINER_NAME" containerstack/alpine-stress sh -c "exec stress $OPTION"
    echo "Contenedor creado: $CONTAINER_NAME con opción $OPTION"
done
