
# 1. Eliminar módulos del kernel
sudo rmmod ram_202201534
sudo rmmod cpu_202201534
echo "Se eliminaron los módulos del kernel"

# 2. Apagar los servicios de Docker Compose
docker-compose down -v
echo "Se detuvieron los servicios de Docker Compose"

