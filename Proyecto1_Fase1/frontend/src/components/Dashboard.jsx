import React, { useEffect, useState } from 'react';
import ApexChartCard from './ApexChartCard';

const Dashboard = () => {
  const [ram, setRam] = useState(null);
  const [cpu, setCpu] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetricas = async () => {
      try {
        const res = await fetch('http://localhost:3000/metricas');
        const data = await res.json();

        if (!Array.isArray(data)) throw new Error("Respuesta inválida");

        const reversed = [...data].reverse();
        const ultimaRAM = reversed.find(m => m.tipo === 'ram');
        const ultimaCPU = reversed.find(m => m.tipo === 'cpu');

        if (ultimaRAM?.total && ultimaRAM?.libre && ultimaRAM?.uso !== undefined) {
          setRam(ultimaRAM);
        }

        if (ultimaCPU?.porcentajeUso !== undefined) {
          setCpu(ultimaCPU);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error al cargar métricas:', error);
        setLoading(false);
      }
    };

    fetchMetricas();
    const interval = setInterval(fetchMetricas, 5000);
    return () => clearInterval(interval);
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
            key={cpu.porcentajeUso} // Forzar actualización
            title="Métricas CPU"
            series={[cpu.porcentajeUso, 100 - cpu.porcentajeUso]}
            labels={['En uso (%)', 'Libre (%)']}
            colors={['#acf426', '#cfff75']}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
