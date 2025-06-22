import React from 'react';
import ReactApexChart from 'react-apexcharts';

const ApexChartCard = ({ title, series, labels, colors, extraInfo }) => {
  const options = {
    chart: {
      type: 'pie',
    },
    labels,
    colors,
    legend: {
      position: 'bottom',
      labels: {
        colors: '#000',
      }
    },
    dataLabels: {
      style: {
        colors: ['#000'],
        fontSize: '14px',
        fontWeight: 'bold'
      },
      formatter: function (val) {
        return `${val.toFixed(1)}%`;
      }
    },
    plotOptions: {
      pie: {
        dataLabels: {
          offset: 0
        }
      }
    }
  };

  return (
    <div style={{
      border: '2px solid #ddd',
      padding: '1rem 1.5rem',
      width: '440px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      background: '#ffffff',
      borderRadius: '10px',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    }}>
      <h3 style={{
        marginBottom: '1rem',
        fontSize: '1.2rem',
        color: '#000',
        fontWeight: 'bold'
      }}>
        {title}
      </h3>

      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '1.5rem',
      }}>
        <ReactApexChart options={options} series={series} type="pie" width={260} />

        {extraInfo && (
          <div style={{
            color: '#333',
            fontSize: '0.85rem',
            lineHeight: '1.4',
            minWidth: '100px'
          }}>
            <p><strong>Total:</strong> <span style={{ fontWeight: 'normal' }}>{extraInfo.total}</span></p>
            <p><strong>Libre:</strong> <span style={{ fontWeight: 'normal' }}>{extraInfo.libre}</span></p>
            <p><strong>Porcentaje:</strong> <span style={{ fontWeight: 'normal' }}>{extraInfo.porcentaje}%</span></p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApexChartCard;
