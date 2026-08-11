// @ts-nocheck
import { MapContainer, TileLayer, CircleMarker, Popup, Marker } from 'react-leaflet';
import { useState, useEffect } from 'react';
import L from 'leaflet';
import { eventBus } from '../core/events';
import { getPollutantColor } from '../services/airQualityService';
import PropTypes from "prop-types";

const COMMUNITY_REPORTS_STORAGE_KEY = 'pollution-community-reports';
const SYMPTOM_REPORTS_STORAGE_KEY = 'pollution-symptom-reports';

const POLLUTANT_LAYERS = [
  { key: 'aqi', label: 'AQI' },
  { key: 'pm2_5', label: 'PM2.5', limit: 15 },
  { key: 'pm10', label: 'PM10', limit: 45 },
  { key: 'nitrogen_dioxide', label: 'NO₂', limit: 25 },
  { key: 'ozone', label: 'O₃', limit: 100 },
  { key: 'carbon_monoxide', label: 'CO', limit: 4000 },
];

function readGeotaggedCommunityReports() {
  try {
    const raw = localStorage.getItem(COMMUNITY_REPORTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (report) =>
        report &&
        typeof report.latitude === 'number' &&
        typeof report.longitude === 'number' &&
        !isNaN(report.latitude) &&
        !isNaN(report.longitude)
    );
  } catch {
    return [];
  }
}

function readGeotaggedSymptomReports() {
  try {
    const raw = localStorage.getItem(SYMPTOM_REPORTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (report) =>
        report &&
        typeof report.latitude === 'number' &&
        typeof report.longitude === 'number' &&
        !isNaN(report.latitude) &&
        !isNaN(report.longitude)
    );
  } catch {
    return [];
  }
}

/**
 * Displays an interactive pollution map with nearby AQI hotspots,
 * optional wind overlay, and community reports.
 *
 * @param {Object} props
 * @param {{lat: number, lon: number}} props.center
 * @param {Array<Object>} props.nearbyPoints
 * @param {"Low"|"Medium"|"High"|string} props.confidenceScore
 * @param {{direction: number, speed: number}|null} [props.windData]
 */

export default function LocationMap({ center, nearbyPoints, confidenceScore, windData, windError }) {
  const [showWind, setShowWind] = useState(false);
  const [showCommunityReports, setShowCommunityReports] = useState(false);
  const [communityReports, setCommunityReports] = useState(() => readGeotaggedCommunityReports());
  const [showSymptomReports, setShowSymptomReports] = useState(false);
  const [symptomReports, setSymptomReports] = useState(() => readGeotaggedSymptomReports());
  const [selectedLayer, setSelectedLayer] = useState('aqi');
  useEffect(() => {
    const updateReports = () => {
      setCommunityReports(readGeotaggedCommunityReports());
    };

    eventBus.on('COMMUNITY_REPORT_SUBMITTED', updateReports);

    const handleStorage = (e) => {
      if (!e.key || e.key === COMMUNITY_REPORTS_STORAGE_KEY) {
        updateReports();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      eventBus.off('COMMUNITY_REPORT_SUBMITTED', updateReports);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    const updateSymptomReports = () => {
      setSymptomReports(readGeotaggedSymptomReports());
    };

    eventBus.on('SYMPTOM_REPORT_SUBMITTED', updateSymptomReports);

    const handleStorage = (e) => {
      if (!e.key || e.key === SYMPTOM_REPORTS_STORAGE_KEY) {
        updateSymptomReports();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      eventBus.off('SYMPTOM_REPORT_SUBMITTED', updateSymptomReports);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

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

  const communityReportIcon = L.divIcon({
    className: 'community-report-marker-icon',
    html: `<div style="background-color: #8b5cf6; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 16px; height: 16px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  const symptomReportIcon = L.divIcon({
    className: 'symptom-report-marker-icon',
    html: `<div style="background-color: #dc2626; color: white; border: 2px solid white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 14px; line-height: 1;">🤒</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  const activeLayer = POLLUTANT_LAYERS.find((l) => l.key === selectedLayer) || POLLUTANT_LAYERS[0];

  const getMarkerColor = (point) => {
    if (selectedLayer === 'aqi') {
      return point.aqi > 150 ? '#b91c1c' : point.aqi > 100 ? '#f97316' : '#16a34a';
    }
    return getPollutantColor(point.pollutants?.[selectedLayer], activeLayer.limit);
  };

  return (
    <section data-testid="location-map" className="panel">
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2>Location-Based Tracking</h2>
          <p>Nearby pollution intensity map and hotspots</p>
          {windError && <p className="error-banner">Wind data unavailable: {windError}</p>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label
            htmlFor="pollutant-layer-select"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: '600' }}
          >
            Layer:
            <select
              id="pollutant-layer-select"
              data-testid="pollutant-layer-select"
              value={selectedLayer}
              onChange={(e) => setSelectedLayer(e.target.value)}
              style={{
                fontSize: '0.85rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '0.375rem',
                border: '1px solid var(--border-color, #e2e8f0)',
                minHeight: '44px',
                cursor: 'pointer'
              }}
            >
              {POLLUTANT_LAYERS.map((layer) => (
                <option key={layer.key} value={layer.key}>{layer.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => setShowSymptomReports(!showSymptomReports)}
            style={{
              fontSize: '0.85rem',
              padding: '0.5rem 1rem',
              flexShrink: 0,
              backgroundColor: showSymptomReports ? '#ef4444' : '#f97316',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s',
              minHeight: '44px'
            }}
          >
            {showSymptomReports ? 'Hide Symptom Reports' : 'Show Symptom Reports'}
          </button>
          <button
            type="button"
            onClick={() => setShowCommunityReports(!showCommunityReports)}
            style={{
              fontSize: '0.85rem',
              padding: '0.5rem 1rem',
              flexShrink: 0,
              backgroundColor: showCommunityReports ? '#ef4444' : '#8b5cf6',
              color: 'white',
              border: 'none',
              borderRadius: '0.375rem',
              cursor: 'pointer',
              fontWeight: '600',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s',
              minHeight: '44px'
            }}
          >
            {showCommunityReports ? 'Hide Community Reports' : 'Show Community Reports'}
          </button>
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
                transition: 'background-color 0.2s',
                minHeight: '44px'
              }}
            >
              {showWind ? 'Hide Wind Overlay' : 'Show Wind Overlay'}
            </button>
          )}
        </div>
      </div>

      <div className="map-wrap">
        <MapContainer key={`${center.lat}-${center.lon}`} center={[center.lat, center.lon]} zoom={11} scrollWheelZoom={true} className="map">
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
                color: getMarkerColor(point),
                fillOpacity: confidenceScore === 'Low' ? 0.25 : 0.55
              }}
            >
              <Popup>
                <strong>{point.areaName}</strong>
                <br />AQI: {point.aqi}
                {selectedLayer !== 'aqi' && (
                  <>
                    <br />{activeLayer.label}: {point.pollutants?.[selectedLayer] ?? 'N/A'} µg/m³
                  </>
                )}
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
          {showCommunityReports && communityReports.map((report) => (
            <Marker
              key={`community-report-${report.id}`}
              position={[report.latitude, report.longitude]}
              icon={communityReportIcon}
            >
              <Popup>
                <div className="community-report-popup">
                  <strong>{report.title}</strong>
                  <div>Status: {report.status}</div>
                  {report.createdAt && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      {new Date(report.createdAt).toLocaleString()}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
          {showSymptomReports && symptomReports.map((report) => (
            <Marker
              key={`symptom-report-${report.id}`}
              position={[report.latitude, report.longitude]}
              icon={symptomReportIcon}
            >
              <Popup>
                <div className="symptom-report-popup">
                  <strong>{(report.symptoms || []).join(', ')}</strong>
                  {report.timestamp && (
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                      {new Date(report.timestamp).toLocaleString()}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {showWind && windData && (
        <div className="wind-insight" style={{ padding: '1rem', backgroundColor: 'var(--bg-card-alt, #f8fafc)', borderRadius: '0.5rem', marginTop: '1rem', borderLeft: '4px solid #3b82f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" style={{ width: '20px', height: '20px', transform: 'rotate(180deg)', flexShrink: 0 }}><path d="M12 2v20M12 22l-4-4M12 22l4-4" /></svg>
            <strong>Wind Legend:</strong>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>Arrows indicate the direction wind is blowing.</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.92rem', wordBreak: 'break-word' }}>
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

LocationMap.propTypes = {
  /**
   * Center coordinates of the map.
   */
  center: PropTypes.shape({
    lat: PropTypes.number.isRequired,
    lon: PropTypes.number.isRequired,
  }).isRequired,

  /**
   * Nearby pollution monitoring points.
   */
  nearbyPoints: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.oneOfType([
        PropTypes.string,
        PropTypes.number,
      ]).isRequired,
      lat: PropTypes.number.isRequired,
      lon: PropTypes.number.isRequired,
      areaName: PropTypes.string.isRequired,
      aqi: PropTypes.number.isRequired,
      pollutants: PropTypes.shape({
        pm2_5: PropTypes.number,
        pm10: PropTypes.number,
        nitrogen_dioxide: PropTypes.number,
        ozone: PropTypes.number,
        carbon_monoxide: PropTypes.number,
      }),
    })
  ).isRequired,

  /**
   * Confidence level used for map visualization.
   */
  confidenceScore: PropTypes.string.isRequired,

  /**
   * Wind overlay information.
   */
  windData: PropTypes.shape({
    direction: PropTypes.number.isRequired,
    speed: PropTypes.number.isRequired,
  }),
  windError: PropTypes.string,
};

LocationMap.defaultProps = {
  windData: null,
};