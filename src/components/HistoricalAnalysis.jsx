import { useState, useEffect, useRef } from 'react';
import CalendarHeatmap from './CalendarHeatmap';
import { fetchHistoricalData } from '../services/historicalDataService';

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
  }, [position.lat, position.lon]);

  if (loading) {
    return (
      <div className="historical-analysis-container flex flex-col items-center justify-center p-12">
        <div className="live-dot active mb-4"></div>
        <p>Crunching 3 years of historical AQI data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="historical-analysis-container p-8 text-center text-red-500">
        <p>Error: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="historical-analysis-container section-card">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold">Long-Term Climate & Pollution Trends</h2>
        <p className="text-sm opacity-80">
          Showing 3 years of daily max AQI severity for {position.cityName}
        </p>
      </header>

      <div className="stats-row flex gap-6 mb-8">
        <div className="stat-box p-4 rounded-lg bg-black/5 dark:bg-white/5 flex-1">
          <p className="text-sm opacity-70">Overall Average AQI</p>
          <p className="text-3xl font-bold">{data.overallAvg}</p>
        </div>
        <div className="stat-box p-4 rounded-lg bg-black/5 dark:bg-white/5 flex-1">
          <p className="text-sm opacity-70">Days Recorded</p>
          <p className="text-3xl font-bold">{data.daily.length}</p>
        </div>
      </div>

      <div className="heatmap-section overflow-hidden">
        <h3 className="text-lg font-medium mb-4">Daily Severity Calendar</h3>
        <CalendarHeatmap data={data.daily} />
      </div>
    </div>
  );
}
