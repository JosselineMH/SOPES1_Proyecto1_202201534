#!/bin/bash

# Script para eliminar todos los contenedores stress_*

echo "🧹 Eliminando contenedores ..."
docker rm -f $(docker ps -aq --filter "name=stress_")
echo "Contenedores eliminados."
