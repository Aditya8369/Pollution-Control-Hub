import { describe, it, expect } from 'vitest';
import {
  PRESET_SCENARIOS,
  DEFAULT_SCENARIO_ID,
  SIMULATED_POLLUTANTS,
  applyReduction,
  buildScenarioComparison,
  getReductions,
  getScenario,
  readingOf,
} from './scenarioModel';

describe('readingOf', () => {
  it('accepts a genuine reading of zero', () => {
    // The bug this whole module exists for: `current.nitrogen_dioxide || 28`
    // turned the cleanest possible reading into a mid-range placeholder.
    expect(readingOf(0)).toBe(0);
  });

  it('accepts ordinary positive readings', () => {
    expect(readingOf(12.4)).toBe(12.4);
    expect(readingOf(300)).toBe(300);
  });

  it('rejects the absent-value shapes the API actually sends', () => {
    expect(readingOf(null)).toBeNull();
    expect(readingOf(undefined)).toBeNull();
    expect(readingOf(NaN)).toBeNull();
    expect(readingOf(Infinity)).toBeNull();
  });

  it('rejects a numeric string rather than coercing it', () => {
    // A cached payload round-tripped through storage can come back stringified.
    // Coercing here would hide that; the old code instead called `.toFixed` on it
    // and threw.
    expect(readingOf('35')).toBeNull();
  });

  it('rejects a negative concentration', () => {
    expect(readingOf(-1)).toBeNull();
  });
});

describe('getScenario', () => {
  it('returns the requested preset', () => {
    expect(getScenario('urban_canopy').id).toBe('urban_canopy');
  });

  it('falls back to the first preset for an unknown id', () => {
    expect(getScenario('does_not_exist').id).toBe(DEFAULT_SCENARIO_ID);
    expect(getScenario(undefined).id).toBe(DEFAULT_SCENARIO_ID);
  });

  it('every preset carries both reduction percentages', () => {
    for (const scenario of PRESET_SCENARIOS) {
      expect(typeof scenario.pm25ReductionPct).toBe('number');
      expect(typeof scenario.no2ReductionPct).toBe('number');
    }
  });
});

describe('getReductions', () => {
  it('scales the EV scenario from its 30% anchor', () => {
    const ev = getScenario('ev_transition');

    expect(getReductions(ev, 30)).toEqual({ pm25ReductionPct: 15, no2ReductionPct: 25 });
    expect(getReductions(ev, 60)).toEqual({ pm25ReductionPct: 30, no2ReductionPct: 50 });
    expect(getReductions(ev, 15)).toEqual({ pm25ReductionPct: 8, no2ReductionPct: 13 });
  });

  it('leaves non-adjustable scenarios at their headline figures', () => {
    const canopy = getScenario('urban_canopy');

    // The slider is only rendered for the EV scenario; even if a stale value is
    // passed in, a preset without an anchor ignores it.
    expect(getReductions(canopy, 90)).toEqual({
      pm25ReductionPct: canopy.pm25ReductionPct,
      no2ReductionPct: canopy.no2ReductionPct,
    });
  });

  it('ignores a non-numeric adoption share', () => {
    const ev = getScenario('ev_transition');
    expect(getReductions(ev, undefined)).toEqual({ pm25ReductionPct: 15, no2ReductionPct: 25 });
  });
});

describe('applyReduction', () => {
  it('applies the percentage to a measured baseline', () => {
    expect(applyReduction(40, 25)).toBe(30);
    expect(applyReduction(35.4, 15)).toBe(30.1);
  });

  it('returns null for an absent baseline instead of a number', () => {
    // This is the guard that makes it impossible to chart the result of
    // simulating nothing.
    expect(applyReduction(null, 25)).toBeNull();
  });

  it('keeps a zero baseline at zero', () => {
    expect(applyReduction(0, 40)).toBe(0);
  });

  it('never raises a baseline', () => {
    // The old floor of `Math.max(2, ...)` made a 1 µg/m³ city "improve" to 2.
    expect(applyReduction(1, 40)).toBeLessThanOrEqual(1);
    expect(applyReduction(0.5, 90)).toBeLessThanOrEqual(0.5);
  });

  it('clamps a reduction over 100% to zero rather than going negative', () => {
    expect(applyReduction(20, 150)).toBe(0);
  });
});

describe('buildScenarioComparison', () => {
  const current = { pm2_5: 40, nitrogen_dioxide: 20 };

  it('charts both pollutants when both are measured', () => {
    const result = buildScenarioComparison({ current, scenarioId: 'industrial_scrubbers' });

    expect(result.hasAnyReading).toBe(true);
    expect(result.measuredRows).toHaveLength(2);
    expect(result.missingRows).toHaveLength(0);

    const pm25 = result.rows.find((r) => r.field === 'pm2_5');
    expect(pm25.baseline).toBe(40);
    expect(pm25.simulated).toBe(24); // 40% reduction
  });

  it('marks a missing pollutant as absent rather than substituting 35', () => {
    const result = buildScenarioComparison({
      current: { pm2_5: null, nitrogen_dioxide: 20 },
      scenarioId: 'ev_transition',
      evPct: 30,
    });

    const pm25 = result.rows.find((r) => r.field === 'pm2_5');
    expect(pm25.hasReading).toBe(false);
    expect(pm25.baseline).toBeNull();
    expect(pm25.simulated).toBeNull();

    // ...and the NO₂ side still works, so losing one reading doesn't blank the panel.
    expect(result.measuredRows.map((r) => r.field)).toEqual(['nitrogen_dioxide']);
    expect(result.hasAnyReading).toBe(true);
  });

  it('reports no readings at all when `current` is missing entirely', () => {
    const result = buildScenarioComparison({ current: undefined, scenarioId: 'renewable_grid' });

    expect(result.hasAnyReading).toBe(false);
    expect(result.measuredRows).toHaveLength(0);
    expect(result.missingRows).toHaveLength(SIMULATED_POLLUTANTS.length);
    expect(result.rows.every((r) => r.baseline === null)).toBe(true);
  });

  it('treats a zero NO₂ reading as measured', () => {
    const result = buildScenarioComparison({
      current: { pm2_5: 12, nitrogen_dioxide: 0 },
      scenarioId: 'urban_canopy',
    });

    const no2 = result.rows.find((r) => r.field === 'nitrogen_dioxide');
    expect(no2.hasReading).toBe(true);
    expect(no2.baseline).toBe(0);
    expect(no2.simulated).toBe(0);
  });

  it('does not throw on a stringified reading', () => {
    const result = buildScenarioComparison({
      current: { pm2_5: '40', nitrogen_dioxide: 20 },
      scenarioId: 'ev_transition',
    });

    expect(result.rows.find((r) => r.field === 'pm2_5').hasReading).toBe(false);
  });

  it('carries the resolved scenario back for the details copy', () => {
    const result = buildScenarioComparison({ current, scenarioId: 'nonsense' });
    expect(result.scenario.id).toBe(DEFAULT_SCENARIO_ID);
  });

  it('moves the simulated value when the EV slider moves', () => {
    const at30 = buildScenarioComparison({ current, scenarioId: 'ev_transition', evPct: 30 });
    const at90 = buildScenarioComparison({ current, scenarioId: 'ev_transition', evPct: 90 });

    const pm25At30 = at30.rows.find((r) => r.field === 'pm2_5').simulated;
    const pm25At90 = at90.rows.find((r) => r.field === 'pm2_5').simulated;

    expect(pm25At90).toBeLessThan(pm25At30);
  });

  it('defaults to the opening scenario with no arguments', () => {
    const result = buildScenarioComparison();
    expect(result.scenario.id).toBe(DEFAULT_SCENARIO_ID);
    expect(result.hasAnyReading).toBe(false);
  });
});
