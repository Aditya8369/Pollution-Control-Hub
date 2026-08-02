import React, { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const LOCAL_STORAGE_KEY = 'pollution_hub_indoor_aqi';

export default function IndoorTracker({ currentOutdoor }) {
  const [pm25, setPm25] = useState('');
  const [co2, setCo2] = useState('');
  const [voc, setVoc] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // For the charts/tips, we need parsed numeric values
  const [savedData, setSavedData] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        setPm25(data.pm25 !== undefined ? String(data.pm25) : '');
        setCo2(data.co2 !== undefined ? String(data.co2) : '');
        setVoc(data.voc !== undefined ? String(data.voc) : '');
        setLastUpdated(data.lastUpdated || null);
        setSavedData(data);
      }
    } catch (e) {
      console.warn("Failed to read indoor AQI from localStorage", e);
    }
  }, []);

  const handleSave = (e) => {
    e.preventDefault();
    
    // Convert to numbers for validation
    const numPm25 = pm25 === '' ? null : Number(pm25);
    const numCo2 = co2 === '' ? null : Number(co2);
    const numVoc = voc === '' ? null : Number(voc);

    // Validate
    if (numPm25 !== null && (numPm25 < 0 || numPm25 > 500)) {
      alert('PM2.5 must be between 0 and 500');
      return;
    }
    if (numCo2 !== null && (numCo2 < 0 || numCo2 > 5000)) {
      alert('CO₂ must be between 0 and 5000');
      return;
    }
    if (numVoc !== null && (numVoc < 0 || numVoc > 1000)) {
      alert('VOC must be between 0 and 1000');
      return;
    }

    const now = new Date().toISOString();
    const newData = {
      pm25: numPm25,
      co2: numCo2,
      voc: numVoc,
      lastUpdated: now
    };

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
      setLastUpdated(now);
      setSavedData(newData);
    } catch (err) {
      console.warn('Failed to save indoor data', err);
    }
  };

  const outdoorPm25 = currentOutdoor?.pm2_5 || 0;
  const indoorPm25Val = savedData?.pm25 !== null && savedData?.pm25 !== undefined ? savedData.pm25 : 0;
  
  const comparisonData = [
    {
      name: 'PM2.5 (µg/m³)',
      Indoor: indoorPm25Val,
      Outdoor: outdoorPm25
    }
  ];

  // Generate tips
  const tips = [];
  if (savedData) {
    if (savedData.pm25 !== null && savedData.pm25 !== undefined) {
      if (savedData.pm25 > outdoorPm25) {
        tips.push("Your indoor air is currently worse than outside. Consider opening a window.");
      } else if (savedData.pm25 < outdoorPm25) {
        tips.push("Indoor air quality is currently better than outside.");
      }
    }
    if (savedData.co2 !== null && savedData.co2 > 1000) {
      tips.push("Improve ventilation by opening windows or doors (High CO₂).");
    }
    if (savedData.voc !== null && savedData.voc > 500) {
      tips.push("Reduce use of chemical cleaners and improve airflow (High VOC).");
    }
  }

  return (
    <article className="chart-card indoor-tracker" data-testid="indoor-tracker" style={{ gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div className="panel-head">
          <h3>🏠 Indoor vs. Outdoor Air Quality</h3>
          <p>Track your indoor environment manually and compare with outdoor readings.</p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
          {/* Data Entry Form */}
          <div style={{ flex: '1 1 300px' }}>
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-card-alt, rgba(0,0,0,0.02))', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--line)' }}>
              <h4 style={{ margin: 0 }}>Log Indoor Data</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label htmlFor="pm25-input" style={{ fontSize: '0.9rem', fontWeight: '600' }}>PM2.5 (µg/m³)</label>
                <input 
                  id="pm25-input"
                  data-testid="pm25-input"
                  type="number" 
                  step="0.1"
                  min="0"
                  max="500"
                  value={pm25} 
                  onChange={e => setPm25(e.target.value)} 
                  placeholder="0 - 500"
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--line)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label htmlFor="co2-input" style={{ fontSize: '0.9rem', fontWeight: '600' }}>CO₂ (ppm)</label>
                <input 
                  id="co2-input"
                  data-testid="co2-input"
                  type="number" 
                  min="0"
                  max="5000"
                  value={co2} 
                  onChange={e => setCo2(e.target.value)} 
                  placeholder="0 - 5000"
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--line)' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label htmlFor="voc-input" style={{ fontSize: '0.9rem', fontWeight: '600' }}>VOC (index)</label>
                <input 
                  id="voc-input"
                  data-testid="voc-input"
                  type="number" 
                  min="0"
                  max="1000"
                  value={voc} 
                  onChange={e => setVoc(e.target.value)} 
                  placeholder="0 - 1000"
                  style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--line)' }}
                />
              </div>

              <button type="submit" className="btn-primary" style={{ padding: '0.75rem', marginTop: '0.5rem', background: 'var(--brand)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600' }}>
                Save Indoor Data
              </button>
              
              {lastUpdated && (
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)', textAlign: 'center' }}>
                  Last saved: {new Date(lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </form>
          </div>

          {/* Visualization and Comparison */}
          {savedData && (
            <div style={{ flex: '2 1 400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ flex: 1, minHeight: '200px' }} data-testid="indoor-comparison-chart">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip contentStyle={{ background: 'var(--card)', border: '1px solid var(--line)' }} />
                    <Legend />
                    <Bar dataKey="Indoor" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Outdoor" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Contextual Tips */}
              <div style={{ background: 'rgba(139, 92, 246, 0.1)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#6d28d9' }}>💡 Actionable Insights</h4>
                {tips.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: '1.5rem', color: 'var(--ink)' }}>
                    {tips.map((tip, idx) => (
                      <li key={idx} style={{ marginBottom: '0.25rem' }}>{tip}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, color: 'var(--ink)' }}>No specific recommendations right now. Keep monitoring!</p>
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </article>
  );
}
