// Ensure navigator is mocked in Node environment before invoking browser-centric services
if (typeof global !== 'undefined' && !global.navigator) {
  // @ts-ignore
  global.navigator = { onLine: true };
}

import { searchLocations } from '../../src/services/geocodingService';
import { fetchAirQualityByCoords, getAQIBand } from '../../src/services/airQualityService';

/**
 * Resolves a site query and fetches its current AQI.
 *
 * @param {string} siteName - Name of the site/location.
 * @returns {Promise<{
 *   success: boolean,
 *   site?: string,
 *   aqi?: number,
 *   band?: string,
 *   errorType?: string,
 *   message: string
 * }>}
 */
export async function getAQIForSite(siteName) {
  if (!siteName || siteName.trim() === '') {
    return {
      success: false,
      errorType: 'MISSING_SITE',
      message: 'Please provide a location name.'
    };
  }

  const query = siteName.trim();

  try {
    // Resolve site name using the existing geocoding service
    const locations = await searchLocations(query, 1);
    if (!locations || locations.length === 0) {
      return {
        success: false,
        errorType: 'UNKNOWN_SITE',
        message: `Sorry, I couldn't find any location named ${query}.`
      };
    }

    const matchedLocation = locations[0];
    const { lat, lon, name } = matchedLocation;

    // Fetch air quality data using coordinates
    const aqiData = await fetchAirQualityByCoords(lat, lon, undefined, true);
    if (!aqiData || !aqiData.current || typeof aqiData.current.us_aqi !== 'number') {
      return {
        success: false,
        errorType: 'API_FAILURE',
        message: `Sorry, I couldn't retrieve the air quality data for ${name} at the moment.`
      };
    }

    const aqi = aqiData.current.us_aqi;
    const band = getAQIBand(aqi);
    const bandLabel = band.label.toLowerCase();

    // Map specific labels or return the standard qualitative band label
    return {
      success: true,
      site: name,
      aqi,
      band: bandLabel,
      message: `The current AQI at ${name} is ${aqi}, which is considered ${bandLabel}.`
    };
  } catch (error) {
    console.error(`Error resolving AQI for site "${query}":`, error);
    return {
      success: false,
      errorType: 'API_FAILURE',
      message: "Sorry, I couldn't retrieve the air quality data at the moment."
    };
  }
}
