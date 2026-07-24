import { useState, useEffect, useRef } from 'react';
import CalendarHeatmap from './CalendarHeatmap';
import { fetchHistoricalData } from '../services/historicalDataService';

/** @param {any} params */
export default function HistoricalAnalysis({ position }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  const workerRef = useRef(null);

  useEffect(() => {
    // Initialize web worker
    workerRef.current = new Worker(new URL('../workers/historicalDataWorker.js', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (e) => {
      if (e.data.error) {
        setError(e.data.error);
        setLoading(false);
      } else {
        setData(e.data);
        setLoading(false);
      }
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        // Fetch last 3 years of data
        const rawData = await fetchHistoricalData(position.lat, position.lon, 3);
        
        if (active && workerRef.current) {
          // Offload processing to worker
          workerRef.current.postMessage(rawData);
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load historical data');
          setLoading(false);
        }
      }
    }

    if (position?.lat && position?.lon) {
      loadData();
    }

    return () => {
      active = false;
    };
  }, [position?.lat, position?.lon]);

  if (loading) {
    return (
      <div className="historical-analysis-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center' }}>
        <div className="live-dot active" style={{ marginBottom: '1rem' }}></div>
        <p>Crunching 3 years of historical AQI data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="historical-analysis-container" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div data-testid="historical-analysis" className="historical-analysis-container section-card">
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, margin: '0 0 0.25rem' }}>Long-Term Climate & Pollution Trends</h2>
        <p style={{ fontSize: '0.88rem', opacity: 0.8, margin: 0 }}>
          Showing 3 years of daily max AQI severity for {position?.cityName || "your area"}
        </p>
      </header>

      <div className="stats-row" style={{ marginBottom: '2rem' }}>
        <div className="stat-box" style={{ padding: '1rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.05)', flex: '1 1 200px', minWidth: 0 }}>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0 0 0.25rem' }}>Overall Average AQI</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, fontFamily: '"Fraunces", serif' }}>{data.overallAvg}</p>
        </div>
        <div className="stat-box" style={{ padding: '1rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.05)', flex: '1 1 200px', minWidth: 0 }}>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0 0 0.25rem' }}>Days Recorded</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, fontFamily: '"Fraunces", serif' }}>{data.daily.length}</p>
        </div>
      </div>

      <div className="heatmap-section" style={{ overflow: 'hidden' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 500, margin: '0 0 1rem' }}>Daily Severity Calendar</h3>
        <CalendarHeatmap data={data.daily} />
      </div>
    </div>
  );
}