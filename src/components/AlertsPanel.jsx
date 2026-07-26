import { useEffect, useMemo, useRef, useState } from 'react';
import { SAFE_LIMITS } from '../constants/cities';

const DEFAULT_SETTINGS = {
  aqi: 120,
  pm2_5: 35,
  pm10: 60,
  nitrogen_dioxide: 80,
  ozone: 100,
  carbon_monoxide: 4000,
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '08:00'
};

/**
 * @param {any} current
 * @param {any} settings
 */
function buildWarnings(current, settings) {
  const warnings = [];
  if (current.pm2_5 > settings.pm2_5) {
    warnings.push('PM2.5 is high. Wear a certified mask and avoid heavy outdoor exercise.');
  }
  if (current.pm10 > settings.pm10) {
    warnings.push('PM10 is elevated. Keep windows closed during peak traffic hours.');
  }
  if (current.nitrogen_dioxide > settings.nitrogen_dioxide) {
    warnings.push('NO2 levels are unsafe. Reduce roadside exposure if possible.');
  }
  if (current.ozone > settings.ozone) {
    warnings.push('Ozone levels are high. Limit outdoor activity during peak sunlight hours.');
  }
  if (current.carbon_monoxide > settings.carbon_monoxide) {
    warnings.push('CO levels are high. High levels reduce oxygen delivery to the body.');
  }
  if (current.us_aqi > settings.aqi) {
    warnings.push('AQI suggests unhealthy conditions. Avoid outdoor activities today.');
  }
  return warnings;
}

/** @param {any} params */
export default function AlertsPanel({ cityName, current, confidenceScore , exposureEstimate}) {
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'denied'
  );

  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(() => {
    try {
      const stored = localStorage.getItem('pollution_hub_notification_settings');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error('Failed to parse notification settings', e);
    }
    return { ...DEFAULT_SETTINGS };
  });

  const handleSettingChange = (key, value) => {
    setSettings((prev) => {
      const next = { ...prev, [key]: value };
      localStorage.setItem('pollution_hub_notification_settings', JSON.stringify(next));
      return next;
    });
  };

  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem('pollution_hub_notification_settings', JSON.stringify(DEFAULT_SETTINGS));
  };

  function isQuietHours(start, end) {
    if (!start || !end) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  }

  if (!current) {return null;}
  const warnings = useMemo(() => buildWarnings(current, settings), [current, settings]);
  const lastNotified = useRef('');

  useEffect(() => {
    if (!('Notification' in window)) return;

    if (!warnings.length) {
      lastNotified.current = '';
      return;
    }

    if (settings.quietHoursEnabled && isQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) {
      return;
    }

    const signature = `${cityName}:${warnings.join('|')}`;
    if (lastNotified.current === signature) return;

    const sendNotification = () => {
      new Notification('Pollution Alert', {
        body: `${cityName}: AQI ${current.us_aqi}. ${warnings[0]}`
      });
      lastNotified.current = signature;
    };

    if (permission === 'granted') {
      sendNotification();
      return;
    }
  }, [warnings, cityName, current.us_aqi, permission, settings]);

  const requestNotificationPermission = () => {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then((newPermission) => {
      setPermission(newPermission);
    });
  };

  return (
    <section data-testid="alerts-panel" className="panel">
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Alerts & Notifications</h2>
          <p>Health warnings based on safe pollutant thresholds</p>
        </div>
        <button
          type="button"
          onClick={() => setShowSettings(!showSettings)}
          aria-label="Notification Settings"
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--muted)',
            cursor: 'pointer',
            fontSize: '1.25rem',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          ⚙️
        </button>
      </div>

      {showSettings && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: 'var(--bg-card-alt, rgba(0,0,0,0.02))',
          borderRadius: '8px',
          border: '1px solid var(--line)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--ink)' }}>⚙️ Notification Settings</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="setting-aqi" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>AQI Threshold</label>
              <input
                type="number"
                id="setting-aqi"
                value={settings.aqi}
                onChange={(e) => handleSettingChange('aqi', Number(e.target.value))}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="setting-pm2_5" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>PM2.5 (µg/m³)</label>
              <input
                type="number"
                id="setting-pm2_5"
                value={settings.pm2_5}
                onChange={(e) => handleSettingChange('pm2_5', Number(e.target.value))}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="setting-pm10" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>PM10 (µg/m³)</label>
              <input
                type="number"
                id="setting-pm10"
                value={settings.pm10}
                onChange={(e) => handleSettingChange('pm10', Number(e.target.value))}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="setting-nitrogen_dioxide" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>NO2 (µg/m³)</label>
              <input
                type="number"
                id="setting-nitrogen_dioxide"
                value={settings.nitrogen_dioxide}
                onChange={(e) => handleSettingChange('nitrogen_dioxide', Number(e.target.value))}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="setting-ozone" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>Ozone (µg/m³)</label>
              <input
                type="number"
                id="setting-ozone"
                value={settings.ozone}
                onChange={(e) => handleSettingChange('ozone', Number(e.target.value))}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="setting-carbon_monoxide" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>CO (µg/m³)</label>
              <input
                type="number"
                id="setting-carbon_monoxide"
                value={settings.carbon_monoxide}
                onChange={(e) => handleSettingChange('carbon_monoxide', Number(e.target.value))}
                style={{ padding: '0.4rem', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input
              type="checkbox"
              id="setting-quiet-enabled"
              checked={settings.quietHoursEnabled}
              onChange={(e) => handleSettingChange('quietHoursEnabled', e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="setting-quiet-enabled" style={{ fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', color: 'var(--ink)' }}>Enable Quiet Hours</label>
          </div>

          {settings.quietHoursEnabled && (
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label htmlFor="setting-quiet-start" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>From</label>
                <input
                  type="time"
                  id="setting-quiet-start"
                  value={settings.quietHoursStart}
                  onChange={(e) => handleSettingChange('quietHoursStart', e.target.value)}
                  style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label htmlFor="setting-quiet-end" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)' }}>To</label>
                <input
                  type="time"
                  id="setting-quiet-end"
                  value={settings.quietHoursEnd}
                  onChange={(e) => handleSettingChange('quietHoursEnd', e.target.value)}
                  style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--card)', color: 'var(--ink)', outline: 'none' }}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={handleResetSettings}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem',
                cursor: 'pointer',
                borderRadius: '4px',
                background: 'var(--muted, #52667a)',
                color: 'white',
                border: 'none'
              }}
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}

      {permission === 'default' && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: 'var(--card-bg, #f8fafc)', borderRadius: '0.5rem', border: '1px solid var(--border-color, #e2e8f0)' }}>
          <button 
            type="button"
            onClick={requestNotificationPermission}
            style={{ padding: '0.5rem 1rem', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', fontWeight: '500' }}
          >
            Enable Desktop Notifications
          </button>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', marginTop: '0.5rem', marginBottom: 0 }}>
            Enable notifications to receive real-time pollution alerts.
          </p>
        </div>
      )}

      {exposureEstimate && (
        <div className="exposure-card">
          <h3>Exposure Timer</h3>

         <p className="exposure-message">
            {exposureEstimate.message}
          </p>

          <small className="exposure-note">
            Estimated from recent AQI trends.
          </small>
        </div>
      )}

      {warnings.length ? (
        <>
          {confidenceScore === 'Low' && (
            <p className="low-confidence-note">Warnings based on low-confidence data</p>
          )}
          <ul className="warnings">
            {warnings.map((warning) => (
              <li data-testid="alert-item" key={warning}>{warning}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="safe-note">Air quality is within safer limits right now. Keep monitoring for changes.</p>
      )}
    </section>
  );
}
