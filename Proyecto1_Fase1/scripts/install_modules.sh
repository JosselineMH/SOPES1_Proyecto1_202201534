#!/bin/bash

echo "🔧 Compilando módulos del kernel..."

cd ../kernel_modules || exit 1

# Eliminar módulos si ya están cargados
echo "Verificando módulos previamente cargados..."
sudo rmmod ram_202201534 2>/dev/null
sudo rmmod cpu_202201534 2>/dev/null

make clean
make

echo "Cargando módulos..."
sudo insmod ram_202201534.ko
sudo insmod cpu_202201534.ko

echo "Verificando /proc:"
echo -e "\n🔍 RAM:"
cat /proc/ram_202201534

echo -e "\n🔍 CPU:"
cat /proc/cpu_202201534
