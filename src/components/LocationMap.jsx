import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet';
import { useState } from 'react';
import L from 'leaflet';

export default function LocationMap({ center, nearbyPoints, confidenceScore, windData }) {
  const [showWind, setShowWind] = useState(false);

  const getWindDirectionText = (degrees) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'];
    const fromIdx = Math.round(degrees / 45) % 8;
    const toIdx = (fromIdx + 4) % 8;
    return `${dirs[fromIdx]} → ${dirs[toIdx]}`;
  };

  const windIcon = windData ? L.divIcon({
    className: 'wind-arrow-icon',
    html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(${windData.direction}deg); width: 24px; height: 24px; color: #3b82f6; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5));"><path d="M12 2v20M12 22l-4-4M12 22l4-4"/></svg>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }) : null;

  return (
    <section className="panel">
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Location-Based Tracking</h2>
          <p>Nearby pollution intensity map and hotspots</p>
        </div>
        {windData && (
          <button 
            type="button" 
            onClick={() => setShowWind(!showWind)}
            style={{ 
              fontSize: '0.85rem', 
              padding: '0.5rem 1rem', 
              flexShrink: 0,
              backgroundColor: showWind ? '#ef4444' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s'
            }}
          >
            {showWind ? 'Hide Wind Overlay' : 'Show Wind Overlay'}
          </button>
        )}
      </div>

      <div className="map-wrap">
        <MapContainer center={[center.lat, center.lon]} zoom={11} scrollWheelZoom={false} className="map">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {nearbyPoints.map((point) => (
            <CircleMarker
              key={point.id}
              center={[point.lat, point.lon]}
              radius={Math.max(12, point.aqi / 8)}
              pathOptions={{
                color: point.aqi > 150 ? '#b91c1c' : point.aqi > 100 ? '#f97316' : '#16a34a',
                fillOpacity: confidenceScore === 'Low' ? 0.25 : 0.55
              }}
            >
              <Popup>
                <strong>{point.areaName}</strong>
                <br />AQI: {point.aqi}
              </Popup>
            </CircleMarker>
          ))}
          {showWind && windData && windIcon && (
            <>
              <Marker position={[center.lat, center.lon]} icon={windIcon} />
              {nearbyPoints.map((point) => (
                <Marker key={`wind-${point.id}`} position={[point.lat, point.lon]} icon={windIcon} />
              ))}
            </>
          )}
        </MapContainer>
      </div>

      {showWind && windData && (
        <div className="wind-insight" style={{ padding: '1rem', backgroundColor: 'var(--bg-card-alt, #f8fafc)', borderRadius: '0.5rem', marginTop: '1rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ width: '20px', height: '20px', transform: 'rotate(180deg)' }}><path d="M12 2v20M12 22l-4-4M12 22l4-4"/></svg>
            <strong>Wind Legend:</strong>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Arrows indicate the direction wind is blowing.</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.95rem' }}>
            Wind blowing {getWindDirectionText(windData.direction)} at {windData.speed} km/h — pollution patterns may shift in this direction.
          </p>
        </div>
      )}

      <div className="hotspots">
        <h3>Most Polluted Areas Near You</h3>
        <ul>
          {nearbyPoints
            .slice()
            .sort((a, b) => b.aqi - a.aqi)
            .slice(0, 3)
            .map((point) => (
              <li key={`hot-${point.id}`}>
                <span>{point.areaName}</span>
                <strong>AQI {point.aqi}</strong>
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
}
