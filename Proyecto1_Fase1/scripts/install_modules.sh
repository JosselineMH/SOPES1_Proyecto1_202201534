# Script para Instalar y configurar módulos del kernel

echo "Instalando módulos del kernel..."

cd ../kernel_modules || exit 1

make clean
make

echo "Cargando módulos..."
sudo insmod ram_202201534.ko
sudo insmod cpu_202201534.ko

echo "Verificando /proc:"
echo -e "\n RAM:"
cat /proc/ram_202201534

echo -e "\n CPU:"
cat /proc/cpu_202201534
