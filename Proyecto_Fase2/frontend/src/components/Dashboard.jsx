import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import ApexChartCard from './ApexChartCard';
import ProcessChartCard from './ProcessChartCard';

const Dashboard = () => {
  const [ram, setRam] = useState(null);
  const [cpu, setCpu] = useState(null);
  const [procesos, setProcesos] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = io('http://localhost:4000');

    socket.on('metricas', (data) => {
      console.log('📡 Datos recibidos del backend (Socket.IO):', data);
      setRam(data.ram);
      setCpu(data.cpu);
      setProcesos(data.procesos);
      setLoading(false);
    });

    return () => socket.disconnect();
  }, []);

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando métricas...</div>;
  }

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
        {ram && (
          <ApexChartCard
            key={ram.porcentaje}
            title="Métricas RAM"
            series={[
              parseFloat((ram.uso / 1024).toFixed(2)),
              parseFloat((ram.libre / 1024).toFixed(2))
            ]}
            labels={['En uso (GB)', 'Libre (GB)']}
            colors={['#b526f4', '#ca98ff']}
            extraInfo={{
              total: `${(ram.total / 1024).toFixed(1)} GB`,
              libre: `${(ram.libre / 1024).toFixed(1)} GB`,
              porcentaje: ram.porcentaje
            }}
          />
        )}
        {cpu && (
          <ApexChartCard
            key={cpu.porcentajeUso}
            title="Métricas CPU"
            series={[cpu.porcentajeUso, 100 - cpu.porcentajeUso]}
            labels={['En uso (%)', 'Libre (%)']}
            colors={['#acf426', '#cfff75']}
          />
        )}
      </div>

      {procesos && (
        <ProcessChartCard procesos={procesos} />
      )}

    </div>
  );
};

export default Dashboard;
