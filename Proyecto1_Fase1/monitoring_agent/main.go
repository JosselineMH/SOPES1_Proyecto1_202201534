package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"time"
)

type MetricaCPU struct {
	Tipo  string `json:"tipo"`
	Valor int    `json:"porcentajeUso"`
}

type MetricaRAM struct {
	Tipo       string `json:"tipo"`
	Total      int    `json:"total"`
	Libre      int    `json:"libre"`
	Uso        int    `json:"uso"`
	Porcentaje int    `json:"porcentaje"`
}

func leerCPU(path string) (MetricaCPU, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return MetricaCPU{}, err
	}

	var parsed map[string]int
	if err := json.Unmarshal(data, &parsed); err != nil {
		return MetricaCPU{}, err
	}

	return MetricaCPU{
		Tipo:  "cpu",
		Valor: parsed["porcentajeUso"],
	}, nil
}

func leerRAM(path string) (MetricaRAM, error) {
	data, err := ioutil.ReadFile(path)
	if err != nil {
		return MetricaRAM{}, err
	}

	var parsed map[string]int
	if err := json.Unmarshal(data, &parsed); err != nil {
		return MetricaRAM{}, err
	}

	return MetricaRAM{
		Tipo:       "ram",
		Total:      parsed["total"],
		Libre:      parsed["libre"],
		Uso:        parsed["uso"],
		Porcentaje: parsed["porcentaje"],
	}, nil
}

func enviarMetrica(metrica interface{}, apiURL string) {
	jsonData, err := json.Marshal(metrica)
	if err != nil {
		fmt.Println("Error en JSON:", err)
		return
	}

	resp, err := http.Post(apiURL, "application/json", bytes.NewBuffer(jsonData))
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

func main() {
	apiURL := os.Getenv("API_URL")
	if apiURL == "" {
		apiURL = "http://localhost:3000/metricas"
	}

	cpuPath := "/proc/cpu_202201534"
	ramPath := "/proc/ram_202201534"

	for {
		cpuChan := make(chan MetricaCPU)
		ramChan := make(chan MetricaRAM)

		go func() {
			if val, err := leerCPU(cpuPath); err == nil {
				cpuChan <- val
			} else {
				fmt.Println("Error CPU:", err)
				close(cpuChan)
			}
		}()

		go func() {
			if val, err := leerRAM(ramPath); err == nil {
				ramChan <- val
			} else {
				fmt.Println("Error RAM:", err)
				close(ramChan)
			}
		}()

		select {
		case cpu, ok := <-cpuChan:
			if ok {
				enviarMetrica(cpu, apiURL)
			}
		case <-time.After(2 * time.Second):
			fmt.Println("Timeout leyendo CPU")
		}

		select {
		case ram, ok := <-ramChan:
			if ok {
				enviarMetrica(ram, apiURL)
			}
		case <-time.After(2 * time.Second):
			fmt.Println("Timeout leyendo RAM")
		}

		time.Sleep(5 * time.Second)
	}
}
