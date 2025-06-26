import React from "react";
import Chart from "react-apexcharts";

const ProcessChartCard = ({ procesos }) => {
  if (!procesos) {
    return <div style={{ textAlign: "center", marginTop: "2rem" }}>Cargando métricas de procesos...</div>;
  }

  const series = [
    procesos.ejecucion || 0,
    procesos.dormido || 0,
    procesos.zombie || 0,
    procesos.detenido || 0
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
            formatter: function (val, opts) {
              const label = opts.w.config.labels[opts.seriesIndex];
              return `${val} ${label.toLowerCase()}`;
            }
          }
        }
      }
    },
    labels: labels,
    colors: ["#1c91ff", "#ff5ab1", "#2ae338", "#ff2d13"],
    tooltip: {
      enabled: true,
      y: {
        formatter: (val) => `${parseInt(val)} procesos`
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

      {/* 👇 Esto fuerza redibujo si cambian los datos */}
      <Chart
        key={series.join('-')} 
        options={options}
        series={series}
        type="radialBar"
        height={390}
      />

      <p style={{ textAlign: "center", marginTop: "1rem", fontSize: "18px", color: "#333" }}>
        Total de procesos: <strong>{procesos.total ?? "No disponible"}</strong>
      </p>
    </div>
  );
};

export default ProcessChartCard;
