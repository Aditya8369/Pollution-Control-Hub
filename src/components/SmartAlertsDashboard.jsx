import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationSettings, parseThreshold, DEFAULT_NOTIFICATION_SETTINGS } from '../hooks/useNotificationSettings';
import { fetchAirQualityByCoords } from '../services/airQualityService';
import { 
  checkThresholdBreaches, 
  filterRecentAlerts, 
  getAlertHistory, 
  saveAlertHistory, 
  notifyBrowser,
  clearAlertHistory,
  formatPollutantName
} from '../services/smartAlertService';
import './SmartAlertsDashboard.css';

const POLLUTANT_FIELDS = [
    { key: 'pm2_5', label: 'PM2.5' },
    { key: 'pm10', label: 'PM10' },
    { key: 'nitrogen_dioxide', label: 'NO₂' },
    { key: 'ozone', label: 'Ozone' },
    { key: 'carbon_monoxide', label: 'CO' },
];

export default function SmartAlertsDashboard({ position }) {
  const { t } = useTranslation();
  const { settings, updateSettings } = useNotificationSettings();
  
  // Data states
  const [currentData, setCurrentData] = useState(null);
  const [forecastData, setForecastData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // History state
  const [history, setHistory] = useState(() => getAlertHistory());
  
  // Permission state
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported'
  );
  const [fallbackToast, setFallbackToast] = useState(null);

  const cityName = position?.cityName || 'Unknown Location';

  // Load AQI Data
  const loadData = useCallback(async () => {
    if (!position?.lat || !position?.lon) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAirQualityByCoords(position.lat, position.lon, undefined, true);
      setCurrentData(data.current);
      setForecastData(data.trend || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch AQI data');
    } finally {
      setLoading(false);
    }
  }, [position]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Detection logic effect
  useEffect(() => {
    if (!currentData || !settings) return;
    if (!settings.alertsEnabled) return;
    
    const breaches = checkThresholdBreaches(currentData, forecastData, settings, cityName);
    const newAlerts = filterRecentAlerts(breaches, history);
    
    if (newAlerts.length > 0) {
      const updatedHistory = [...newAlerts, ...history].slice(0, 100);
      setHistory(updatedHistory);
      saveAlertHistory(updatedHistory);
      notifyBrowser(newAlerts, (alerts) => {
        // Fallback callback if notifications denied
        setFallbackToast(alerts[0].message);
        setTimeout(() => setFallbackToast(null), 5000);
      });
    }
  }, [currentData, forecastData, settings, cityName, history]);

  const requestPermission = useCallback(() => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(setPermission);
  }, []);

  const handleClearHistory = useCallback(() => {
    clearAlertHistory();
    setHistory([]);
  }, []);

  const togglePollutant = (key) => {
    const current = settings.activePollutants || [];
    const updated = current.includes(key) 
      ? current.filter(p => p !== key)
      : [...current, key];
    updateSettings({ activePollutants: updated });
  };

  const updatePollutantThreshold = (key, val) => {
    const parsed = parseThreshold(val);
    if (parsed !== null) {
      updateSettings({
        pollutantThresholds: {
          ...settings.pollutantThresholds,
          [key]: parsed
        }
      });
    }
  };

  const updateAqiThreshold = (val) => {
    const parsed = parseThreshold(val);
    if (parsed !== null) {
      updateSettings({ aqiThreshold: parsed });
    }
  };

  const resetToDefaults = () => {
    updateSettings(DEFAULT_NOTIFICATION_SETTINGS);
  };

  if (loading) {
    return (
      <div className="smart-alerts-dashboard" role="status" aria-live="polite">
        <div className="smart-alerts-loading">
          <span className="spinner"></span>
          {t('smartAlerts.loading', 'Loading Smart Alerts...')}
        </div>
      </div>
    );
  }

  return (
    <div className="smart-alerts-dashboard">
      <header className="smart-alerts-header">
        <h2>{t('smartAlerts.title', 'Smart Personalized Alerts')}</h2>
        <p>{t('smartAlerts.subtitle', 'Configure custom thresholds and get predictive notifications.')}</p>
      </header>

      {fallbackToast && (
        <div className="alert-toast" role="alert" aria-live="assertive">
          {fallbackToast}
        </div>
      )}

      {error && (
        <div className="alert-error-banner" role="alert">
          {error}
          <button onClick={loadData} className="btn-retry">Retry</button>
        </div>
      )}

      <div className="smart-alerts-grid">
        {/* Settings Panel */}
        <section className="smart-alerts-panel settings-panel" aria-labelledby="settings-heading">
          <h3 id="settings-heading">Notification Preferences</h3>
          
          <div className="preferences-header">
            <label className="toggle-label">
              <input 
                type="checkbox" 
                checked={settings.alertsEnabled}
                onChange={(e) => updateSettings({ alertsEnabled: e.target.checked })}
                aria-label="Enable all personalized alerts"
              />
              <span className="toggle-text">Enable Smart Alerts</span>
            </label>
            <button onClick={resetToDefaults} className="btn-reset" aria-label="Reset thresholds to defaults">
              Reset Defaults
            </button>
          </div>

          <div className="permission-status">
            <strong>Browser Notifications: </strong>
            <span className={`status-${permission}`} aria-live="polite">{permission}</span>
            {permission === 'default' && (
              <button onClick={requestPermission} className="btn-enable-notif" aria-label="Request browser notification permission">
                Enable Browser Notifications
              </button>
            )}
            {permission === 'unsupported' && (
              <p className="browser-warning">Your browser doesn't support push notifications. In-app alerts will be used.</p>
            )}
            {permission === 'denied' && (
              <p className="browser-warning">Notifications are blocked by your browser. You will only see in-app alerts.</p>
            )}
          </div>

          <div className={`thresholds-editor ${!settings.alertsEnabled ? 'disabled' : ''}`}>
            <div className="threshold-group aqi-group">
              <h4>Global AQI Threshold</h4>
              <p className="help-text">Notify me when the overall Air Quality Index exceeds this value:</p>
              <div className="input-with-label">
                <input 
                  type="number" 
                  min="0"
                  value={settings.aqiThreshold}
                  onChange={e => updateAqiThreshold(e.target.value)}
                  className="threshold-input"
                  disabled={!settings.alertsEnabled}
                  aria-label="AQI Threshold value"
                />
                <span className="unit">AQI</span>
              </div>
            </div>
            
            <div className="threshold-group pollutants-group">
              <h4>Pollutant-Specific Thresholds</h4>
              <p className="help-text">Select pollutants to monitor and configure their limits (µg/m³):</p>
              
              <div className="pollutants-list">
                {POLLUTANT_FIELDS.map(({ key, label }) => {
                  const isActive = settings.activePollutants?.includes(key);
                  const val = settings.pollutantThresholds[key];
                  
                  return (
                    <div key={key} className={`pollutant-threshold-row ${isActive ? 'active' : ''}`}>
                      <label className="pollutant-checkbox">
                        <input 
                          type="checkbox"
                          checked={isActive}
                          onChange={() => togglePollutant(key)}
                          disabled={!settings.alertsEnabled}
                          aria-label={`Monitor ${label}`}
                        />
                        <span className="pollutant-name">{label}</span>
                      </label>
                      <input 
                        type="number" 
                        min="0"
                        value={val !== undefined ? val : ''}
                        onChange={e => updatePollutantThreshold(key, e.target.value)}
                        className="threshold-input"
                        disabled={!settings.alertsEnabled || !isActive}
                        aria-label={`${label} threshold`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Status Panel */}
        <section className="smart-alerts-panel current-status-panel" aria-labelledby="status-heading">
          <h3 id="status-heading">Monitoring Location: {cityName}</h3>
          
          {!position?.lat ? (
            <p className="missing-location">Please select a location to monitor air quality.</p>
          ) : currentData ? (
            <div className="current-stats">
              <div className={`stat-box severity-${checkAqiSeverity(currentData.us_aqi)}`}>
                <span className="stat-label">Current AQI</span>
                <span className="stat-value">{currentData.us_aqi}</span>
              </div>
              
              <div className="pollutants-grid">
                {settings.activePollutants?.map(key => {
                  const val = currentData[key];
                  const thresh = settings.pollutantThresholds[key];
                  const isBreaching = val > thresh;
                  
                  return (
                    <div key={key} className={`pollutant-mini-stat ${isBreaching ? 'breaching' : ''}`}>
                      <span className="mini-label">{formatPollutantName(key)}</span>
                      <span className="mini-val">{val !== undefined ? val : '--'}</span>
                      {isBreaching && <span className="warning-icon" aria-label="Threshold breached">⚠️</span>}
                    </div>
                  );
                })}
                {settings.activePollutants?.length === 0 && (
                  <p className="no-pollutants-selected">No specific pollutants selected for monitoring.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="no-data">Data temporarily unavailable.</p>
          )}

          {/* Predictive Summary */}
          {forecastData?.length > 0 && settings.alertsEnabled && (
            <div className="forecast-summary">
              <h4>Forecast Outlook</h4>
              <PredictiveBreachSummary 
                forecastData={forecastData} 
                settings={settings} 
              />
            </div>
          )}
        </section>

        {/* History Panel */}
        <section className="smart-alerts-panel history-panel" aria-labelledby="history-heading">
          <div className="history-header">
            <h3 id="history-heading">Alert History</h3>
            {history.length > 0 && (
              <button onClick={handleClearHistory} className="btn-clear-history" aria-label="Clear alert history">
                Clear History
              </button>
            )}
          </div>
          
          {history.length === 0 ? (
            <div className="no-history-state">
              <p>No alerts recorded yet. You're breathing clean air!</p>
            </div>
          ) : (
            <ul className="history-list">
              {history.map(alert => (
                <li key={alert.id} className={`history-item severity-${alert.severity}`}>
                  <div className="history-meta">
                    <span className="history-time">{new Date(alert.timestamp).toLocaleString()}</span>
                    <span className="history-loc">{alert.location}</span>
                    <span className={`badge-type badge-${alert.type}`}>{alert.type}</span>
                  </div>
                  <div className="history-msg">{alert.message}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function checkAqiSeverity(aqi) {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy-sensitive';
  if (aqi <= 200) return 'unhealthy';
  if (aqi <= 300) return 'very-unhealthy';
  return 'hazardous';
}

function PredictiveBreachSummary({ forecastData, settings }) {
  const breaches = useMemo(() => {
    const b = [];
    const { aqiThreshold, pollutantThresholds, activePollutants = [] } = settings;
    
    // Simplistic forward scan to find the *first* breach
    const aqiBreach = forecastData.find(f => f.us_aqi > aqiThreshold);
    if (aqiBreach) {
      b.push(`AQI expected to exceed ${aqiThreshold}`);
    }
    
    activePollutants.forEach(p => {
      const thresh = pollutantThresholds[p];
      if (thresh !== undefined) {
        const pBreach = forecastData.find(f => f[p] > thresh);
        if (pBreach) {
          b.push(`${formatPollutantName(p)} expected to exceed ${thresh}`);
        }
      }
    });
    return b;
  }, [forecastData, settings]);

  if (breaches.length === 0) {
    return <p className="forecast-clear">No upcoming threshold breaches detected in the forecast.</p>;
  }

  return (
    <ul className="forecast-breaches">
      {breaches.map((b, i) => (
        <li key={i} className="upcoming-warning">⚠️ {b}</li>
      ))}
    </ul>
  );
}
