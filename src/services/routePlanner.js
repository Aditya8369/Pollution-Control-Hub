/**
 * routePlanner.js
 * Handles geocoding, routing, and cross-referencing paths with PM2.5 data.
 */

// 1. Helper: Convert text locations to Coordinates (Using free Nominatim API)
const geocodeLocation = async (locationName) => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`,
  );
  if (!response.ok) throw new Error(`Failed to geocode: ${locationName}`);
  const data = await response.json();

  if (data.length === 0) throw new Error("Location not found");
  // Return the first match as [longitude, latitude] for OSRM
  return [parseFloat(data[0].lon), parseFloat(data[0].lat)];
};

// 2. Helper: Get Air Quality for a specific coordinate (Open-Meteo API)
/**
 * @param {any} lon
 * @param {any} lat
 */
const getSegmentPollution = async (lon, lat) => {
  const response = await fetch(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm2_5`,
  );
  if (!response.ok) throw new Error("Failed to fetch AQI data");
  const data = await response.json();

  return data.current.pm2_5;
};

// 3. Main Function: Calculate the Cleanest Route
/**
 * @param {any} originText
 * @param {any} destinationText
 */
export const calculateCleanRoute = async (originText, destinationText) => {
  try {
    // Step A: Convert user input into map coordinates
    const originCoords = await geocodeLocation(originText);
    const destCoords = await geocodeLocation(destinationText);

    // Step B: Fetch alternative routes from OSRM
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[0]},${originCoords[1]};${destCoords[0]},${destCoords[1]}?alternatives=true&geometries=geojson`;

    const routeResponse = await fetch(osrmUrl);
    const routeData = await routeResponse.json();

    if (routeData.code !== "Ok") throw new Error("Could not calculate routes");

    const routes = routeData.routes;
    const evaluatedRoutes = [];

    // Step C: Evaluate PM2.5 across multiple points along each route path
    for (const route of routes) {
      const coordinates = route.geometry.coordinates;

      // Sample 5 distinct checkpoint indices along the route path
      const checkpoints = [
        0, // Start
        Math.floor(coordinates.length * 0.25), // Quarter way
        Math.floor(coordinates.length * 0.5), // Midpoint
        Math.floor(coordinates.length * 0.75), // Three-quarter way
        coordinates.length - 1, // End
      ];

      let totalPm = 0;
      let maxPm = -1;
      let minPm = 99999;

      // Sample air quality at each checkpoint
      for (const idx of checkpoints) {
        const pt = coordinates[idx];
        const pmVal = await getSegmentPollution(pt[0], pt[1]);

        totalPm += pmVal;

        if (pmVal > maxPm) {
          maxPm = pmVal;
        }
        if (pmVal < minPm) {
          minPm = pmVal;
        }
      }

      const avgPm25 = (totalPm / checkpoints.length).toFixed(1);
      // @ts-ignore
      const exposureScore = route.distance * avgPm25;

      evaluatedRoutes.push({
        geometry: coordinates,
        distance: (route.distance / 1000).toFixed(2),
        duration: (route.duration / 60).toFixed(0),
        pm25: avgPm25,
        exposureScore: exposureScore,
        highestPm: maxPm.toFixed(1),
        lowestPm: minPm.toFixed(1),
      });
    }

    // Step D: Sort routes by the lowest exposure score
    evaluatedRoutes.sort((a, b) => a.exposureScore - b.exposureScore);

    // Return the cleanest route and all alternatives
    return {
      cleanestRoute: evaluatedRoutes[0],
      allRoutes: evaluatedRoutes,
    };
  } catch (error) {
    console.error("Routing Error:", error);
    throw error;
  }
};
