// @ts-nocheck
import { useEffect, useState } from 'react';
import { CarFront,Sun } from "lucide-react";
import { CITY_COORDINATES } from '../constants/cities';
import { fetchAirQualityByCoords, getAQIBand, estimateAQI } from '../services/airQualityService';

const PM25GaugeIcon = ({ size = 24 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    >
    {/* Colored AQI gauge */}
    <path
      d="M5 21 A11 11 0 0 1 9 12"
      fill="none"
      stroke="#84cc16"
      strokeWidth="4"
      strokeLinecap="round"
      />

    <path
      d="M9 12 A11 11 0 0 1 16 9"
      fill="none"
      stroke="#eab308"
      strokeWidth="4"
      />

    <path
      d="M16 9 A11 11 0 0 1 23 12"
      fill="none"
      stroke="#f97316"
      strokeWidth="4"
      />

    <path
      d="M23 12 A11 11 0 0 1 27 21"
      fill="none"
      stroke="#ef4444"
      strokeWidth="4"
      strokeLinecap="round"
      />

    {/* Needle */}
    <line
      x1="16"
      y1="21"
      x2="10"
      y2="15"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      />

    {/* Center */}
    <circle
      cx="16"
      cy="21"
      r="2.5"
      fill="currentColor"
      />
  </svg>
);
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
    <section data-testid="scenario-simulator" className="panel scenario-simulator" aria-labelledby="sim-heading">
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
          icon={PM25GaugeIcon}
          value={pm25Reduction}
          onChange={(v) => {
            setActivePreset(null);
            setPm25Reduction(v);
          }}
          current={current.pm2_5}
          unit="µg/m³"
        />
        <SliderGroup
          id="slider-no2"
          label="Reduce NO₂"
          icon={CarFront}
          value={no2Reduction}
          onChange={(v) => {
            setActivePreset(null);
            setNo2Reduction(v);
          }}
          current={current.nitrogen_dioxide}
          unit="µg/m³"
        />
        <SliderGroup
          id="slider-o3"
          label="Reduce Ozone"
          icon={Sun}
          iconColor="#efa001"
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
function SliderGroup({
  id,
  label,
  emoji,
  icon: Icon,
  iconColor,
  value,
  onChange,
  current,
  unit
}) {
  const reduced = Math.round(current * (1 - value / 100));

  return (
    <div className="sim-slider-group">
      <label htmlFor={id}>

        <span className="sim-slider-emoji" aria-hidden="true">
          {Icon ? <Icon size={20} color={iconColor} /> : emoji}
        </span>

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