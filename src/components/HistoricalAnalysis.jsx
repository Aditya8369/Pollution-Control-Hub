import { useState, useEffect, useRef } from 'react';
import CalendarHeatmap from './CalendarHeatmap';
import { fetchHistoricalData } from '../services/historicalDataService';

/** @param {any} params */
export default function HistoricalAnalysis({ position }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');
  
  const workerRef = useRef(null);

  useEffect(() => {
    if (data && data.daily && data.daily.length > 0) {
      setStartDate(data.daily[0].date);
      setEndDate(data.daily[data.daily.length - 1].date);
    }
  }, [data]);

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

  const minDate = data?.daily?.[0]?.date || '';
  const maxDate = data?.daily?.[data.daily.length - 1]?.date || '';

  const handleExportCSV = () => {
    if (!data || !data.daily) return;
    if (new Date(startDate) > new Date(endDate)) {
      setDateError('Start date cannot be after end date.');
      return;
    }
    setDateError('');

    const filtered = data.daily
      .filter(day => day.date >= startDate && day.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));

    const headers = ['Date', 'AQI', 'PM2.5', 'PM10', 'NO2', 'Ozone', 'CO'];
    const rows = filtered.map(day => [
      day.date,
      day.maxAqi,
      day.pm25 !== null && day.pm25 !== undefined ? day.pm25 : '',
      day.pm10 !== null && day.pm10 !== undefined ? day.pm10 : '',
      day.no2 !== null && day.no2 !== undefined ? day.no2 : '',
      day.ozone !== null && day.ozone !== undefined ? day.ozone : '',
      day.co !== null && day.co !== undefined ? day.co : ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const cityName = position?.cityName ? position.cityName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'historical';
    link.download = `${cityName}_pollution_history_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!data || !data.daily) return;
    if (new Date(startDate) > new Date(endDate)) {
      setDateError('Start date cannot be after end date.');
      return;
    }
    setDateError('');

    const filtered = data.daily
      .filter(day => day.date >= startDate && day.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));

    const mapped = filtered.map(day => ({
      'Date': day.date,
      'AQI': day.maxAqi,
      'PM2.5': day.pm25,
      'PM10': day.pm10,
      'NO2': day.no2,
      'Ozone': day.ozone,
      'CO': day.co
    }));

    const jsonContent = JSON.stringify(mapped, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const cityName = position?.cityName ? position.cityName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'historical';
    link.download = `${cityName}_pollution_history_${startDate}_to_${endDate}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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

      <div className="export-controls-section" style={{
        marginBottom: '2rem',
        padding: '1.25rem',
        borderRadius: 'var(--r-sm, 10px)',
        background: 'var(--bg-card-alt, rgba(0,0,0,0.02))',
        border: '1px solid var(--line, rgba(0,0,0,0.08))'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 500, margin: '0 0 1rem 0', color: 'var(--ink)' }}>Export Historical Data</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 180px' }}>
            <label htmlFor="export-start-date" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--muted)' }}>Start Date</label>
            <input
              type="date"
              id="export-start-date"
              value={startDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--card)',
                color: 'var(--ink)',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 180px' }}>
            <label htmlFor="export-end-date" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--muted)' }}>End Date</label>
            <input
              type="date"
              id="export-end-date"
              value={endDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--card)',
                color: 'var(--ink)',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 auto', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportCSV}
              type="button"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '6px',
                background: 'var(--brand, #0d9488)',
                color: '#ffffff',
                border: 'none',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--brand-strong, #0b7d73)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'var(--brand, #0d9488)'; }}
            >
              Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              type="button"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '6px',
                background: 'var(--muted, #52667a)',
                color: '#ffffff',
                border: 'none',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'var(--ink, #0f172a)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'var(--muted, #52667a)'; }}
            >
              Export JSON
            </button>
          </div>
        </div>
        {dateError && <p style={{ color: 'var(--danger, #ef4444)', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>{dateError}</p>}
      </div>

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