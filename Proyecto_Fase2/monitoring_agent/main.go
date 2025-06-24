package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"sync"
	"time"
)

type MetricaCompleta struct {
	TotalRAM           int    `json:"total_ram"`
	RAMLibre           int    `json:"ram_libre"`
	UsoRAM             int    `json:"uso_ram"`
	PorcentajeRAM      int    `json:"porcentaje_ram"`
	PorcentajeCPUUso   int    `json:"porcentaje_cpu_uso"`
	PorcentajeCPULibre int    `json:"porcentaje_cpu_libre"`
	ProcesosCorriendo  int    `json:"procesos_corriendo"`
	TotalProcesos      int    `json:"total_procesos"`
	ProcesosDurmiendo  int    `json:"procesos_durmiendo"`
	ProcesosZombie     int    `json:"procesos_zombie"`
	ProcesosParados    int    `json:"procesos_parados"`
	Hora               string `json:"hora"`
}

var (
	ultimaMetrica MetricaCompleta
	mu            sync.RWMutex
)

func leerArchivo(path string) map[string]interface{} {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		fmt.Println("Error leyendo", path, ":", err)
		return nil
	}
	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		fmt.Println("Error parseando JSON en", path, ":", err)
		return nil
	}
	return parsed
}

func recolectar(cpuPath, ramPath, procPath string) {
	for {
		fmt.Println("--- Nuevo ciclo de recolección ---")
		cpu := leerArchivo(cpuPath)
		ram := leerArchivo(ramPath)
		proc := leerArchivo(procPath)

		if cpu == nil || ram == nil || proc == nil {
			fmt.Println("Error en al menos un archivo, reintentando en 5 segundos...")
			time.Sleep(5 * time.Second)
			continue
		}

		metrica := MetricaCompleta{
			TotalRAM:           int(ram["total"].(float64)),
			RAMLibre:           int(ram["libre"].(float64)),
			UsoRAM:             int(ram["uso"].(float64)),
			PorcentajeRAM:      int(ram["porcentaje"].(float64)),
			PorcentajeCPUUso:   int(cpu["porcentajeUso"].(float64)),
			PorcentajeCPULibre: 100 - int(cpu["porcentajeUso"].(float64)),
			ProcesosCorriendo:  int(proc["procesos_corriendo"].(float64)),
			TotalProcesos:      int(proc["total_procesos"].(float64)),
			ProcesosDurmiendo:  int(proc["procesos_durmiendo"].(float64)),
			ProcesosZombie:     int(proc["procesos_zombie"].(float64)),
			ProcesosParados:    int(proc["procesos_parados"].(float64)),
			Hora:               time.Now().Format("2006-01-02 15:04:05"),
		}

		mu.Lock()
		ultimaMetrica = metrica
		mu.Unlock()

		time.Sleep(5 * time.Second)
	}
}

func servidorWeb() {
	http.HandleFunc("/metricas", func(w http.ResponseWriter, r *http.Request) {
		mu.RLock()
		defer mu.RUnlock()

		jsonData, err := json.Marshal(ultimaMetrica)
		if err != nil {
			http.Error(w, "Error al codificar métricas", http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		w.Write(jsonData)
	})

	port := "6000"
	fmt.Println("Servidor web activo en puerto " + port)
	http.ListenAndServe(":"+port, nil)
}

func main() {
	cpuPath := "/proc/cpu_202201534"
	ramPath := "/proc/ram_202201534"
	procPath := "/proc/procesos_202201534"

	fmt.Println("Iniciando recolector de métricas...")

	go servidorWeb()
	recolectar(cpuPath, ramPath, procPath)
}
