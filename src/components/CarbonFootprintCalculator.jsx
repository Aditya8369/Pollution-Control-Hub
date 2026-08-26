import React, { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { calculateCarbonFootprint } from '../utils/carbonCalculator';
import './CarbonFootprintCalculator.css';

const HISTORY_STORAGE_KEY = 'carbon_calculator_history';
// Tip "commitments" are tracked locally per device — this app has no user
// authentication system, so progress is stored the same way the calculator's
// history already is, rather than requiring an account.
const TIP_COMMITMENTS_KEY = 'carbon_tip_commitments';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Quick "what if" presets (issue #841) — each takes the user's current
// baseline inputs and returns a modified copy for the scenario side of the
// comparison. Kept as plain transforms so adding a new preset is a one-liner.
const SCENARIO_PRESETS = [
  {
    id: 'preset-ev',
    label: '🔋 Switch to an EV',
    apply: (inputs) => ({ ...inputs, vehicleType: 'ev' }),
  },
  {
    id: 'preset-halve-driving',
    label: '🚗 Halve Car Travel',
    apply: (inputs) => ({ ...inputs, vehicleKm: Math.round(inputs.vehicleKm / 2) }),
  },
  {
    id: 'preset-transit-switch',
    label: '🚌 Swap Driving for Transit',
    apply: (inputs) => ({
      ...inputs,
      publicTransitKm: inputs.publicTransitKm + inputs.vehicleKm,
      vehicleKm: 0,
    }),
  },
  {
    id: 'preset-cut-electricity',
    label: '⚡ Cut Electricity 30%',
    apply: (inputs) => ({ ...inputs, electricityKwh: Math.round(inputs.electricityKwh * 0.7) }),
  },
  {
    id: 'preset-skip-flights',
    label: '✈️ Skip One Long Flight',
    apply: (inputs) => ({ ...inputs, longFlights: Math.max(0, inputs.longFlights - 1) }),
  },
];

export default function CarbonFootprintCalculator() {
  const { t } = useTranslation();

  const [vehicleType, setVehicleType] = useState('petrol');
  const [vehicleKm, setVehicleKm] = useState(150);
  const [electricityKwh, setElectricityKwh] = useState(180);
  const [lpgCylinders, setLpgCylinders] = useState(1);
  const [publicTransitKm, setPublicTransitKm] = useState(80);
  const [shortFlights, setShortFlights] = useState(0);
  const [longFlights, setLongFlights] = useState(0);

  const [history, setHistory] = useState([]);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [commitments, setCommitments] = useState({});

  // What-If Scenario Mode (issue #841): a second, independently-editable copy
  // of the same inputs, compared side-by-side against the baseline above.
  const [scenarioActive, setScenarioActive] = useState(false);
  const [scenarioInputs, setScenarioInputs] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (saved) setHistory(JSON.parse(saved));
    } catch {
      // ignore storage error
    }
    try {
      const savedCommitments = localStorage.getItem(TIP_COMMITMENTS_KEY);
      if (savedCommitments) setCommitments(JSON.parse(savedCommitments));
    } catch {
      // ignore storage error
    }
  }, []);

  const results = useMemo(() => {
    return calculateCarbonFootprint({
      vehicleType,
      vehicleKm,
      electricityKwh,
      lpgCylinders,
      publicTransitKm,
      shortFlights,
      longFlights
    });
  }, [vehicleType, vehicleKm, electricityKwh, lpgCylinders, publicTransitKm, shortFlights, longFlights]);

  const scenarioResults = useMemo(() => {
    if (!scenarioActive || !scenarioInputs) return null;
    return calculateCarbonFootprint(scenarioInputs);
  }, [scenarioActive, scenarioInputs]);

  const scenarioDeltaKg = scenarioResults
    ? Math.round((scenarioResults.totalMonthlyKg - results.totalMonthlyKg) * 10) / 10
    : 0;
  const scenarioDeltaPercent = scenarioResults && results.totalMonthlyKg > 0
    ? Math.round((scenarioDeltaKg / results.totalMonthlyKg) * 100)
    : 0;

  const handleToggleScenario = () => {
    if (scenarioActive) {
      setScenarioActive(false);
      return;
    }
    // "Create a copy of their current inputs" (step 2) — the scenario starts
    // identical to the baseline, so any change the user makes is the delta.
    setScenarioInputs({
      vehicleType, vehicleKm, electricityKwh, lpgCylinders, publicTransitKm, shortFlights, longFlights
    });
    setScenarioActive(true);
  };

  const setScenarioField = (field, value) => {
    setScenarioInputs((prev) => ({ ...prev, [field]: value }));
  };

  const applyScenarioPreset = (preset) => {
    setScenarioInputs((prev) => preset.apply(prev));
  };

  const resetScenarioToBaseline = () => {
    setScenarioInputs({
      vehicleType, vehicleKm, electricityKwh, lpgCylinders, publicTransitKm, shortFlights, longFlights
    });
  };

  const handleReset = () => {
    setVehicleType('petrol');
    setVehicleKm(0);
    setElectricityKwh(0);
    setLpgCylinders(0);
    setPublicTransitKm(0);
    setShortFlights(0);
    setLongFlights(0);
  };

  const handleSaveCalculation = () => {
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }),
      monthlyKg: results.totalMonthlyKg,
      annualTonnes: results.totalAnnualTonnes,
      impactLevel: results.impactLevel.level,
      inputs: { vehicleType, vehicleKm, electricityKwh, lpgCylinders, publicTransitKm, shortFlights, longFlights }
    };

    const updatedHistory = [newEntry, ...history.slice(0, 9)];
    setHistory(updatedHistory);
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
      setSaveSuccessMsg(t('carbonCalculator.savedNotice', 'Calculation saved to history!'));
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch {
      // ignore storage error
    }
  };

  const handleLoadHistoryEntry = (entry) => {
    if (!entry?.inputs) return;
    setVehicleType(entry.inputs.vehicleType || 'petrol');
    setVehicleKm(entry.inputs.vehicleKm || 0);
    setElectricityKwh(entry.inputs.electricityKwh || 0);
    setLpgCylinders(entry.inputs.lpgCylinders || 0);
    setPublicTransitKm(entry.inputs.publicTransitKm || 0);
    setShortFlights(entry.inputs.shortFlights || 0);
    setLongFlights(entry.inputs.longFlights || 0);
  };

  const handleClearHistory = () => {
    setHistory([]);
    try {
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    } catch {
      // ignore storage error
    }
  };

  const persistCommitments = (updated) => {
    setCommitments(updated);
    try {
      localStorage.setItem(TIP_COMMITMENTS_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage error
    }
  };

  const handleCommitTip = (tipId) => {
    if (commitments[tipId]) return;
    persistCommitments({
      ...commitments,
      [tipId]: { committedAt: todayStr(), completedDates: [] }
    });
  };

  const handleMarkDoneToday = (tipId) => {
    const entry = commitments[tipId];
    if (!entry || entry.completedDates.includes(todayStr())) return;
    persistCommitments({
      ...commitments,
      [tipId]: { ...entry, completedDates: [...entry.completedDates, todayStr()] }
    });
  };

  const handleRemoveCommitment = (tipId) => {
    const { [tipId]: _removed, ...rest } = commitments;
    persistCommitments(rest);
  };

  return (
    <section className="carbon-calculator-container" aria-labelledby="carbon-calculator-heading">
      <div className="carbon-header-card">
        <div className="carbon-header-badge">🌱 {t('carbonCalculator.badge', 'Environmental Awareness')}</div>
        <h2 id="carbon-calculator-heading" className="carbon-calculator-title">
          {t('carbonCalculator.title', 'Personal Carbon Footprint Calculator')}
        </h2>
        <p className="carbon-calculator-subtitle">
          {t(
            'carbonCalculator.subtitle',
            'Estimate your monthly CO₂ emissions from daily transport, electricity, cooking fuel, and travel. Understand your environmental impact and adopt simple habits to cut emissions.'
          )}
        </p>
      </div>

      {scenarioActive && scenarioInputs && scenarioResults && (
        <div className="carbon-card carbon-scenario-panel" aria-label="What-If Scenario Comparison">
          <h3 className="carbon-subheading">🔀 What-If Scenario Comparison</h3>
          <p className="carbon-tip-text" style={{ marginBottom: '1rem' }}>
            Adjust the scenario inputs below to see the projected change versus your current baseline.
          </p>

          <div className="carbon-scenario-presets">
            {SCENARIO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className="carbon-scenario-preset-btn"
                onClick={() => applyScenarioPreset(preset)}
              >
                {preset.label}
              </button>
            ))}
            <button type="button" className="btn-text-cancel" onClick={resetScenarioToBaseline}>
              Reset to Baseline
            </button>
          </div>

          <div className="carbon-scenario-compare-grid">
            <div className="carbon-scenario-inputs">
              <div className="carbon-form-group">
                <label htmlFor="scenario-vehicle-type">Vehicle Fuel Type</label>
                <select
                  id="scenario-vehicle-type"
                  className="carbon-select"
                  value={scenarioInputs.vehicleType}
                  onChange={(e) => setScenarioField('vehicleType', e.target.value)}
                >
                  <option value="petrol">Petrol Car (0.192 kg CO₂/km)</option>
                  <option value="diesel">Diesel Car (0.171 kg CO₂/km)</option>
                  <option value="ev">Electric Vehicle (0.053 kg CO₂/km)</option>
                  <option value="motorbike">Motorbike / Scooter (0.082 kg CO₂/km)</option>
                </select>
              </div>

              <div className="carbon-form-group">
                <div className="carbon-label-row">
                  <label htmlFor="scenario-vehicle-km">Distance Travelled</label>
                  <span className="carbon-value-display">{scenarioInputs.vehicleKm} km / month</span>
                </div>
                <input
                  id="scenario-vehicle-km"
                  type="range"
                  min="0"
                  max="2500"
                  step="10"
                  value={scenarioInputs.vehicleKm}
                  onChange={(e) => setScenarioField('vehicleKm', Number(e.target.value))}
                  className="carbon-range-slider"
                />
              </div>

              <div className="carbon-form-group">
                <div className="carbon-label-row">
                  <label htmlFor="scenario-electricity">Electricity Consumption</label>
                  <span className="carbon-value-display">{scenarioInputs.electricityKwh} kWh / month</span>
                </div>
                <input
                  id="scenario-electricity"
                  type="range"
                  min="0"
                  max="1000"
                  step="5"
                  value={scenarioInputs.electricityKwh}
                  onChange={(e) => setScenarioField('electricityKwh', Number(e.target.value))}
                  className="carbon-range-slider"
                />
              </div>

              <div className="carbon-form-group">
                <div className="carbon-label-row">
                  <label htmlFor="scenario-lpg">LPG Cooking Gas</label>
                  <span className="carbon-value-display">{scenarioInputs.lpgCylinders} cylinder(s) / month</span>
                </div>
                <input
                  id="scenario-lpg"
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={scenarioInputs.lpgCylinders}
                  onChange={(e) => setScenarioField('lpgCylinders', Number(e.target.value))}
                  className="carbon-range-slider"
                />
              </div>

              <div className="carbon-form-group">
                <div className="carbon-label-row">
                  <label htmlFor="scenario-transit">Bus / Metro / Train</label>
                  <span className="carbon-value-display">{scenarioInputs.publicTransitKm} km / month</span>
                </div>
                <input
                  id="scenario-transit"
                  type="range"
                  min="0"
                  max="1500"
                  step="10"
                  value={scenarioInputs.publicTransitKm}
                  onChange={(e) => setScenarioField('publicTransitKm', Number(e.target.value))}
                  className="carbon-range-slider"
                />
              </div>

              <div className="carbon-form-row-2col">
                <div className="carbon-form-group">
                  <label htmlFor="scenario-short-flights">Short Flights / yr</label>
                  <input
                    id="scenario-short-flights"
                    type="number"
                    min="0"
                    max="50"
                    value={scenarioInputs.shortFlights}
                    onChange={(e) => setScenarioField('shortFlights', Math.max(0, Number(e.target.value)))}
                    className="carbon-number-input"
                  />
                </div>
                <div className="carbon-form-group">
                  <label htmlFor="scenario-long-flights">Long Flights / yr</label>
                  <input
                    id="scenario-long-flights"
                    type="number"
                    min="0"
                    max="50"
                    value={scenarioInputs.longFlights}
                    onChange={(e) => setScenarioField('longFlights', Math.max(0, Number(e.target.value)))}
                    className="carbon-number-input"
                  />
                </div>
              </div>
            </div>

            <div className="carbon-scenario-results">
              <div className="carbon-scenario-result-row">
                <span>Baseline</span>
                <strong>{results.totalMonthlyKg} kg CO₂e/mo</strong>
                <span className={`carbon-impact-badge ${results.impactLevel.badgeClass}`}>
                  {results.impactLevel.level}
                </span>
              </div>
              <div className="carbon-scenario-result-row">
                <span>Scenario</span>
                <strong>{scenarioResults.totalMonthlyKg} kg CO₂e/mo</strong>
                <span className={`carbon-impact-badge ${scenarioResults.impactLevel.badgeClass}`}>
                  {scenarioResults.impactLevel.level}
                </span>
              </div>

              <div
                className={`carbon-scenario-delta ${scenarioDeltaKg <= 0 ? 'carbon-scenario-delta--good' : 'carbon-scenario-delta--bad'}`}
                data-testid="scenario-delta"
              >
                {scenarioDeltaKg <= 0 ? '🌿' : '⚠️'}{' '}
                {Math.abs(scenarioDeltaKg)} kg CO₂e/mo {scenarioDeltaKg <= 0 ? 'lower' : 'higher'}
                {' '}({Math.abs(scenarioDeltaPercent)}% {scenarioDeltaKg <= 0 ? 'reduction' : 'increase'})
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="carbon-layout-grid">
        <div className="carbon-inputs-column">
          <div className="carbon-card">
            <h3 className="carbon-card-heading">
              <span className="carbon-icon">🚗</span> {t('carbonCalculator.vehicleHeading', 'Car & Motorbike Travel')}
            </h3>

            <div className="carbon-form-group">
              <label htmlFor="vehicle-type-select">{t('carbonCalculator.vehicleType', 'Vehicle Fuel Type')}</label>
              <select
                id="vehicle-type-select"
                className="carbon-select"
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
              >
                <option value="petrol">Petrol Car (0.192 kg CO₂/km)</option>
                <option value="diesel">Diesel Car (0.171 kg CO₂/km)</option>
                <option value="ev">Electric Vehicle (0.053 kg CO₂/km)</option>
                <option value="motorbike">Motorbike / Scooter (0.082 kg CO₂/km)</option>
              </select>
            </div>

            <div className="carbon-form-group">
              <div className="carbon-label-row">
                <label htmlFor="vehicle-km-input">{t('carbonCalculator.vehicleKm', 'Distance Travelled')}</label>
                <span className="carbon-value-display">{vehicleKm} km / month</span>
              </div>
              <input
                id="vehicle-km-input"
                type="range"
                min="0"
                max="2500"
                step="10"
                value={vehicleKm}
                onChange={(e) => setVehicleKm(Number(e.target.value))}
                className="carbon-range-slider"
              />
            </div>
          </div>

          <div className="carbon-card">
            <h3 className="carbon-card-heading">
              <span className="carbon-icon">⚡</span> {t('carbonCalculator.homeEnergyHeading', 'Home Energy & Cooking Fuel')}
            </h3>

            <div className="carbon-form-group">
              <div className="carbon-label-row">
                <label htmlFor="electricity-kwh-input">{t('carbonCalculator.electricity', 'Electricity Consumption')}</label>
                <span className="carbon-value-display">{electricityKwh} kWh / month</span>
              </div>
              <input
                id="electricity-kwh-input"
                type="range"
                min="0"
                max="1000"
                step="5"
                value={electricityKwh}
                onChange={(e) => setElectricityKwh(Number(e.target.value))}
                className="carbon-range-slider"
              />
            </div>

            <div className="carbon-form-group">
              <div className="carbon-label-row">
                <label htmlFor="lpg-cylinders-input">{t('carbonCalculator.lpg', 'LPG Cooking Gas')}</label>
                <span className="carbon-value-display">{lpgCylinders} cylinder(s) / month</span>
              </div>
              <input
                id="lpg-cylinders-input"
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={lpgCylinders}
                onChange={(e) => setLpgCylinders(Number(e.target.value))}
                className="carbon-range-slider"
              />
            </div>
          </div>

          <div className="carbon-card">
            <h3 className="carbon-card-heading">
              <span className="carbon-icon">🚌</span> {t('carbonCalculator.transitHeading', 'Public Transit & Flights')}
            </h3>

            <div className="carbon-form-group">
              <div className="carbon-label-row">
                <label htmlFor="transit-km-input">{t('carbonCalculator.publicTransit', 'Bus / Metro / Train')}</label>
                <span className="carbon-value-display">{publicTransitKm} km / month</span>
              </div>
              <input
                id="transit-km-input"
                type="range"
                min="0"
                max="1500"
                step="10"
                value={publicTransitKm}
                onChange={(e) => setPublicTransitKm(Number(e.target.value))}
                className="carbon-range-slider"
              />
            </div>

            <div className="carbon-form-row-2col">
              <div className="carbon-form-group">
                <label htmlFor="short-flights-input">{t('carbonCalculator.shortFlights', 'Short Flights (< 1500 km)')}</label>
                <input
                  id="short-flights-input"
                  type="number"
                  min="0"
                  max="50"
                  value={shortFlights}
                  onChange={(e) => setShortFlights(Math.max(0, Number(e.target.value)))}
                  className="carbon-number-input"
                  placeholder="flights / year"
                />
              </div>

              <div className="carbon-form-group">
                <label htmlFor="long-flights-input">{t('carbonCalculator.longFlights', 'Long Flights (> 1500 km)')}</label>
                <input
                  id="long-flights-input"
                  type="number"
                  min="0"
                  max="50"
                  value={longFlights}
                  onChange={(e) => setLongFlights(Math.max(0, Number(e.target.value)))}
                  className="carbon-number-input"
                  placeholder="flights / year"
                />
              </div>
            </div>
          </div>

          <div className="carbon-action-buttons">
            <button type="button" className="btn-primary carbon-btn-save" onClick={handleSaveCalculation}>
              💾 {t('carbonCalculator.saveBtn', 'Save Calculation')}
            </button>
            <button type="button" className="btn-secondary carbon-btn-reset" onClick={handleReset}>
              🔄 {t('carbonCalculator.resetBtn', 'Reset Inputs')}
            </button>
            <button
              type="button"
              className={`btn-secondary carbon-btn-scenario ${scenarioActive ? 'active' : ''}`}
              onClick={handleToggleScenario}
            >
              🔀 {scenarioActive ? 'Exit Scenario Mode' : 'Compare Plans ("What-If")'}
            </button>
          </div>

          {saveSuccessMsg && (
            <div className="carbon-toast-success" role="status">
              ✓ {saveSuccessMsg}
            </div>
          )}
        </div>

        <div className="carbon-results-column">
          <div className="carbon-hero-result-card">
            <div className="carbon-impact-header">
              <span className="carbon-result-label">{t('carbonCalculator.totalEmissions', 'Estimated Carbon Footprint')}</span>
              <span className={`carbon-impact-badge ${results.impactLevel.badgeClass}`}>
                {results.impactLevel.level} Impact
              </span>
            </div>

            <div className="carbon-hero-values">
              <div className="carbon-hero-metric">
                <span className="carbon-metric-number">{results.totalMonthlyKg}</span>
                <span className="carbon-metric-unit">kg CO₂e / month</span>
              </div>
              <div className="carbon-hero-divider" />
              <div className="carbon-hero-metric-secondary">
                <span className="carbon-secondary-number">{results.totalAnnualTonnes}</span>
                <span className="carbon-secondary-unit">tonnes CO₂e / year</span>
              </div>
            </div>

            <p className="carbon-impact-description">{results.impactLevel.description}</p>
          </div>

          <div className="carbon-card">
            <h4 className="carbon-subheading">📊 Comparison with Targets</h4>
            <div className="carbon-benchmark-list">
              <div className="carbon-benchmark-item">
                <div className="carbon-benchmark-header">
                  <span>Your Monthly Footprint</span>
                  <strong>{results.totalMonthlyKg} kg</strong>
                </div>
                <div className="carbon-bar-bg">
                  <div
                    className="carbon-bar-fill carbon-bar-user"
                    style={{
                      width: `${Math.min(100, (results.totalMonthlyKg / 600) * 100)}%`,
                      backgroundColor: results.impactLevel.color
                    }}
                  />
                </div>
              </div>

              <div className="carbon-benchmark-item">
                <div className="carbon-benchmark-header">
                  <span>India Average (~1.9 t/yr)</span>
                  <span>158 kg / month</span>
                </div>
                <div className="carbon-bar-bg">
                  <div className="carbon-bar-fill carbon-bar-india" style={{ width: `${(158 / 600) * 100}%` }} />
                </div>
              </div>

              <div className="carbon-benchmark-item">
                <div className="carbon-benchmark-header">
                  <span>Paris Target (2030 Goal)</span>
                  <span>167 kg / month</span>
                </div>
                <div className="carbon-bar-bg">
                  <div className="carbon-bar-fill carbon-bar-target" style={{ width: `${(167 / 600) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="carbon-card">
            <h4 className="carbon-subheading">📈 Emissions Breakdown</h4>
            <div className="carbon-breakdown-list">
              {results.breakdown.map((item) => {
                const percent = results.totalMonthlyKg > 0 ? Math.round((item.monthlyKg / results.totalMonthlyKg) * 100) : 0;
                return (
                  <div key={item.key} className="carbon-breakdown-item">
                    <div className="carbon-breakdown-info">
                      <span className="carbon-breakdown-label">{item.label}</span>
                      <span className="carbon-breakdown-value">
                        {item.monthlyKg} kg ({percent}%)
                      </span>
                    </div>
                    <div className="carbon-breakdown-bar-bg">
                      <div className="carbon-breakdown-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="carbon-card">
            <h4 className="carbon-subheading">💡 Recommended Ways to Reduce Emissions</h4>
            <div className="carbon-tips-list">
              {results.reductionTips.map((tip) => {
                const commitment = commitments[tip.id];
                const doneToday = commitment?.completedDates.includes(todayStr());
                const streak = commitment?.completedDates.length || 0;

                return (
                  <div key={tip.id} className="carbon-tip-card">
                    <div className="carbon-tip-header">
                      <span className="carbon-tip-tag">{tip.category}</span>
                      <span className="carbon-tip-impact">{tip.impact}</span>
                    </div>
                    <h5 className="carbon-tip-title">{tip.title}</h5>
                    <p className="carbon-tip-text">{tip.tip}</p>

                    {!commitment ? (
                      <button
                        type="button"
                        className="carbon-tip-commit-btn"
                        onClick={() => handleCommitTip(tip.id)}
                      >
                        🎯 Commit to this tip
                      </button>
                    ) : (
                      <div className="carbon-tip-progress">
                        <span className="carbon-tip-streak">
                          ✅ Done {streak} day{streak === 1 ? '' : 's'} so far
                        </span>
                        <div className="carbon-tip-progress-actions">
                          <button
                            type="button"
                            className="carbon-tip-commit-btn"
                            onClick={() => handleMarkDoneToday(tip.id)}
                            disabled={doneToday}
                          >
                            {doneToday ? '✓ Marked today' : 'Mark today as done'}
                          </button>
                          <button
                            type="button"
                            className="btn-text-cancel"
                            onClick={() => handleRemoveCommitment(tip.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {history.length > 0 && (
            <div className="carbon-card carbon-history-card">
              <div className="carbon-history-header">
                <h4 className="carbon-subheading">📜 Previous Calculations</h4>
                <button type="button" className="btn-text-cancel" onClick={handleClearHistory}>
                  Clear History
                </button>
              </div>

              <div className="carbon-history-list">
                {history.map((entry) => (
                  <div key={entry.id} className="carbon-history-item">
                    <div className="carbon-history-info">
                      <span className="carbon-history-date">{entry.date}</span>
                      <span className="carbon-history-value">
                        {entry.monthlyKg} kg CO₂e/mo ({entry.annualTonnes} t/yr)
                      </span>
                    </div>
                    <button type="button" className="btn-change-city" onClick={() => handleLoadHistoryEntry(entry)}>
                      Load
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}