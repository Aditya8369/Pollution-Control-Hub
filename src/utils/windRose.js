/**
 * Bins hourly pollutant readings into the 16 compass sectors the wind arrived from.
 *
 * Extracted from WindPollutionRose so the binning can be tested without a network
 * round-trip. The rule it exists to enforce: a sector nothing was ever observed from
 * reports `null`, not `0`.
 *
 * On a radar chart `0` means "the cleanest air comes from this direction" -- the exact
 * opposite of "we have no data for this direction". The chart's whole purpose is to
 * identify which directions carry pollution, so substituting 0 inverted its meaning.
 * The previous code guarded the 0/0 division with `count || 1`, which avoided the NaN
 * but produced a number that asserts something specific and false.
 */

/** 16 cardinal directions, starting at N and running clockwise. */
export const DIRECTIONS = [
  'N', 'NNE', 'NE', 'ENE',
  'E', 'ESE', 'SE', 'SSE',
  'S', 'SSW', 'SW', 'WSW',
  'W', 'WNW', 'NW', 'NNW',
];

/** The pollutant series carried on each sector, keyed by the Open-Meteo field name. */
export const POLLUTANTS = ['pm2_5', 'pm10', 'nitrogen_dioxide', 'ozone'];

/** Degrees covered by one of the 16 sectors. */
const SECTOR_WIDTH = 360 / DIRECTIONS.length; // 22.5

/**
 * Maps a wind bearing in degrees to one of the 16 cardinal sectors.
 *
 * Each sector is centred on its nominal bearing, so N spans 348.75deg-11.25deg. The
 * modulo after rounding is what wraps 348.75-360 back to N rather than off the end
 * of the array.
 *
 * @param {number} deg
 * @returns {string|null} null when the bearing is not a usable number.
 */
export function getCardinalDirection(deg) {
  if (typeof deg !== 'number' || !Number.isFinite(deg)) return null;

  const normalized = ((deg % 360) + 360) % 360;
  const index = Math.round(normalized / SECTOR_WIDTH) % DIRECTIONS.length;
  return DIRECTIONS[index];
}

/**
 * @param {unknown} value
 * @returns {boolean} True when the value is a usable numeric reading.
 */
function isReading(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/** @param {number} sum @param {number} count */
function mean(sum, count) {
  if (count <= 0) return null;
  return Number((sum / count).toFixed(1));
}

/**
 * @param {object} airHourly Open-Meteo air-quality `hourly` block.
 * @param {object} weatherHourly Open-Meteo forecast `hourly` block.
 * @returns {{
 *   sectors: Array<object>,
 *   totalObservations: number,
 *   sampledSectors: number,
 *   dominantDirection: string|null,
 * }}
 */
export function buildWindRose(airHourly, weatherHourly) {
  const air = airHourly || {};
  const weather = weatherHourly || {};

  /** @type {Record<string, any>} */
  const groups = {};
  for (const direction of DIRECTIONS) {
    groups[direction] = {
      count: 0,
      windSpeedSum: 0,
      windSpeedCount: 0,
    };
    for (const pollutant of POLLUTANTS) {
      groups[direction][pollutant] = { sum: 0, count: 0 };
    }
  }

  // The two endpoints are separate requests and can disagree on length; pairing by
  // index past the shorter one would align a pollutant reading with the wrong hour.
  const length = Math.min(
    air.time?.length || 0,
    weather.time?.length || 0
  );

  let totalObservations = 0;

  for (let i = 0; i < length; i++) {
    const direction = getCardinalDirection(weather.wind_direction_10m?.[i]);
    if (!direction) continue;

    const group = groups[direction];
    group.count += 1;
    totalObservations += 1;

    const speed = weather.wind_speed_10m?.[i];
    if (isReading(speed)) {
      group.windSpeedSum += speed;
      group.windSpeedCount += 1;
    }

    for (const pollutant of POLLUTANTS) {
      const value = air[pollutant]?.[i];
      if (isReading(value)) {
        // Counted per pollutant rather than off the sector's hour count: a sector can
        // have wind data for an hour the air-quality endpoint left null, and dividing
        // by the hour count there would understate the mean.
        group[pollutant].sum += value;
        group[pollutant].count += 1;
      }
    }
  }

  const sectors = DIRECTIONS.map((direction) => {
    const group = groups[direction];
    const sector = {
      direction,
      frequency: group.count,
      // The share of observed hours the wind came from here, which is what a wind rose
      // is normally read for and what the old chart discarded entirely.
      frequencyPct:
        totalObservations > 0
          ? Number(((group.count / totalObservations) * 100).toFixed(1))
          : 0,
      avgWindSpeed: mean(group.windSpeedSum, group.windSpeedCount),
      hasData: group.count > 0,
    };

    for (const pollutant of POLLUTANTS) {
      // null, not 0. Recharts skips null points, so the polygon spans only the sectors
      // that were actually sampled instead of being dragged to the origin.
      sector[pollutant] = mean(group[pollutant].sum, group[pollutant].count);
    }

    return sector;
  });

  const sampled = sectors.filter((sector) => sector.hasData);

  const dominantDirection = sampled.length
    ? sampled.reduce((best, sector) => (sector.frequency > best.frequency ? sector : best)).direction
    : null;

  return {
    sectors,
    totalObservations,
    sampledSectors: sampled.length,
    dominantDirection,
  };
}
