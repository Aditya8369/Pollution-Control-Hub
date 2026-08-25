/**
 * The arithmetic behind the "What-If" scenario simulator.
 *
 * Pulled out of `ScenarioSimulator.jsx` so the part that decides what the chart
 * asserts can be tested without mounting a chart. The rule it exists to enforce:
 *
 *   a pollutant we have no reading for is absent, not average.
 *
 * The component used to open with `current?.pm2_5 || 35`. That constant was then
 * drawn as the red "Current Baseline" bar and used as the divisor for the whole
 * simulation, so a city with no PM2.5 reading was told — with a chart — that it
 * sits at 35 µg/m³ and that a policy would take it to 28. Neither number came from
 * a measurement. `||` also meant a genuine reading of 0, which the Open-Meteo
 * air-quality endpoint really does return for NO₂ in clean rural air, was replaced
 * by the same placeholder.
 */

/** The pollutants this panel simulates, in display order. */
export const SIMULATED_POLLUTANTS = [
  {
    /** Key on the `current` payload from `airQualityService`. */
    field: 'pm2_5',
    /** Which reduction percentage on a scenario applies to it. */
    reductionKey: 'pm25ReductionPct',
    labelKey: 'scenarioSimulator.chartPm25Axis',
    labelFallback: 'PM2.5 (µg/m³)',
    nameKey: 'scenarioSimulator.pm25Label',
    nameFallback: 'PM2.5',
    reductionLabelKey: 'scenarioSimulator.pm25ReductionLabel',
    reductionLabelFallback: 'PM2.5 Reduction:',
  },
  {
    field: 'nitrogen_dioxide',
    reductionKey: 'no2ReductionPct',
    labelKey: 'scenarioSimulator.chartNo2Axis',
    labelFallback: 'NO₂ (µg/m³)',
    nameKey: 'scenarioSimulator.no2Label',
    nameFallback: 'NO₂',
    reductionLabelKey: 'scenarioSimulator.no2ReductionLabel',
    reductionLabelFallback: 'NO₂ Reduction:',
  },
];

/**
 * Pre-set guided scenarios and the reduction each one is credited with.
 *
 * The percentages are indicative planning figures, not model output; the panel
 * says so in its own copy. What matters here is that they are applied to a real
 * measurement or to nothing at all.
 */
export const PRESET_SCENARIOS = [
  {
    id: 'ev_transition',
    title: '⚡ 30% EV Adoption',
    description: 'Replace 30% of fossil-fuel vehicles on city roads with zero-emission EVs.',
    no2ReductionPct: 25,
    pm25ReductionPct: 15,
    details: 'Dramatically lowers tailpipe combustion NO₂ emissions and reduces brake dust PM2.5.',
    /** The adoption share the headline percentages above were quoted at. */
    baselineEvPct: 30,
  },
  {
    id: 'urban_canopy',
    title: '🌳 20% Green Canopy',
    description: 'Expand city tree cover, rooftop gardens, and urban parks by 20%.',
    no2ReductionPct: 10,
    pm25ReductionPct: 20,
    details: 'Leaves and vegetation trap airborne fine particulate matter and absorb gaseous pollutants.',
  },
  {
    id: 'industrial_scrubbers',
    title: '🏭 Emission Controls',
    description: 'Mandate advanced particulate scrubbers across nearby factories and power plants.',
    no2ReductionPct: 35,
    pm25ReductionPct: 40,
    details: 'Targeted stack filtration cuts bulk industrial PM2.5 and atmospheric nitrogen oxides.',
  },
  {
    id: 'renewable_grid',
    title: '☀️ 50% Clean Energy',
    description: 'Transition half of the regional electricity grid to clean renewable energy sources.',
    no2ReductionPct: 30,
    pm25ReductionPct: 25,
    details: 'Phases out coal and gas thermal generation, drastically cleaning regional air sheds.',
  },
];

/** The scenario the panel opens on, and the fallback for an unknown id. */
export const DEFAULT_SCENARIO_ID = PRESET_SCENARIOS[0].id;

const SCENARIO_BY_ID = Object.fromEntries(PRESET_SCENARIOS.map((s) => [s.id, s]));

/**
 * Looks up a preset, falling back to the first one.
 *
 * @param {string} [id]
 * @returns {typeof PRESET_SCENARIOS[number]}
 */
export function getScenario(id) {
  return SCENARIO_BY_ID[id] || PRESET_SCENARIOS[0];
}

/**
 * A pollutant reading, or null when there isn't one.
 *
 * The distinction the old `|| 35` collapsed: `null`, `undefined`, `NaN` and a
 * string that happens to look like a number are all "we don't have this", while
 * `0` is a reading like any other. Negative values are rejected too — a negative
 * concentration is a broken feed, not a very clean city.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
export function readingOf(value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  return value;
}

/**
 * The reduction percentages a scenario claims, for the current control state.
 *
 * Only the EV scenario is adjustable. Its headline figures are quoted at 30%
 * adoption, so the slider scales them linearly from that anchor rather than from
 * a magic `/ 30` buried in the component.
 *
 * @param {typeof PRESET_SCENARIOS[number]} scenario
 * @param {number} [evPct] - EV adoption share, when the EV scenario is active.
 * @returns {{ pm25ReductionPct: number, no2ReductionPct: number }}
 */
export function getReductions(scenario, evPct) {
  const anchor = scenario.baselineEvPct;
  const share = readingOf(evPct);

  if (!anchor || share === null) {
    return {
      pm25ReductionPct: scenario.pm25ReductionPct,
      no2ReductionPct: scenario.no2ReductionPct,
    };
  }

  const scale = share / anchor;
  return {
    pm25ReductionPct: Math.round(scenario.pm25ReductionPct * scale),
    no2ReductionPct: Math.round(scenario.no2ReductionPct * scale),
  };
}

/**
 * Applies a percentage reduction to a baseline concentration.
 *
 * Returns null for a missing baseline rather than a number, so a caller cannot
 * accidentally chart the result of simulating nothing.
 *
 * The result is clamped to zero rather than to the old floor of 2 µg/m³. That
 * floor made the simulation *raise* any baseline below it — a city reading
 * 1 µg/m³ was shown "improving" to 2 — which is the same substituted-number
 * problem in miniature.
 *
 * @param {number|null} baseline - Concentration in µg/m³, or null when absent.
 * @param {number} reductionPct - 0–100.
 * @returns {number|null} Rounded to one decimal, or null.
 */
export function applyReduction(baseline, reductionPct) {
  if (baseline === null) return null;

  const pct = readingOf(reductionPct) ?? 0;
  const remaining = Math.max(0, 1 - pct / 100);
  return Number((baseline * remaining).toFixed(1));
}

/**
 * One pollutant's before/after pair, or its explicit absence.
 *
 * @typedef {object} ScenarioRow
 * @property {string} field - Key on the `current` air-quality payload.
 * @property {string} labelKey - Translation key for the chart axis label.
 * @property {string} labelFallback
 * @property {string} nameKey - Translation key for the bare pollutant name.
 * @property {string} nameFallback
 * @property {string} reductionLabelKey - Translation key for the "X Reduction:" badge.
 * @property {string} reductionLabelFallback
 * @property {number|null} baseline - Measured concentration in µg/m³, or null.
 * @property {number|null} simulated - Concentration after the scenario, or null.
 * @property {number} reductionPct - The reduction the scenario claims, 0-100.
 * @property {boolean} hasReading - Whether `baseline` came from a measurement.
 */

/**
 * Everything the panel needs to render one scenario against the live readings.
 *
 * `rows` carries one entry per pollutant, each either measured (a `baseline` and
 * a `simulated`) or explicitly absent (`baseline: null`). The component charts the
 * measured ones and names the absent ones; it never has to guess which is which.
 *
 * @param {{ current?: any, scenarioId?: string, evPct?: number }} [params]
 * @returns {{
 *   scenario: typeof PRESET_SCENARIOS[number],
 *   rows: ScenarioRow[],
 *   measuredRows: ScenarioRow[],
 *   missingRows: ScenarioRow[],
 *   hasAnyReading: boolean,
 * }}
 */
export function buildScenarioComparison({ current, scenarioId, evPct } = {}) {
  const scenario = getScenario(scenarioId);
  const reductions = getReductions(scenario, evPct);

  const rows = SIMULATED_POLLUTANTS.map((pollutant) => {
    const baseline = readingOf(current?.[pollutant.field]);
    const reductionPct = reductions[pollutant.reductionKey];

    return {
      field: pollutant.field,
      labelKey: pollutant.labelKey,
      labelFallback: pollutant.labelFallback,
      nameKey: pollutant.nameKey,
      nameFallback: pollutant.nameFallback,
      reductionLabelKey: pollutant.reductionLabelKey,
      reductionLabelFallback: pollutant.reductionLabelFallback,
      baseline,
      simulated: applyReduction(baseline, reductionPct),
      reductionPct,
      hasReading: baseline !== null,
    };
  });

  const measuredRows = rows.filter((row) => row.hasReading);

  return {
    scenario,
    rows,
    measuredRows,
    missingRows: rows.filter((row) => !row.hasReading),
    hasAnyReading: measuredRows.length > 0,
  };
}
