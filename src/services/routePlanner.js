import { getAQIBand } from './airQualityService';

/**
 * Converts PM2.5 (µg/m³) concentration to US AQI score.
 *
 * @param {number} pm - PM2.5 concentration in µg/m³.
 * @returns {number} Corresponding US AQI integer.
 */
export function pm25ToAQI(pm) {
  if (pm == null || isNaN(pm) || pm < 0) return 0;
  if (pm <= 12.0) return Math.round(((50 - 0) / (12.0 - 0)) * (pm - 0) + 0);
  if (pm <= 35.4) return Math.round(((100 - 51) / (35.4 - 12.1)) * (pm - 12.1) + 51);
  if (pm <= 55.4) return Math.round(((150 - 101) / (55.4 - 35.5)) * (pm - 35.5) + 101);
  if (pm <= 150.4) return Math.round(((200 - 151) / (150.4 - 55.5)) * (pm - 55.5) + 151);
  if (pm <= 250.4) return Math.round(((300 - 201) / (250.4 - 150.5)) * (pm - 150.5) + 201);
  return Math.round(((500 - 301) / (500.4 - 250.5)) * (pm - 250.5) + 301);
}

/**
 * routePlanner.js
 * Handles geocoding, routing, and cross-referencing paths with PM2.5 data.
 */

/**
 * Converts a text location name into geographic coordinates using the Nominatim API.
 *
 * @param {string} locationName - The human-readable name of the location (e.g., "Mumbai").
 * @returns {Promise<[number, number]>} A promise that resolves to an array containing [longitude, latitude].
 * @throws {Error} Throws an error if the API request fails or the location cannot be found.
 *
 * @example
 * const coords = await geocodeLocation("Gateway of India");
 * // Returns [72.8347, 18.9220]
 */
const geocodeLocation = async (locationName) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`,
    {
      headers: {
        'User-Agent': 'CleanRoutePlanner/1.0 (contact@example.com)' 
      }
    }
  );
  if (!response.ok) throw new Error(`Failed to geocode: ${locationName}`);
  const data = await response.json();

  if (data.length === 0) throw new Error("Location not found");
  return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
};

/**
 * Fetches the current PM2.5 air pollution level for a specific geographic coordinate.
 *
 * Returns `null` — not a substitute concentration — when the reading cannot be obtained.
 * The planner ranks routes by the pollution it measures along them, so a placeholder here
 * does not stay a placeholder: it becomes the average, the inhaled dose, the segment
 * colour, and ultimately the route we tell someone to walk down. An unknown reading has
 * to stay recognisably unknown all the way to the UI.
 *
 * @param {number} lon - The longitude coordinate.
 * @param {number} lat - The latitude coordinate.
 * @returns {Promise<number|null>} PM2.5 concentration in µg/m³, or null if unavailable.
 */
const getSegmentPollution = async (lon, lat) => {
  try {
    const response = await fetch(
      `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5`
    );
    if (!response.ok) return null;
    const data = await response.json();
    const value = data.current?.pm2_5;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    return value;
  } catch {
    return null;
  }
};

/**
 * Picks the sample points along a route, without repeats.
 *
 * The five fractional positions collapse onto each other for short routes — a two-point
 * geometry yields [0, 0, 1, 1, 1] — which would otherwise fire duplicate requests and
 * produce zero-length segments.
 *
 * @param {number} pointCount - Number of coordinates in the route geometry.
 * @returns {number[]} Ascending, de-duplicated indices into the geometry.
 */
export function routeCheckpoints(pointCount) {
  if (!Number.isFinite(pointCount) || pointCount <= 0) return [];
  const last = pointCount - 1;
  const raw = [
    0,
    Math.floor(pointCount * 0.25),
    Math.floor(pointCount * 0.5),
    Math.floor(pointCount * 0.75),
    last,
  ];
  return [...new Set(raw.filter((i) => i >= 0 && i <= last))].sort((a, b) => a - b);
}

/**
 * Summarises a set of checkpoint readings, ignoring the ones that could not be fetched.
 *
 * @param {(number|null)[]} readings - Per-checkpoint PM2.5 values; null where unavailable.
 * @returns {{ average: number|null, highest: number|null, lowest: number|null,
 *             measuredCount: number, totalCount: number, coverage: number }}
 */
export function summarisePm25(readings) {
  const measured = readings.filter(
    (v) => typeof v === 'number' && Number.isFinite(v)
  );
  const totalCount = readings.length;
  const measuredCount = measured.length;
  const coverage = totalCount === 0 ? 0 : measuredCount / totalCount;

  if (measuredCount === 0) {
    return { average: null, highest: null, lowest: null, measuredCount, totalCount, coverage };
  }

  const sum = measured.reduce((acc, v) => acc + v, 0);
  return {
    average: parseFloat((sum / measuredCount).toFixed(1)),
    highest: Math.max(...measured),
    lowest: Math.min(...measured),
    measuredCount,
    totalCount,
    coverage,
  };
}

/**
 * Colour used for a stretch of route whose pollution could not be measured.
 *
 * Deliberately outside the AQI palette — a grey line reads as "no data", whereas any
 * green/amber/red would read as a measurement.
 */
export const UNMEASURED_SEGMENT_COLOR = '#94a3b8';

const MODE_PROFILES = {
  driving: {
    label: "Driving",
    osrmProfile: "driving",
    speedKmH: 35,
    respirationRateLmin: 8,
    cabinFilterFactor: 0.7,
    multiplier: 1.0,
  },
  biking: {
    label: "Cycling",
    osrmProfile: "cycling", 
    speedKmH: 15,
    respirationRateLmin: 35,
    cabinFilterFactor: 1.0,
    multiplier: 3.5,
  },
  foot: {
    label: "Walking",
    osrmProfile: "foot", 
    speedKmH: 4.8,
    respirationRateLmin: 20,
    cabinFilterFactor: 1.0,
    multiplier: 2.2,
  },
};

/**
 * Route evaluation object containing geometry, exposure metrics, and travel details.
 * @typedef {Object} EvaluatedRoute
 * @property {number[][]} geometry - Array of [longitude, latitude] coordinates making up the path.
 * @property {string} distance - Total distance in kilometers.
 * @property {string} duration - Estimated travel time in minutes.
 * @property {string|null} pm25 - Average PM2.5 along the route, or null when nothing was measured.
 * @property {string|null} inhaledDose - Estimated inhaled PM2.5 dosage in µg, or null when unmeasured.
 * @property {string} mode - The mode of transport used ('driving', 'biking', or 'foot').
 * @property {number} multiplier - Mode-specific exposure multiplier.
 * @property {number|null} exposureScore - Score used to rank the route (lower is cleaner); null when unmeasured.
 * @property {string|null} highestPm - Maximum PM2.5 encountered, or null when unmeasured.
 * @property {string|null} lowestPm - Minimum PM2.5 encountered, or null when unmeasured.
 * @property {boolean} measured - True when at least one checkpoint returned a reading.
 * @property {number} measuredCheckpoints - How many checkpoints returned a reading.
 * @property {number} totalCheckpoints - How many checkpoints were sampled.
 * @property {number} coverage - measuredCheckpoints / totalCheckpoints, in the range 0–1.
 */

/**
 * Calculates the cleanest route between two locations by evaluating PM2.5 exposure across alternative paths.
 *
 * Pollution readings that cannot be fetched are left as null rather than replaced with a
 * stand-in concentration. A route with no readings at all is returned with null metrics,
 * is sorted behind every measured route, and is never chosen as `cleanestRoute` — so the
 * app can say "we could not measure this" instead of recommending a road on invented data.
 *
 * @param {string} originText - The starting location address or name.
 * @param {string} destinationText - The destination address or name.
 * @param {'driving' | 'biking' | 'foot'} [mode="driving"] - The method of transportation.
 * @returns {Promise<{ cleanestRoute: EvaluatedRoute|null, allRoutes: EvaluatedRoute[],
 *                     pollutionDataAvailable: boolean, rankedRouteCount: number,
 *                     totalRouteCount: number }>} The optimal route (null when nothing could
 *   be measured), every evaluated alternative, and how much of the ranking is real.
 * @throws {Error} Throws an error if routing calculation or geocoding fails.
 *
 * @example
 * const routeData = await calculateCleanRoute("Andheri, Mumbai", "Bandra, Mumbai", "driving");
 * if (routeData.pollutionDataAvailable) {
 *   console.log(`Cleanest route dose: ${routeData.cleanestRoute.inhaledDose} µg`);
 * }
 */
export const calculateCleanRoute = async (originText, destinationText, mode = "driving") => {
  try {
    const activeMode = MODE_PROFILES[mode] ? mode : "driving";
    const modeConfig = MODE_PROFILES[activeMode];

    // The two geocodes are independent — run them together instead of serially.
    const [originCoords, destCoords] = await Promise.all([
      geocodeLocation(originText),
      geocodeLocation(destinationText),
    ]);

    const osrmUrl = `https://router.project-osrm.org/route/v1/${modeConfig.osrmProfile}/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?alternatives=true&geometries=geojson`;

    const routeResponse = await fetch(osrmUrl);
    const routeData = await routeResponse.json();

    if (routeData.code !== "Ok") throw new Error("Could not calculate routes");

    const routes = routeData.routes;
    const evaluatedRoutes = [];

    for (const route of routes) {
      const coordinates = route.geometry.coordinates;
      const checkpoints = routeCheckpoints(coordinates.length);

      const pmValues = await Promise.all(
        checkpoints.map((idx) => {
          const pt = coordinates[idx];
          return getSegmentPollution(pt[0], pt[1]);
        })
      );

      const stats = summarisePm25(pmValues);
      const measured = stats.measuredCount > 0;
      const avgPm25 = stats.average;

      const distanceKm = route.distance / 1000;
      const modeDurationMins = Math.max(1, Math.round((distanceKm / modeConfig.speedKmH) * 60));

      // Distance and time come from the routing engine, so they stand on their own.
      // Everything derived from a concentration only exists when one was measured.
      const durationHours = modeDurationMins / 60;
      const respirationRateM3H = (modeConfig.respirationRateLmin * 60) / 1000;
      const inhaledDoseUg = measured
        ? (avgPm25 * modeConfig.cabinFilterFactor * durationHours * respirationRateM3H).toFixed(1)
        : null;

      // A route with no readings gets no score, so it cannot win the ranking below.
      const exposureScore = measured ? distanceKm * avgPm25 * modeConfig.multiplier : null;

      // Build coloured AQI polyline segments along consecutive route geometry sections.
      // A segment is only coloured when both of its endpoints were actually measured —
      // interpolating from a single endpoint would spread one reading over ground it
      // never covered.
      const segments = [];
      for (let k = 0; k < checkpoints.length - 1; k++) {
        const startIndex = checkpoints[k];
        const endIndex = checkpoints[k + 1];
        if (startIndex >= endIndex) continue;

        const sectionCoords = coordinates
          .slice(startIndex, endIndex + 1)
          .map(pt => [pt[1], pt[0]]); // Leaflet format [lat, lon]

        const startPm = pmValues[k];
        const endPm = pmValues[k + 1];
        const bothMeasured =
          typeof startPm === 'number' && typeof endPm === 'number';

        if (!bothMeasured) {
          segments.push({
            coordinates: sectionCoords,
            aqi: null,
            category: 'Unavailable',
            color: UNMEASURED_SEGMENT_COLOR,
            pm25: null,
            measured: false,
          });
          continue;
        }

        const segmentPm25 = parseFloat(((startPm + endPm) / 2).toFixed(1));
        const segmentAqi = pm25ToAQI(segmentPm25);
        const band = getAQIBand(segmentAqi);

        segments.push({
          coordinates: sectionCoords,
          aqi: segmentAqi,
          category: band.label,
          color: band.color,
          pm25: segmentPm25,
          measured: true,
        });
      }

      // If segments is empty (e.g. coordinates length < 2), fall back to a single segment
      if (segments.length === 0 && coordinates.length >= 2) {
        const leafletCoords = coordinates.map(pt => [pt[1], pt[0]]);
        if (measured) {
          const segmentAqi = pm25ToAQI(avgPm25);
          const band = getAQIBand(segmentAqi);
          segments.push({
            coordinates: leafletCoords,
            aqi: segmentAqi,
            category: band.label,
            color: band.color,
            pm25: avgPm25,
            measured: true,
          });
        } else {
          segments.push({
            coordinates: leafletCoords,
            aqi: null,
            category: 'Unavailable',
            color: UNMEASURED_SEGMENT_COLOR,
            pm25: null,
            measured: false,
          });
        }
      }

      evaluatedRoutes.push({
        geometry: coordinates,
        segments: segments,
        distance: distanceKm.toFixed(2),
        duration: String(modeDurationMins),
        pm25: measured ? avgPm25.toFixed(1) : null,
        inhaledDose: inhaledDoseUg,
        mode: activeMode,
        multiplier: modeConfig.multiplier,
        exposureScore: exposureScore,
        highestPm: measured ? stats.highest.toFixed(1) : null,
        lowestPm: measured ? stats.lowest.toFixed(1) : null,
        measured,
        measuredCheckpoints: stats.measuredCount,
        totalCheckpoints: stats.totalCount,
        coverage: stats.coverage,
      });
    }

    // Rank only on measured exposure. Routes we know nothing about sort to the end
    // rather than to the front, which is where a null would land in a numeric sort.
    evaluatedRoutes.sort((a, b) => {
      if (a.measured !== b.measured) return a.measured ? -1 : 1;
      if (!a.measured) return 0;
      return a.exposureScore - b.exposureScore;
    });

    const cleanestRoute = evaluatedRoutes.find((r) => r.measured) || null;
    const measuredRoutes = evaluatedRoutes.filter((r) => r.measured);

    return {
      cleanestRoute,
      allRoutes: evaluatedRoutes,
      // Lets the UI say "we ranked 2 of 3 routes" instead of quietly presenting a
      // partial ranking as a complete one.
      pollutionDataAvailable: measuredRoutes.length > 0,
      rankedRouteCount: measuredRoutes.length,
      totalRouteCount: evaluatedRoutes.length,
    };
  } catch (error) {
    console.error("Routing Error:", error);
    throw error;
  }
};
