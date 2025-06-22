import React, { useEffect, useState } from "react";
import Chart from "react-apexcharts";

const ProcessChartCard = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchProcesos = async () => {
      try {
        const res = await fetch("http://localhost:3000/metricas");
        const metricas = await res.json();
        const ultimaProc = metricas.find((m) => m.tipo === "procesos");

        if (ultimaProc) {
          setData(ultimaProc);
        }
      } catch (error) {
        console.error("Error al obtener métricas de procesos:", error);
      }
    };

    fetchProcesos();
    const interval = setInterval(fetchProcesos, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!data) {
    return <div style={{ textAlign: "center", marginTop: "2rem" }}>Cargando métricas de procesos...</div>;
  }

  const series = [
    data.ejecucion || 0,
    data.dormido || 0,
    data.zombie || 0,
    data.detenido || 0
  ];

  const labels = ["Corriendo", "Durmiendo", "Zombie", "Parados"];

  const options = {
    chart: {
      type: "radialBar",
      height: 390
    },
    plotOptions: {
      radialBar: {
        offsetY: 0,
        startAngle: 0,
        endAngle: 270,
        hollow: {
          margin: 5,
          size: "30%",
          background: "transparent",
          image: undefined,
          imageOffsetX: 0,
          imageOffsetY: 0,
          position: "front"
        },
        dataLabels: {
          show: true,
          name: {
            show: true,
            fontSize: '14px'
          },
          value: {
            show: true,
            fontSize: "16px",
            fontWeight: 600,
            color: "#333",
            formatter: () => `${data.total} total`
          }
        }
      }
    },
    labels: labels,
    colors: ["#1c91ff", "#ff5ab1", "#2ae338", "#ff2d13"],
    tooltip: {
      enabled: true,
      y: {
        formatter: function (val) {
          return `${parseInt(val)} procesos`;
        },
        title: {
          formatter: function (seriesName) {
            return seriesName;
          }
        }
      }
    },
    legend: {
      show: true,
      position: "bottom",
      formatter: function (seriesName, opts) {
        return `${seriesName}: ${series[opts.seriesIndex]}`;
      }
    }
  };

  return (
    <div style={{ width: "100%", maxWidth: 500, marginTop: "2rem" }}>
      <h3 style={{ textAlign: "center" }}>Métricas de Procesos</h3>
      <Chart options={options} series={series} type="radialBar" height={390} />
      <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "18px", color: "#333" }}>
        Total de procesos: <strong>{data.total ?? "No disponible"}</strong>
      </p>
    </div>
  );
};

export default ProcessChartCard;
