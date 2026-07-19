/**
 * e2e/fixtures/api-mocks.js
 *
 * Deterministic mock payloads that mirror the shape of real Open-Meteo API
 * responses.  Using mocks keeps tests:
 *   - Fast  (no real network calls)
 *   - Deterministic (no rate-limit or data-variance surprises)
 *   - Offline-friendly (CI runners often have restricted egress)
 */

// ── Shared helpers ───────────────────────────────────────────────────────────

/** Build an array of ISO-8601 hourly timestamps starting from a fixed anchor. */
function buildHourlyTimes(hours = 24, anchorISO = '2024-01-15T00:00') {
  return Array.from({ length: hours }, (_, i) => {
    const d = new Date(anchorISO);
    d.setHours(d.getHours() + i);
    return d.toISOString().slice(0, 16); // "2024-01-15T00:00"
  });
}

/** Repeat a value pattern across `hours` slots. */
function buildHourlyValues(pattern, hours = 24) {
  return Array.from({ length: hours }, (_, i) => pattern[i % pattern.length]);
}

// ── AQI (air-quality) mock ───────────────────────────────────────────────────

/**
 * Mimics: https://air-quality-api.open-meteo.com/v1/air-quality
 * for Delhi (lat 28.6139, lon 77.2090)
 */
export const MOCK_AQI_RESPONSE_DELHI = {
  latitude: 28.6139,
  longitude: 77.209,
  generationtime_ms: 0.42,
  utc_offset_seconds: 19800,
  timezone: 'Asia/Kolkata',
  timezone_abbreviation: 'IST',
  hourly_units: {
    time: 'iso8601',
    us_aqi: 'us_aqi',
    pm2_5: 'μg/m³',
    pm10: 'μg/m³',
    carbon_monoxide: 'μg/m³',
    nitrogen_dioxide: 'μg/m³',
    ozone: 'μg/m³',
    sulphur_dioxide: 'μg/m³',
    dust: 'μg/m³',
  },
  hourly: {
    time: buildHourlyTimes(24),
    // Unhealthy band: 151-200
    us_aqi: buildHourlyValues([155, 162, 170, 158, 165, 172, 160, 155,
                               148, 152, 165, 178, 183, 175, 168, 160,
                               155, 162, 170, 175, 180, 172, 168, 162]),
    pm2_5:   buildHourlyValues([58, 62, 67, 60, 63, 68, 61, 58, 54, 57, 63, 70, 72, 68, 65, 61, 58, 62, 67, 70, 72, 68, 65, 62]),
    pm10:    buildHourlyValues([90, 95, 102, 91, 96, 104, 93, 90, 85, 88, 96, 108, 111, 104, 100, 93, 90, 95, 102, 108, 111, 104, 100, 95]),
    carbon_monoxide: buildHourlyValues([800, 820, 850, 810, 825, 855, 815, 800, 780, 795, 825, 870, 880, 862, 845, 815, 800, 820, 850, 870, 880, 862, 845, 820]),
    nitrogen_dioxide: buildHourlyValues([42, 45, 50, 43, 46, 51, 44, 42, 39, 41, 46, 53, 56, 51, 48, 44, 42, 45, 50, 53, 56, 51, 48, 45]),
    ozone:   buildHourlyValues([35, 38, 42, 36, 39, 43, 37, 35, 32, 34, 39, 46, 48, 44, 41, 37, 35, 38, 42, 46, 48, 44, 41, 38]),
    sulphur_dioxide: buildHourlyValues([18, 20, 23, 19, 21, 24, 19, 18, 17, 18, 21, 25, 27, 24, 22, 19, 18, 20, 23, 25, 27, 24, 22, 20]),
    dust:    buildHourlyValues([10, 12, 14, 11, 12, 15, 11, 10, 9, 10, 12, 16, 17, 15, 14, 11, 10, 12, 14, 16, 17, 15, 14, 12]),
  },
};

/**
 * Good AQI mock — used to test the green/Good badge state.
 * Mimics a clean-air city (e.g. Shimla).
 */
export const MOCK_AQI_RESPONSE_GOOD = {
  ...MOCK_AQI_RESPONSE_DELHI,
  latitude: 31.1048,
  longitude: 77.1734,
  hourly: {
    ...MOCK_AQI_RESPONSE_DELHI.hourly,
    us_aqi: buildHourlyValues([22, 25, 28, 24, 26, 30, 25, 22, 20, 23, 26, 32, 34, 31, 28, 25, 22, 25, 28, 32, 34, 31, 28, 25]),
    pm2_5:  buildHourlyValues([8, 9, 10, 8, 9, 11, 9, 8, 7, 8, 9, 12, 13, 11, 10, 9, 8, 9, 10, 12, 13, 11, 10, 9]),
  },
};

/**
 * Hazardous AQI mock — tests the critical alert / red banner states.
 */
export const MOCK_AQI_RESPONSE_HAZARDOUS = {
  ...MOCK_AQI_RESPONSE_DELHI,
  hourly: {
    ...MOCK_AQI_RESPONSE_DELHI.hourly,
    us_aqi: buildHourlyValues([320, 335, 350, 340, 355, 362, 348, 335,
                               328, 340, 355, 370, 378, 365, 358, 345,
                               335, 342, 355, 368, 378, 362, 355, 342]),
  },
};

// ── Wind data mock ───────────────────────────────────────────────────────────

export const MOCK_WIND_RESPONSE = {
  latitude: 28.6139,
  longitude: 77.209,
  hourly_units: {
    time: 'iso8601',
    windspeed_10m: 'km/h',
    winddirection_10m: '°',
  },
  hourly: {
    time: buildHourlyTimes(24),
    windspeed_10m: buildHourlyValues([8, 10, 12, 9, 11, 13, 10, 8, 7, 9, 11, 14, 15, 13, 12, 10, 8, 10, 12, 14, 15, 13, 12, 10]),
    winddirection_10m: buildHourlyValues([270, 275, 280, 272, 278, 282, 275, 270, 265, 272, 278, 285, 288, 282, 278, 275, 270, 275, 280, 285, 288, 282, 278, 275]),
  },
};

// ── Geocoding mock (Open-Meteo geocoding API) ────────────────────────────────

export const MOCK_GEOCODING_RESPONSE_MUMBAI = {
  results: [
    {
      id: 1275339,
      name: 'Mumbai',
      latitude: 19.0728,
      longitude: 72.8826,
      elevation: 14,
      feature_code: 'PPLA',
      country_code: 'IN',
      admin1_id: 4008096,
      timezone: 'Asia/Kolkata',
      population: 12691836,
      country_id: 1269750,
      country: 'India',
      admin1: 'Maharashtra',
    },
  ],
  generationtime_ms: 0.85,
};

export const MOCK_GEOCODING_RESPONSE_EMPTY = {
  results: [],
  generationtime_ms: 0.12,
};

// ── Grid / nearby-points mock ────────────────────────────────────────────────

export const MOCK_NEARBY_POINTS = [
  { lat: 28.7039, lon: 77.299, label: 'North-East zone', aqi: 168 },
  { lat: 28.5239, lon: 77.119, label: 'South-West zone', aqi: 145 },
  { lat: 28.6139, lon: 77.389, label: 'East zone',       aqi: 172 },
  { lat: 28.6139, lon: 77.029, label: 'West zone',       aqi: 158 },
  { lat: 28.7039, lon: 77.119, label: 'North-West zone', aqi: 151 },
  { lat: 28.5239, lon: 77.299, label: 'South-East zone', aqi: 163 },
];

// ── URL matchers (for page.route() intercepts) ───────────────────────────────

export const API_PATTERNS = {
  /** Matches any Open-Meteo air-quality request */
  airQuality: '**/air-quality-api.open-meteo.com/**',
  /** Matches any Open-Meteo main forecast/geocoding request */
  forecast: '**/api.open-meteo.com/**',
  /** Matches the geocoding lookup */
  geocoding: '**/geocoding-api.open-meteo.com/**',
};
