package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"sync"
	"time"
)

type MetricaCPU struct {
	Tipo          string `json:"tipo"`
	PorcentajeUso int    `json:"porcentajeUso"`
}

type MetricaRAM struct {
	Tipo       string `json:"tipo"`
	Total      int    `json:"total"`
	Libre      int    `json:"libre"`
	Uso        int    `json:"uso"`
	Porcentaje int    `json:"porcentaje"`
}

var (
	ultimaCPU MetricaCPU
	ultimaRAM MetricaRAM
	mu        sync.RWMutex
)

func leerCPU(path string) (MetricaCPU, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return MetricaCPU{}, err
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		return MetricaCPU{}, err
	}

	var porcentajeUso int
	if val, exists := parsed["porcentajeUso"]; exists {
		switch v := val.(type) {
		case float64:
			porcentajeUso = int(v)
		case int:
			porcentajeUso = v
		default:
			return MetricaCPU{}, fmt.Errorf("tipo de dato inesperado para porcentajeUso: %T", v)
		}
	}

	return MetricaCPU{
		Tipo:          "cpu",
		PorcentajeUso: porcentajeUso,
	}, nil
}

func leerRAM(path string) (MetricaRAM, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return MetricaRAM{}, err
	}

	var parsed map[string]interface{}
	if err := json.Unmarshal(data, &parsed); err != nil {
		return MetricaRAM{}, err
	}

	getInt := func(key string) int {
		if val, exists := parsed[key]; exists {
			switch v := val.(type) {
			case float64:
				return int(v)
			case int:
				return v
			}
		}
		return 0
	}

	return MetricaRAM{
		Tipo:       "ram",
		Total:      getInt("total"),
		Libre:      getInt("libre"),
		Uso:        getInt("uso"),
		Porcentaje: getInt("porcentaje"),
	}, nil
}

func enviarMetrica(metrica interface{}, apiURL string) {
	jsonData, err := json.Marshal(metrica)
	if err != nil {
		fmt.Println("Error en JSON:", err)
		return
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Post(apiURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		fmt.Println("Error al enviar:", err)
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		fmt.Println("Respuesta no exitosa:", resp.Status)
	} else {
		fmt.Println("Métrica enviada:", string(jsonData))
	}
}

type resultado struct {
	cpu    MetricaCPU
	ram    MetricaRAM
	errCPU error
	errRAM error
}

func recolectar(apiURL, cpuPath, ramPath string) {
	for {
		fmt.Println("--- Nuevo ciclo de recolección ---")
		resultChan := make(chan resultado, 1)
		var wg sync.WaitGroup
		var res resultado

		wg.Add(1)
		go func() {
			defer wg.Done()
			cpuChan := make(chan MetricaCPU, 1)
			errChan := make(chan error, 1)

			go func() {
				cpu, err := leerCPU(cpuPath)
				if err != nil {
					errChan <- err
				} else {
					cpuChan <- cpu
				}
			}()

			select {
			case cpu := <-cpuChan:
				res.cpu = cpu
				fmt.Println("CPU leído correctamente")
			case err := <-errChan:
				res.errCPU = err
				fmt.Printf("Error leyendo CPU: %v\n", err)
			case <-time.After(3 * time.Second):
				res.errCPU = fmt.Errorf("timeout leyendo CPU")
			}
		}()

		wg.Add(1)
		go func() {
			defer wg.Done()
			ram, err := leerRAM(ramPath)
			if err != nil {
				res.errRAM = err
				fmt.Printf("Error leyendo RAM: %v\n", err)
			} else {
				res.ram = ram
				fmt.Println("RAM leído correctamente")
			}
		}()

		go func() {
			wg.Wait()
			resultChan <- res
		}()

		select {
		case result := <-resultChan:
			if result.errCPU == nil {
				mu.Lock()
				ultimaCPU = result.cpu
				mu.Unlock()
				enviarMetrica(result.cpu, apiURL)
			}
			if result.errRAM == nil {
				mu.Lock()
				ultimaRAM = result.ram
				mu.Unlock()
				enviarMetrica(result.ram, apiURL)
			}
		case <-time.After(5 * time.Second):
			fmt.Println("Timeout global")
		}

		time.Sleep(5 * time.Second)
	}
}

func servidorWeb() {
	http.HandleFunc("/status", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("Recolector activo"))
	})

	http.HandleFunc("/metricas", func(w http.ResponseWriter, r *http.Request) {
		mu.RLock()
		defer mu.RUnlock()

		metricas := []interface{}{ultimaCPU, ultimaRAM}
		jsonData, err := json.Marshal(metricas)
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
	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:3000/metricas"
	}
	cpuPath := "/proc/cpu_202201534"
	ramPath := "/proc/ram_202201534"

	fmt.Println("Iniciando recolector de métricas...")
	fmt.Println("API URL:", apiURL)

	go servidorWeb()
	recolectar(apiURL, cpuPath, ramPath)
}
