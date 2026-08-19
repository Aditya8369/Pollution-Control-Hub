/**
 * Air quality index standards.
 *
 * The app computes and displays the **US EPA AQI**, while every seed city in
 * `constants/cities.js` is Indian. India publishes its own index — the National Air
 * Quality Index (NAQI), maintained by the Central Pollution Control Board — and the two
 * disagree on both the number and the verdict:
 *
 * | PM2.5 (µg/m³) | US EPA                              | CPCB NAQI          |
 * | ------------- | ----------------------------------- | ------------------ |
 * | 40            | 112 — Unhealthy for Sensitive Groups | 66 — Satisfactory  |
 * | 100           | 174 — Unhealthy                     | 232 — Poor         |
 *
 * They do not even disagree in a consistent direction, so no rule of thumb converts one
 * to the other. A Delhi resident cross-checking this app against the CPCB's Sameer app or
 * a newspaper headline sees a different figure for the same air.
 *
 * This module makes the standard a parameter rather than an assumption. The EPA maths in
 * `airQualityService.ts` is untouched and stays the default; what is added here is a
 * second standard behind a shared interface, so a caller asks for an index *under a named
 * standard* and adding a third later (European CAQI, say) is a data change.
 *
 * Sources:
 * - CPCB, "National Air Quality Index" (2014), the report that defines the breakpoint
 *   tables, the sub-index formula and the minimum-data rule.
 * - CPCB AQI bulletin health advisories, for the band descriptors.
 */

/* ─── Shared types ────────────────────────────────────────────────────────── */

/**
 * One row of a breakpoint table: a concentration range mapped to an index range.
 *
 * Deliberately the same shape as the `Breakpoint` in `airQualityService.ts`, so the two
 * standards' tables are interchangeable as data.
 */
export interface Breakpoint {
  /** Low concentration limit, in the pollutant's reporting unit. */
  cLow: number;
  /** High concentration limit, in the pollutant's reporting unit. */
  cHigh: number;
  /** Index value at `cLow`. */
  iLow: number;
  /** Index value at `cHigh`. */
  iHigh: number;
}

/** The averaging window a breakpoint table is defined against. */
export type AveragingPeriod = '1h' | '8h' | '24h';

/** How a pollutant's concentrations are reported by its standard. */
export type ConcentrationUnit = 'ug/m3' | 'mg/m3';

/** A pollutant as a standard defines it. */
export interface PollutantSpec {
  /** Open-Meteo field name, so a caller can map a response without a lookup table. */
  key: string;
  /** Human-readable label, as the standard prints it. */
  label: string;
  /** The unit the breakpoint table below is expressed in. */
  unit: ConcentrationUnit;
  /** The averaging window the standard requires. */
  averaging: AveragingPeriod;
  /** Concentration-to-index rows, ascending. */
  breakpoints: Breakpoint[];
}

/** One band of an index scale. */
export interface IndexBand {
  /** Lowest index value in the band. */
  min: number;
  /** Highest index value in the band. */
  max: number;
  /** The band's name, as the standard prints it. */
  label: string;
  /** The standard's published health advisory for this band. */
  advisory: string;
}

/** An index standard: its pollutants, its bands, and its publication rules. */
export interface AqiStandard {
  /** Stable identifier used to select the standard. */
  id: string;
  /** Display name. */
  name: string;
  /** Issuing authority. */
  authority: string;
  /** Where the index scale tops out. */
  maxIndex: number;
  /**
   * How many pollutants must have a reading before an index may be published.
   * Below this the honest answer is "insufficient data", not a number.
   */
  minimumPollutants: number;
  /**
   * At least one of these must be present, whatever `minimumPollutants` says.
   * CPCB requires particulate matter specifically: an index built from gases alone
   * describes air nobody is worried about.
   */
  requiredPollutants: string[];
  /** The pollutants this standard scores, keyed by Open-Meteo field name. */
  pollutants: Record<string, PollutantSpec>;
  /** Band table, ascending and contiguous. */
  bands: IndexBand[];
}

/* ─── CPCB National Air Quality Index ─────────────────────────────────────── */

/**
 * CPCB PM2.5 breakpoints, 24-hour average, µg/m³.
 *
 * Note the shape of the scale versus the EPA's. CPCB gives the whole 101–200 stretch of
 * the index to 61–90 µg/m³, so the index climbs far more steeply through the range Indian
 * cities actually sit in during winter. That is the substantive difference between the two
 * standards, not a rounding detail.
 */
const CPCB_PM25: Breakpoint[] = [
  { cLow: 0, cHigh: 30, iLow: 0, iHigh: 50 },
  { cLow: 31, cHigh: 60, iLow: 51, iHigh: 100 },
  { cLow: 61, cHigh: 90, iLow: 101, iHigh: 200 },
  { cLow: 91, cHigh: 120, iLow: 201, iHigh: 300 },
  { cLow: 121, cHigh: 250, iLow: 301, iHigh: 400 },
  { cLow: 251, cHigh: 500, iLow: 401, iHigh: 500 },
];

/** CPCB PM10 breakpoints, 24-hour average, µg/m³. */
const CPCB_PM10: Breakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 101, cHigh: 250, iLow: 101, iHigh: 200 },
  { cLow: 251, cHigh: 350, iLow: 201, iHigh: 300 },
  { cLow: 351, cHigh: 430, iLow: 301, iHigh: 400 },
  { cLow: 431, cHigh: 600, iLow: 401, iHigh: 500 },
];

/** CPCB NO2 breakpoints, 24-hour average, µg/m³. */
const CPCB_NO2: Breakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 81, cHigh: 180, iLow: 101, iHigh: 200 },
  { cLow: 181, cHigh: 280, iLow: 201, iHigh: 300 },
  { cLow: 281, cHigh: 400, iLow: 301, iHigh: 400 },
  { cLow: 401, cHigh: 600, iLow: 401, iHigh: 500 },
];

/**
 * CPCB O3 breakpoints, 8-hour average, µg/m³.
 *
 * Eight hours, not the 24 the particulates use. Feeding an hourly value in here is the
 * single easiest way to get a plausible-looking wrong answer out of this module, which is
 * why `averaging` is carried on every spec rather than left implicit.
 */
const CPCB_O3: Breakpoint[] = [
  { cLow: 0, cHigh: 50, iLow: 0, iHigh: 50 },
  { cLow: 51, cHigh: 100, iLow: 51, iHigh: 100 },
  { cLow: 101, cHigh: 168, iLow: 101, iHigh: 200 },
  { cLow: 169, cHigh: 208, iLow: 201, iHigh: 300 },
  { cLow: 209, cHigh: 748, iLow: 301, iHigh: 400 },
  { cLow: 749, cHigh: 1000, iLow: 401, iHigh: 500 },
];

/**
 * CPCB CO breakpoints, 8-hour average, **mg/m³**.
 *
 * The only table on this scale not in µg/m³. Open-Meteo reports CO in µg/m³, so a value
 * handed straight to this table is a thousand times too large and pins the sub-index at
 * 500 — clean air reported as an emergency. `convertToStandardUnit` exists for this.
 */
const CPCB_CO: Breakpoint[] = [
  { cLow: 0, cHigh: 1.0, iLow: 0, iHigh: 50 },
  { cLow: 1.1, cHigh: 2.0, iLow: 51, iHigh: 100 },
  { cLow: 2.1, cHigh: 10.0, iLow: 101, iHigh: 200 },
  { cLow: 10.1, cHigh: 17.0, iLow: 201, iHigh: 300 },
  { cLow: 17.1, cHigh: 34.0, iLow: 301, iHigh: 400 },
  { cLow: 34.1, cHigh: 50.0, iLow: 401, iHigh: 500 },
];

/** CPCB SO2 breakpoints, 24-hour average, µg/m³. */
const CPCB_SO2: Breakpoint[] = [
  { cLow: 0, cHigh: 40, iLow: 0, iHigh: 50 },
  { cLow: 41, cHigh: 80, iLow: 51, iHigh: 100 },
  { cLow: 81, cHigh: 380, iLow: 101, iHigh: 200 },
  { cLow: 381, cHigh: 800, iLow: 201, iHigh: 300 },
  { cLow: 801, cHigh: 1600, iLow: 301, iHigh: 400 },
  { cLow: 1601, cHigh: 2400, iLow: 401, iHigh: 500 },
];

/**
 * CPCB NH3 breakpoints, 24-hour average, µg/m³.
 *
 * Ammonia has no US EPA sub-index at all. It matters in India because of fertiliser use
 * and livestock, and leaving it out is part of why an EPA-only index under-describes
 * agricultural-belt air.
 */
const CPCB_NH3: Breakpoint[] = [
  { cLow: 0, cHigh: 200, iLow: 0, iHigh: 50 },
  { cLow: 201, cHigh: 400, iLow: 51, iHigh: 100 },
  { cLow: 401, cHigh: 800, iLow: 101, iHigh: 200 },
  { cLow: 801, cHigh: 1200, iLow: 201, iHigh: 300 },
  { cLow: 1201, cHigh: 1800, iLow: 301, iHigh: 400 },
  { cLow: 1801, cHigh: 2400, iLow: 401, iHigh: 500 },
];

/**
 * CPCB's six bands, with the health advisory the CPCB publishes for each.
 *
 * The band names are not interchangeable with the EPA's. "Moderate" on this scale spans
 * 101–200 and carries a warning for people with asthma or heart disease; "Moderate" on
 * the EPA scale is 51–100 and is close to unremarkable. Presenting one label under the
 * other standard's scale is worse than presenting no label.
 */
const CPCB_BANDS: IndexBand[] = [
  {
    min: 0,
    max: 50,
    label: 'Good',
    advisory: 'Minimal impact.',
  },
  {
    min: 51,
    max: 100,
    label: 'Satisfactory',
    advisory: 'May cause minor breathing discomfort to sensitive people.',
  },
  {
    min: 101,
    max: 200,
    label: 'Moderate',
    advisory:
      'May cause breathing discomfort to people with lung disease such as asthma, and discomfort to people with heart disease, children and older adults.',
  },
  {
    min: 201,
    max: 300,
    label: 'Poor',
    advisory:
      'May cause breathing discomfort to most people on prolonged exposure, and discomfort to people with heart disease.',
  },
  {
    min: 301,
    max: 400,
    label: 'Very Poor',
    advisory:
      'May cause respiratory illness on prolonged exposure. Effect may be more pronounced in people with lung and heart disease.',
  },
  {
    min: 401,
    max: 500,
    label: 'Severe',
    advisory:
      'May cause respiratory effects even in healthy people, and serious health impacts in people with lung or heart disease. Effects may be felt even during light physical activity.',
  },
];

/** The CPCB National Air Quality Index. */
export const CPCB_STANDARD: AqiStandard = {
  id: 'cpcb',
  name: 'National Air Quality Index',
  authority: 'Central Pollution Control Board, India',
  maxIndex: 500,
  // CPCB will not publish an index from fewer than three pollutants, and requires that
  // PM2.5 or PM10 be among them.
  minimumPollutants: 3,
  requiredPollutants: ['pm2_5', 'pm10'],
  pollutants: {
    pm2_5: {
      key: 'pm2_5',
      label: 'PM2.5',
      unit: 'ug/m3',
      averaging: '24h',
      breakpoints: CPCB_PM25,
    },
    pm10: {
      key: 'pm10',
      label: 'PM10',
      unit: 'ug/m3',
      averaging: '24h',
      breakpoints: CPCB_PM10,
    },
    nitrogen_dioxide: {
      key: 'nitrogen_dioxide',
      label: 'NO2',
      unit: 'ug/m3',
      averaging: '24h',
      breakpoints: CPCB_NO2,
    },
    ozone: {
      key: 'ozone',
      label: 'O3',
      unit: 'ug/m3',
      averaging: '8h',
      breakpoints: CPCB_O3,
    },
    carbon_monoxide: {
      key: 'carbon_monoxide',
      label: 'CO',
      unit: 'mg/m3',
      averaging: '8h',
      breakpoints: CPCB_CO,
    },
    sulphur_dioxide: {
      key: 'sulphur_dioxide',
      label: 'SO2',
      unit: 'ug/m3',
      averaging: '24h',
      breakpoints: CPCB_SO2,
    },
    ammonia: {
      key: 'ammonia',
      label: 'NH3',
      unit: 'ug/m3',
      averaging: '24h',
      breakpoints: CPCB_NH3,
    },
  },
  bands: CPCB_BANDS,
};

/** Every standard this build can compute, keyed by id. */
export const AQI_STANDARDS: Record<string, AqiStandard> = {
  [CPCB_STANDARD.id]: CPCB_STANDARD,
};

/**
 * Looks a standard up by id.
 *
 * @param id - A key of `AQI_STANDARDS`.
 * @returns The standard, or null when the id is unknown.
 */
export function getStandard(id: string): AqiStandard | null {
  if (typeof id !== 'string') return null;
  return AQI_STANDARDS[id] ?? null;
}

/* ─── Sub-index calculation ───────────────────────────────────────────────── */

/**
 * Decimal places a breakpoint table is expressed in.
 *
 * Derived from the table rather than declared, so the two cannot drift apart if a table
 * is edited. CPCB's gas and particulate tables are whole numbers; the CO table, being in
 * mg/m³, carries one decimal.
 *
 * @param breakpoints - The table to inspect.
 * @returns Decimal places, e.g. 0 for PM2.5 and 1 for CO.
 */
function breakpointPrecision(breakpoints: Breakpoint[]): number {
  let decimals = 0;
  for (const bp of breakpoints) {
    for (const bound of [bp.cLow, bp.cHigh]) {
      const text = String(bound);
      const dot = text.indexOf('.');
      if (dot !== -1) decimals = Math.max(decimals, text.length - dot - 1);
    }
  }
  return decimals;
}

/**
 * Truncates a concentration to a table's reporting precision.
 *
 * The published tables are not contiguous — PM2.5 runs to 30 and resumes at 31, CO to 1.0
 * and resumes at 1.1. Truncating before the lookup is what closes those gaps. Without it
 * a reading of 30.4 µg/m³ matches no band, and the pollutant is silently scored 0.
 *
 * Truncation rather than rounding also matches how the EPA's own algorithm is specified,
 * which keeps this module consistent with `subAqi` in `airQualityService.ts`.
 *
 * @param concentration - The measured value.
 * @param decimals - Places to keep.
 * @returns The truncated value.
 */
function truncateToPrecision(concentration: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.floor(concentration * factor) / factor;
}

/**
 * Converts a reading into the unit a pollutant's breakpoint table expects.
 *
 * Open-Meteo reports every pollutant in µg/m³. CPCB's CO table is in mg/m³, and handing
 * it a µg/m³ figure inflates the reading a thousandfold — clean air scores 500. This is
 * the conversion that prevents that, and it is a no-op for every other pollutant.
 *
 * @param value - The reading, in µg/m³ as the API supplies it.
 * @param unit - The unit the target table is expressed in.
 * @returns The value in the table's unit.
 */
export function convertToStandardUnit(
  value: number,
  unit: ConcentrationUnit
): number {
  return unit === 'mg/m3' ? value / 1000 : value;
}

/**
 * Scores one pollutant against a breakpoint table.
 *
 * Linear interpolation within the band the reading falls in, which is the sub-index
 * formula CPCB publishes:
 *
 * ```
 * Ip = [(IHi - ILo) / (BHi - BLo)] x (Cp - BLo) + ILo
 * ```
 *
 * @param concentration - The reading, already in the table's unit.
 * @param breakpoints - The pollutant's table.
 * @param maxIndex - Where the scale tops out, for readings above the last band.
 * @returns The sub-index, or null when the reading is not usable.
 */
export function subIndex(
  concentration: number,
  breakpoints: Breakpoint[],
  maxIndex = 500
): number | null {
  if (!Array.isArray(breakpoints) || breakpoints.length === 0) return null;
  if (typeof concentration !== 'number' || !Number.isFinite(concentration)) {
    return null;
  }

  // A negative reading is sensor noise, not air cleaner than clean. Returning null
  // rather than 0 keeps it out of the pollutant count as well as out of the maximum,
  // so it cannot help satisfy the three-pollutant minimum.
  if (concentration < 0) return null;

  const value = truncateToPrecision(
    concentration,
    breakpointPrecision(breakpoints)
  );

  const highest = breakpoints[breakpoints.length - 1];
  if (value > highest.cHigh) return maxIndex;

  for (const bp of breakpoints) {
    if (value >= bp.cLow && value <= bp.cHigh) {
      const span = bp.cHigh - bp.cLow;
      // A degenerate single-point band would divide by zero.
      if (span === 0) return bp.iLow;
      return Math.round(
        ((bp.iHigh - bp.iLow) / span) * (value - bp.cLow) + bp.iLow
      );
    }
  }

  return 0;
}

/**
 * The band an index value falls in.
 *
 * @param index - An index value.
 * @param standard - The standard whose bands to search.
 * @returns The band, or null when the value is not a usable index.
 */
export function getBand(
  index: number,
  standard: AqiStandard
): IndexBand | null {
  if (typeof index !== 'number' || !Number.isFinite(index) || index < 0) {
    return null;
  }
  for (const band of standard.bands) {
    if (index >= band.min && index <= band.max) return band;
  }
  // Above the top band. The scale is capped, so the worst band is the honest answer
  // rather than null — the air is not "unclassifiable", it is off the top of the chart.
  return standard.bands[standard.bands.length - 1] ?? null;
}

/* ─── Index calculation ───────────────────────────────────────────────────── */

/** One pollutant's contribution to an index. */
export interface SubIndexResult {
  /** Open-Meteo field name. */
  key: string;
  /** The pollutant's printed label. */
  label: string;
  /** The reading as supplied, in µg/m³. */
  concentration: number;
  /** The sub-index it scored. */
  index: number;
  /** The averaging window the standard expects for this pollutant. */
  averaging: AveragingPeriod;
}

/** The outcome of an index calculation. */
export interface IndexResult {
  /** The index, or null when it could not be published. */
  index: number | null;
  /** The band the index falls in, or null. */
  band: IndexBand | null;
  /** The pollutant that produced the maximum sub-index, or null. */
  dominantPollutant: SubIndexResult | null;
  /** Every pollutant that scored, worst first. */
  subIndices: SubIndexResult[];
  /** Whether the standard's minimum-data rule was met. */
  sufficient: boolean;
  /** When `sufficient` is false, why. Null otherwise. */
  reason: string | null;
  /** The standard used. */
  standardId: string;
}

/**
 * Computes an air quality index from a set of pollutant readings.
 *
 * Two things distinguish this from taking a maximum over whatever is available.
 *
 * **The minimum-data rule is enforced.** CPCB does not publish an index from fewer than
 * three pollutants, or from any set that excludes both PM2.5 and PM10. That is not
 * bureaucratic: the maximum of a partial set is a lower bound, and presenting it as the
 * index systematically under-reports exactly when a station is degraded. When the rule is
 * not met this returns `sufficient: false` with a reason and a null index, so a caller has
 * to decide what to show rather than being handed a misleading number.
 *
 * **Units are converted per pollutant.** Readings come in as µg/m³, which is what
 * Open-Meteo reports; CO's table is in mg/m³ and is converted before lookup.
 *
 * @param readings - Concentrations in µg/m³, keyed by Open-Meteo field name. Missing,
 *   null and non-finite entries are skipped rather than treated as zero.
 * @param standard - The standard to compute under. Defaults to CPCB.
 * @returns The index, the band, the dominant pollutant, and every sub-index.
 *
 * @example
 * calculateIndex({ pm2_5: 100, pm10: 180, nitrogen_dioxide: 50 });
 * // → index 232, band "Poor", dominant PM2.5
 */
export function calculateIndex(
  readings: Record<string, number | null | undefined>,
  standard: AqiStandard = CPCB_STANDARD
): IndexResult {
  const subIndices: SubIndexResult[] = [];

  const source = readings && typeof readings === 'object' ? readings : {};

  for (const spec of Object.values(standard.pollutants)) {
    const raw = source[spec.key];
    if (typeof raw !== 'number' || !Number.isFinite(raw)) continue;

    const converted = convertToStandardUnit(raw, spec.unit);
    const index = subIndex(converted, spec.breakpoints, standard.maxIndex);
    if (index === null) continue;

    subIndices.push({
      key: spec.key,
      label: spec.label,
      concentration: raw,
      index,
      averaging: spec.averaging,
    });
  }

  // Worst first, so the dominant pollutant is simply the head of the list and a caller
  // rendering a breakdown gets a sensible order for free.
  subIndices.sort((a, b) => b.index - a.index);

  const insufficient = (reason: string): IndexResult => ({
    index: null,
    band: null,
    dominantPollutant: null,
    subIndices,
    sufficient: false,
    reason,
    standardId: standard.id,
  });

  if (subIndices.length < standard.minimumPollutants) {
    return insufficient(
      `${standard.name} requires at least ${standard.minimumPollutants} pollutants; ${subIndices.length} available.`
    );
  }

  if (standard.requiredPollutants.length > 0) {
    const hasRequired = subIndices.some((entry) =>
      standard.requiredPollutants.includes(entry.key)
    );
    if (!hasRequired) {
      return insufficient(
        `${standard.name} requires at least one of ${standard.requiredPollutants.join(' or ')}.`
      );
    }
  }

  const dominant = subIndices[0];

  return {
    index: dominant.index,
    band: getBand(dominant.index, standard),
    dominantPollutant: dominant,
    subIndices,
    sufficient: true,
    reason: null,
    standardId: standard.id,
  };
}
