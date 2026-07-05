import { useEffect, useState } from 'react';
import { CITY_COORDINATES } from '../constants/cities';
import { fetchAirQualityByCoords, getAQIBand } from '../services/airQualityService';

/* ─── AQI sub-index breakpoints (US EPA standard) ─────────────────────────── */

function subAqi(concentration, breakpoints) {
  for (const bp of breakpoints) {
    if (concentration >= bp.cLow && concentration <= bp.cHigh) {
      return Math.round(
        ((bp.iHigh - bp.iLow) / (bp.cHigh - bp.cLow)) * (concentration - bp.cLow) + bp.iLow
      );
    }
  }
  return concentration > breakpoints[breakpoints.length - 1].cHigh ? 500 : 0;
}

const BP_PM25 = [
  { cLow: 0, cHigh: 12.0, iLow: 0, iHigh: 50 },
  { cLow: 12.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
  { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
  { cLow: 55.5, cHigh: 150.4, iLow: 151, iHigh: 200 },
  { cLow: 150.5, cHigh: 250.4, iLow: 201, iHigh: 300 },
  { cLow: 250.5, cHigh: 500.4, iLow: 301, iHigh: 500 },
];

const BP_PM10 = [
  { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
  { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
  { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
  { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
  { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
  { cLow: 425, cHigh: 604, iLow: 301, iHigh: 500 },
];

const BP_NO2 = [
  { cLow: 0, cHigh: 100, iLow: 0, iHigh: 50 },
  { cLow: 102, cHigh: 188, iLow: 51, iHigh: 100 },
  { cLow: 190, cHigh: 677, iLow: 101, iHigh: 150 },
  { cLow: 679, cHigh: 1220, iLow: 151, iHigh: 200 },
  { cLow: 1222, cHigh: 2348, iLow: 201, iHigh: 300 },
  { cLow: 2350, cHigh: 3852, iLow: 301, iHigh: 500 },
];

const BP_O3 = [
  { cLow: 0, cHigh: 116, iLow: 0, iHigh: 50 },
  { cLow: 118, cHigh: 147, iLow: 51, iHigh: 100 },
  { cLow: 149, cHigh: 186, iLow: 101, iHigh: 150 },
  { cLow: 188, cHigh: 225, iLow: 151, iHigh: 200 },
  { cLow: 227, cHigh: 733, iLow: 201, iHigh: 300 },
];

const BP_CO = [
  { cLow: 0, cHigh: 4700, iLow: 0, iHigh: 50 },
  { cLow: 4701, cHigh: 9800, iLow: 51, iHigh: 100 },
  { cLow: 9801, cHigh: 14700, iLow: 101, iHigh: 150 },
  { cLow: 14701, cHigh: 19600, iLow: 151, iHigh: 200 },
  { cLow: 19601, cHigh: 34300, iLow: 201, iHigh: 300 },
  { cLow: 34301, cHigh: 51500, iLow: 301, iHigh: 500 },
];

function estimateAQI(pm25, pm10, no2, o3, co) {
  const scores = [
    subAqi(pm25, BP_PM25),
    subAqi(pm10, BP_PM10),
    subAqi(no2, BP_NO2),
    subAqi(o3, BP_O3),
    subAqi(co, BP_CO),
  ];
  return Math.max(...scores);
}

/* ─── Preset intervention scenarios ──────────────────────────────────────── */

const PRESETS = [
  {
    id: 'traffic',
    icon: '🚗',
    label: 'Traffic Control',
    description: 'Odd-even driving, EV mandates',
    pm25: 10,
    no2: 20,
    o3: 5,
  },
  {
    id: 'industrial',
    icon: '🏭',
    label: 'Industrial Limits',
    description: 'Stricter stack emission caps',
    pm25: 25,
    no2: 15,
    o3: 0,
  },
  {
    id: 'green',
    icon: '🌳',
    label: 'Green Cover',
    description: 'Urban forestry & park expansion',
    pm25: 10,
    no2: 5,
    o3: 15,
  },
  {
    id: 'clean-fuel',
    icon: '⚡',
    label: 'Clean Fuel Switch',
    description: 'Replace petrol/diesel with CNG/EV',
    pm25: 20,
    no2: 30,
    o3: 10,
  },
  {
    id: 'combined',
    icon: '🌐',
    label: 'Combined Policy',
    description: 'All interventions together',
    pm25: 50,
    no2: 50,
    o3: 50,
  },
];

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function ScenarioSimulator({ current }) {
  const [pm25Reduction, setPm25Reduction] = useState(0);
  const [no2Reduction, setNo2Reduction] = useState(0);
  const [o3Reduction, setO3Reduction] = useState(0);
  const [activePreset, setActivePreset] = useState(null);

  // Multi-city: selected city names (start with just the first city as placeholder;
  // the "active" city always uses `current` prop directly)
  const [selectedCities, setSelectedCities] = useState([]);
  // Map of cityName → fetched current pollutant data
  const [cityData, setCityData] = useState({});
  const [cityLoadingSet, setCityLoadingSet] = useState(new Set());
  const [cityErrorSet, setCityErrorSet] = useState(new Set());

  /* ── Preset apply ── */
  function applyPreset(preset) {
    if (activePreset === preset.id) {
      // Deselect — reset sliders
      setActivePreset(null);
      setPm25Reduction(0);
      setNo2Reduction(0);
      setO3Reduction(0);
    } else {
      setActivePreset(preset.id);
      setPm25Reduction(preset.pm25);
      setNo2Reduction(preset.no2);
      setO3Reduction(preset.o3);
    }
  }

  /* ── City toggle ── */
  function toggleCity(cityName) {
    setSelectedCities((prev) => {
      if (prev.includes(cityName)) {
        return prev.filter((c) => c !== cityName);
      }
      return [...prev, cityName];
    });
  }

  /* ── Fetch data for newly selected cities ── */
  useEffect(() => {
    for (const cityName of selectedCities) {
      if (cityData[cityName] || cityLoadingSet.has(cityName)) continue;

      const city = CITY_COORDINATES.find((c) => c.name === cityName);
      if (!city) continue;

      setCityLoadingSet((prev) => new Set(prev).add(cityName));

      fetchAirQualityByCoords(city.lat, city.lon)
        .then((result) => {
          setCityData((prev) => ({ ...prev, [cityName]: result.current }));
          setCityLoadingSet((prev) => {
            const next = new Set(prev);
            next.delete(cityName);
            return next;
          });
        })
        .catch(() => {
          setCityErrorSet((prev) => new Set(prev).add(cityName));
          setCityLoadingSet((prev) => {
            const next = new Set(prev);
            next.delete(cityName);
            return next;
          });
        });
    }
  }, [selectedCities, cityData, cityLoadingSet]);

  /* ── Derived values for the "active city" (from prop) ── */
  const reducedPm25 = current.pm2_5 * (1 - pm25Reduction / 100);
  const reducedNo2 = current.nitrogen_dioxide * (1 - no2Reduction / 100);
  const reducedO3 = current.ozone * (1 - o3Reduction / 100);

  const estimatedAqi = estimateAQI(
    Math.round(reducedPm25),
    current.pm10,
    Math.round(reducedNo2),
    Math.round(reducedO3),
    current.carbon_monoxide
  );

  const currentBand = getAQIBand(current.us_aqi);
  const estimatedBand = getAQIBand(estimatedAqi);

  const improvement =
    current.us_aqi > 0
      ? Math.round(((current.us_aqi - estimatedAqi) / current.us_aqi) * 100)
      : 0;

  /* ── Compute simulated result for a comparison city ── */
  function simulateCity(data) {
    const rPm25 = data.pm2_5 * (1 - pm25Reduction / 100);
    const rNo2 = data.nitrogen_dioxide * (1 - no2Reduction / 100);
    const rO3 = data.ozone * (1 - o3Reduction / 100);
    const simAqi = estimateAQI(
      Math.round(rPm25),
      data.pm10,
      Math.round(rNo2),
      Math.round(rO3),
      data.carbon_monoxide
    );
    const imp =
      data.us_aqi > 0
        ? Math.round(((data.us_aqi - simAqi) / data.us_aqi) * 100)
        : 0;
    return {
      simAqi,
      simBand: getAQIBand(simAqi),
      improvement: imp,
      rPm25: Math.round(rPm25),
      rNo2: Math.round(rNo2),
      rO3: Math.round(rO3),
    };
  }

  return (
    <section className="panel scenario-simulator" aria-labelledby="sim-heading">
      {/* ── Header ── */}
      <div className="panel-head">
        <h2 id="sim-heading">🧪 Scenario Simulator</h2>
        <p>
          Adjust sliders or pick a preset to see how interventions could improve AQI across cities.
        </p>
      </div>

      {/* ── Preset Scenario Cards ── */}
      <div className="sim-presets" role="group" aria-label="Intervention presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={`sim-preset-card${activePreset === preset.id ? ' active' : ''}`}
            onClick={() => applyPreset(preset)}
            aria-pressed={activePreset === preset.id}
          >
            <span className="sim-preset-icon">{preset.icon}</span>
            <span className="sim-preset-label">{preset.label}</span>
            <span className="sim-preset-desc">{preset.description}</span>
            <span className="sim-preset-tags">
              {preset.pm25 > 0 && <span className="sim-tag">PM2.5 −{preset.pm25}%</span>}
              {preset.no2 > 0 && <span className="sim-tag">NO₂ −{preset.no2}%</span>}
              {preset.o3 > 0 && <span className="sim-tag">O₃ −{preset.o3}%</span>}
            </span>
          </button>
        ))}
      </div>

      {/* ── Sliders ── */}
      <div className="sim-sliders" role="group" aria-label="Pollutant reduction sliders">
        <SliderGroup
          id="slider-pm25"
          label="Reduce PM2.5"
          emoji="🌫️"
          value={pm25Reduction}
          onChange={(v) => { setActivePreset(null); setPm25Reduction(v); }}
          current={current.pm2_5}
          unit="µg/m³"
        />
        <SliderGroup
          id="slider-no2"
          label="Reduce NO₂"
          emoji="🚦"
          value={no2Reduction}
          onChange={(v) => { setActivePreset(null); setNo2Reduction(v); }}
          current={current.nitrogen_dioxide}
          unit="µg/m³"
        />
        <SliderGroup
          id="slider-o3"
          label="Reduce Ozone"
          emoji="☀️"
          value={o3Reduction}
          onChange={(v) => { setActivePreset(null); setO3Reduction(v); }}
          current={current.ozone}
          unit="µg/m³"
        />
      </div>

      {/* ── Active-city AQI comparison ── */}
      <div className="sim-comparison" role="region" aria-label="Active city AQI comparison">
        <div className="sim-side sim-current">
          <span className="sim-label">Current AQI</span>
          <span className="sim-value" style={{ color: currentBand.color }}>
            {current.us_aqi}
          </span>
          <span className="sim-band" style={{ color: currentBand.color }}>
            {currentBand.label}
          </span>
        </div>

        <div className="sim-arrow-wrap" aria-hidden="true">
          <span className="sim-arrow-big">→</span>
          {improvement > 0 && (
            <span className="sim-improvement-badge">−{improvement}%</span>
          )}
          {improvement < 0 && (
            <span className="sim-worsened-badge">+{Math.abs(improvement)}%</span>
          )}
        </div>

        <div className="sim-side sim-estimated">
          <span className="sim-label">Estimated AQI</span>
          <span className="sim-value" style={{ color: estimatedBand.color }}>
            {estimatedAqi}
          </span>
          <span className="sim-band" style={{ color: estimatedBand.color }}>
            {estimatedBand.label}
          </span>
        </div>
      </div>

      {/* ── Multi-city selector ── */}
      <div className="sim-city-section">
        <p className="sim-section-label">Compare with other cities:</p>
        <div className="sim-city-selector" role="group" aria-label="City comparison selector">
          {CITY_COORDINATES.map((city) => (
            <button
              key={city.name}
              type="button"
              className={`sim-city-chip${selectedCities.includes(city.name) ? ' active' : ''}`}
              onClick={() => toggleCity(city.name)}
              aria-pressed={selectedCities.includes(city.name)}
            >
              {city.name}
              {cityLoadingSet.has(city.name) && (
                <span className="sim-chip-spinner" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── City comparison result grid ── */}
      {selectedCities.length > 0 && (
        <div className="sim-city-results" role="region" aria-label="City simulation results">
          {selectedCities.map((cityName) => {
            if (cityLoadingSet.has(cityName)) {
              return (
                <div key={cityName} className="sim-city-result-card sim-loading-card">
                  <span className="sim-loading-spinner" aria-hidden="true" />
                  <span>Loading {cityName}…</span>
                </div>
              );
            }

            if (cityErrorSet.has(cityName)) {
              return (
                <div key={cityName} className="sim-city-result-card sim-error-card">
                  <span>⚠️ Could not fetch {cityName} data.</span>
                </div>
              );
            }

            const data = cityData[cityName];
            if (!data) return null;

            const { simAqi, simBand, improvement: imp, rPm25, rNo2, rO3 } = simulateCity(data);
            const origBand = getAQIBand(data.us_aqi);

            return (
              <div key={cityName} className="sim-city-result-card">
                <div className="sim-city-result-header">
                  <span className="sim-city-name">{cityName}</span>
                  {imp > 0 && (
                    <span className="sim-improvement">−{imp}% better</span>
                  )}
                  {imp < 0 && (
                    <span className="sim-worsened">+{Math.abs(imp)}% worse</span>
                  )}
                  {imp === 0 && <span className="sim-no-change">No change</span>}
                </div>

                <div className="sim-city-aqi-row">
                  <div className="sim-mini-aqi">
                    <span className="sim-mini-label">Now</span>
                    <span className="sim-mini-value" style={{ color: origBand.color }}>
                      {data.us_aqi}
                    </span>
                    <span className="sim-mini-band" style={{ color: origBand.color }}>
                      {origBand.label}
                    </span>
                  </div>
                  <span className="sim-mini-arrow" aria-hidden="true">→</span>
                  <div className="sim-mini-aqi">
                    <span className="sim-mini-label">Simulated</span>
                    <span className="sim-mini-value" style={{ color: simBand.color }}>
                      {simAqi}
                    </span>
                    <span className="sim-mini-band" style={{ color: simBand.color }}>
                      {simBand.label}
                    </span>
                  </div>
                </div>

                <table className="sim-pollutant-table" aria-label={`Pollutant before/after for ${cityName}`}>
                  <thead>
                    <tr>
                      <th>Pollutant</th>
                      <th>Before</th>
                      <th></th>
                      <th>After</th>
                    </tr>
                  </thead>
                  <tbody>
                    <PollutantRow label="PM2.5" before={data.pm2_5} after={rPm25} unit="µg/m³" />
                    <PollutantRow label="NO₂" before={data.nitrogen_dioxide} after={rNo2} unit="µg/m³" />
                    <PollutantRow label="Ozone" before={data.ozone} after={rO3} unit="µg/m³" />
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function SliderGroup({ id, label, emoji, value, onChange, current, unit }) {
  const reduced = Math.round(current * (1 - value / 100));
  return (
    <div className="sim-slider-group">
      <label htmlFor={id}>
        <span className="sim-slider-emoji" aria-hidden="true">{emoji}</span>
        {label}
        <span className="sim-slider-value">{value}%</span>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={50}
        step={5}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={`${label} reduction percentage`}
      />
      <div className="sim-slider-range">
        <span>Current: {current} {unit}</span>
        <span>Target: {reduced} {unit}</span>
      </div>
    </div>
  );
}

function PollutantRow({ label, before, after, unit }) {
  const improved = after < before;
  return (
    <tr className="sim-pollutant-row">
      <td>{label}</td>
      <td>{before} <small>{unit}</small></td>
      <td className="sim-table-arrow" aria-hidden="true">→</td>
      <td className={improved ? 'sim-val-better' : 'sim-val-same'}>
        {after} <small>{unit}</small>
      </td>
    </tr>
  );
}
