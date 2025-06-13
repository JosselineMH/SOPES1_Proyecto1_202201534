# 1. Instalar módulos del kernel
echo "Instalando módulos del kernel"
sudo bash ./install_modules.sh

# 2. Levantar servicios con docker-compose
echo "Levantando servicios con Docker Compose"
docker-compose up -d


# 3. Esperar a que la API esté lista 
until curl -s http://localhost:3000/metricas > /dev/null; do
  sleep 2
done
echo "API disponible."

# 4. Estresar contenedores
echo "Iniciando estrés de contenedores"
bash ./stress_containers.sh

sleep 50

# 5. Eliminando contenedores
docker rm -f $(docker ps -aq --filter "name=stress_")
echo "Contenedores eliminados."