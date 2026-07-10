import { useEffect, useMemo, useRef } from 'react';
import { SAFE_LIMITS } from '../constants/cities';

function buildWarnings(current) {
  const warnings = [];
  if (current.pm2_5 > SAFE_LIMITS.pm2_5) warnings.push('PM2.5 is high. Wear a certified mask and avoid heavy outdoor exercise.');
  if (current.pm10 > SAFE_LIMITS.pm10) warnings.push('PM10 is elevated. Keep windows closed during peak traffic hours.');
  if (current.nitrogen_dioxide > SAFE_LIMITS.nitrogen_dioxide) warnings.push('NO2 levels are unsafe. Reduce roadside exposure if possible.');
  if (current.ozone > SAFE_LIMITS.ozone) warnings.push('Ozone levels are high. Limit outdoor activity during peak sunlight hours.');
  if (current.us_aqi > 120) warnings.push('AQI suggests unhealthy conditions. Avoid outdoor activities today.');
  return warnings;
}

export default function AlertsPanel({ cityName, current, confidenceScore , exposureEstimate}) {
  if (!current) {return null;}
  const warnings = useMemo(() => buildWarnings(current), [current]);
  const lastNotified = useRef('');

  useEffect(() => {
    if (!('Notification' in window)) return;

    if (!warnings.length) {
      lastNotified.current = '';
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

    if (Notification.permission === 'granted') {
      sendNotification();
      return;
    }

    if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') sendNotification();
      });
    }
  }, [warnings, cityName, current.us_aqi]);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Alerts & Notifications</h2>
        <p>Health warnings based on safe pollutant thresholds</p>
      </div>

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
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </>
      ) : (
        <p className="safe-note">Air quality is within safer limits right now. Keep monitoring for changes.</p>
      )}
    </section>
  );
}
