import React from 'react';
import ApexChartCard from './ApexChartCard';

const Dashboard = () => {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',  
      padding: '2rem',
      fontFamily: 'sans-serif',
    }}>
      <h1 style={{
        textAlign: 'center',
        marginBottom: '3rem',
        fontSize: '2rem',
        fontWeight: 'bold',
        color: '#333',
      }}>
        SOPES1 - 202201534
      </h1>

      <div style={{
        display: 'flex',
        gap: '2rem',
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        <ApexChartCard
          title="Métricas RAM"
          series={[70, 30]}
          labels={['En uso', 'Sin usar']}
          colors={['#b526f4', '#ca98ff']}
          extraInfo={{
            total: '7GB',
            libre: '3GB',
            porcentaje: 66
          }}
        />
        <ApexChartCard
          title="Métricas CPU"
          series={[60, 40]}
          labels={['En uso', 'Sin usar']}
          colors={['#acf426', '#cfff75']}
        />
      </div>
    </div>
  );
};

export default Dashboard;
