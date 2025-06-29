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
    const socket = io(`http://${process.env.REACT_APP_HOST}:${process.env.REACT_APP_PORT}`);

    socket.on('connect', () => {
      console.log('Conectado al servidor Socket.IO');
    });

    socket.on('nueva-metrica', (data) => {
      console.log('Datos crudos recibidos del backend:', data);

      if (Array.isArray(data) && data.length > 0) {
        const metrica = data[0]; // Extraer la única fila enviada

        const ramData = {
          uso: metrica.uso_ram,
          libre: metrica.ram_libre,
          total: metrica.total_ram,
          porcentaje: metrica.porcentaje_ram
        };

        const cpuData = {
          porcentajeUso: metrica.porcentaje_cpu_uso
        };

        const procesosData = {
          ejecucion: metrica.procesos_corriendo,
          dormido: metrica.procesos_durmiendo,
          zombie: metrica.procesos_zombie,
          detenido: metrica.procesos_parados,
          total: metrica.total_procesos
        };
        
        setProcesos(procesosData);
        setRam(ramData);
        setCpu(cpuData);
        setLoading(false);
      }
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
