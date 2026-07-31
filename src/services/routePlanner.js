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
 * @param {number} lon - The longitude coordinate.
 * @param {number} lat - The latitude coordinate.
 * @returns {Promise<number>} A promise that resolves to the PM2.5 concentration level.
 * @throws {Error} Throws an error if the Open-Meteo API request fails.
 *
 * @example
 * const pm25 = await getSegmentPollution(72.8347, 18.9220);
 * // Returns 45.2
 */
const getSegmentPollution = async (lon, lat) => {
  const response = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5`
  );
  if (!response.ok) throw new Error("Failed to fetch AQI data");
  const data = await response.json();

  return data.current.pm2_5;
};

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
 * @property {string} pm25 - Average PM2.5 concentration along the route.
 * @property {string} inhaledDose - Estimated inhaled PM2.5 dosage in micrograms (µg).
 * @property {string} mode - The mode of transport used ('driving', 'biking', or 'foot').
 * @property {number} multiplier - Mode-specific exposure multiplier.
 * @property {number} exposureScore - Calculated score used to rank the route (lower is cleaner).
 * @property {string} highestPm - Maximum PM2.5 concentration encountered on the route.
 * @property {string} lowestPm - Minimum PM2.5 concentration encountered on the route.
 */

/**
 * Calculates the cleanest route between two locations by evaluating PM2.5 exposure across alternative paths.
 *
 * @param {string} originText - The starting location address or name.
 * @param {string} destinationText - The destination address or name.
 * @param {'driving' | 'biking' | 'foot'} [mode="driving"] - The method of transportation.
 * @returns {Promise<{ cleanestRoute: EvaluatedRoute, allRoutes: EvaluatedRoute[] }>} An object containing the optimal route and all evaluated alternatives sorted by exposure score.
 * @throws {Error} Throws an error if routing calculation or geocoding fails.
 *
 * @example
 * const routeData = await calculateCleanRoute("Andheri, Mumbai", "Bandra, Mumbai", "driving");
 * console.log(`Cleanest route dose: ${routeData.cleanestRoute.inhaledDose} µg`);
 */
export const calculateCleanRoute = async (originText, destinationText, mode = "driving") => {
  try {
    const activeMode = MODE_PROFILES[mode] ? mode : "driving";
    const modeConfig = MODE_PROFILES[activeMode];

    const originCoords = await geocodeLocation(originText);
    const destCoords = await geocodeLocation(destinationText);

    const osrmUrl = `https://router.project-osrm.org/route/v1/${modeConfig.osrmProfile}/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?alternatives=true&geometries=geojson`;

    const routeResponse = await fetch(osrmUrl);
    const routeData = await routeResponse.json();

    if (routeData.code !== "Ok") throw new Error("Could not calculate routes");

    const routes = routeData.routes;
    const evaluatedRoutes = [];

    for (const route of routes) {
      const coordinates = route.geometry.coordinates;

      const checkpoints = [
        0, 
        Math.floor(coordinates.length * 0.25), 
        Math.floor(coordinates.length * 0.5), 
        Math.floor(coordinates.length * 0.75), 
        coordinates.length - 1, 
      ];

      const pmPromises = checkpoints.map(idx => {
        const pt = coordinates[idx];
        return getSegmentPollution(pt[0], pt[1]);
      });
      
      const pmValues = await Promise.all(pmPromises);

      const totalPm = pmValues.reduce((sum, val) => sum + val, 0);
      const maxPm = Math.max(...pmValues);
      const minPm = Math.min(...pmValues);

      const avgPm25 = parseFloat((totalPm / pmValues.length).toFixed(1));
      const distanceKm = route.distance / 1000;
      
      const modeDurationMins = Math.max(1, Math.round((distanceKm / modeConfig.speedKmH) * 60));
      
      const durationHours = modeDurationMins / 60;
      const respirationRateM3H = (modeConfig.respirationRateLmin * 60) / 1000;
      const inhaledDoseUg = (avgPm25 * modeConfig.cabinFilterFactor * durationHours * respirationRateM3H).toFixed(1);

      const exposureScore = distanceKm * avgPm25 * modeConfig.multiplier;

      evaluatedRoutes.push({
        geometry: coordinates,
        distance: distanceKm.toFixed(2),
        duration: String(modeDurationMins),
        pm25: avgPm25.toFixed(1),
        inhaledDose: inhaledDoseUg,
        mode: activeMode,
        multiplier: modeConfig.multiplier,
        exposureScore: exposureScore,
        highestPm: maxPm.toFixed(1),
        lowestPm: minPm.toFixed(1),
      });
    }

    evaluatedRoutes.sort((a, b) => a.exposureScore - b.exposureScore);

    return {
      cleanestRoute: evaluatedRoutes[0],
      allRoutes: evaluatedRoutes,
    };
  } catch (error) {
    console.error("Routing Error:", error);
    throw error;
  }
};
