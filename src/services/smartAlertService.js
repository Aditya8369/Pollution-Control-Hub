export const SMART_ALERTS_STORAGE_KEY = 'smart-alerts-history';
export const COOLDOWN_MINUTES = 60;

export function getAlertHistory() {
  try {
    const raw = localStorage.getItem(SMART_ALERTS_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveAlertHistory(history) {
  try {
    localStorage.setItem(SMART_ALERTS_STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save alert history', e);
  }
}

export function clearAlertHistory() {
  try {
    localStorage.removeItem(SMART_ALERTS_STORAGE_KEY);
  } catch (e) {}
}

export function generateAlertId(location, pollutant, type, timestamp) {
  return `${location}-${pollutant}-${type}-${timestamp}`;
}

export function checkThresholdBreaches(currentData, forecastData, settings, location) {
  const breaches = [];
  const now = Date.now();
  
  if (!currentData || !settings) return breaches;
  
  if (!settings.alertsEnabled) return breaches;

  const { aqiThreshold, pollutantThresholds, activePollutants = [] } = settings;

  // Check Current AQI
  if (currentData.us_aqi > aqiThreshold) {
    breaches.push({
      id: generateAlertId(location, 'aqi', 'current', now),
      pollutant: 'AQI',
      value: currentData.us_aqi,
      threshold: aqiThreshold,
      severity: getSeverity(currentData.us_aqi, aqiThreshold),
      type: 'current',
      message: `Current AQI (${currentData.us_aqi}) exceeds your threshold of ${aqiThreshold}.`,
      timestamp: now,
      location,
    });
  }

  // Check Current Pollutants
  activePollutants.forEach(pollutant => {
    const val = currentData[pollutant];
    const thresh = pollutantThresholds[pollutant];
    if (val !== undefined && val !== null && thresh !== undefined && val > thresh) {
      breaches.push({
        id: generateAlertId(location, pollutant, 'current', now),
        pollutant,
        value: val,
        threshold: thresh,
        severity: getSeverity(val, thresh),
        type: 'current',
        message: `Current ${formatPollutantName(pollutant)} (${val}) exceeds your threshold of ${thresh}.`,
        timestamp: now,
        location,
      });
    }
  });

  // Check Forecasts (if available)
  if (forecastData && forecastData.length > 0) {
    // Forecast AQI
    const upcomingAqi = forecastData.find(f => f.us_aqi > aqiThreshold);
    if (upcomingAqi) {
      breaches.push({
        id: generateAlertId(location, 'aqi', 'forecast', now),
        pollutant: 'AQI',
        value: upcomingAqi.us_aqi,
        threshold: aqiThreshold,
        severity: getSeverity(upcomingAqi.us_aqi, aqiThreshold),
        type: 'forecast',
        message: `Forecasted AQI (${upcomingAqi.us_aqi}) is expected to exceed your threshold.`,
        timestamp: now,
        location,
      });
    }

    // Forecast Pollutants
    activePollutants.forEach(pollutant => {
      const thresh = pollutantThresholds[pollutant];
      if (thresh === undefined) return;
      const upcoming = forecastData.find(f => f[pollutant] !== undefined && f[pollutant] > thresh);
      if (upcoming) {
        breaches.push({
          id: generateAlertId(location, pollutant, 'forecast', now),
          pollutant,
          value: upcoming[pollutant],
          threshold: thresh,
          severity: getSeverity(upcoming[pollutant], thresh),
          type: 'forecast',
          message: `Forecasted ${formatPollutantName(pollutant)} (${upcoming[pollutant]}) is expected to exceed your threshold of ${thresh}.`,
          timestamp: now,
          location,
        });
      }
    });
  }

  return breaches;
}

export function getSeverity(value, threshold) {
  if (threshold <= 0) return 'informational'; // Avoid divide by zero
  const ratio = value / threshold;
  if (ratio >= 2) return 'critical';
  if (ratio >= 1.5) return 'warning';
  return 'informational';
}

export function formatPollutantName(key) {
  const names = {
    pm2_5: 'PM2.5',
    pm10: 'PM10',
    nitrogen_dioxide: 'NO2',
    ozone: 'O3',
    carbon_monoxide: 'CO',
  };
  return names[key] || key;
}

export function filterRecentAlerts(newBreaches, history, cooldownMinutes = COOLDOWN_MINUTES) {
  const now = Date.now();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  
  return newBreaches.filter(breach => {
    // Find the most recent alert for the same location, pollutant, and type
    const recent = history.find(h => 
      h.location === breach.location &&
      h.pollutant === breach.pollutant &&
      h.type === breach.type &&
      (now - h.timestamp) < cooldownMs
    );
    return !recent;
  });
}

export function notifyBrowser(alerts, fallbackCallback = null) {
  const isSupported = 'Notification' in window;
  
  if (!isSupported || Notification.permission !== 'granted') {
    if (fallbackCallback && alerts.length > 0) {
      fallbackCallback(alerts);
    }
    return;
  }
  
  alerts.forEach(alert => {
    try {
      new Notification(`Smart Alert: ${alert.location}`, {
        body: alert.message,
        icon: '/favicon.ico', 
      });
    } catch (e) {
      console.warn("Failed to show browser notification", e);
    }
  });
}
