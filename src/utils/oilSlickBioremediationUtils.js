/**
 * Offshore Oil Slick Bioremediation & Weathering Utilities
 */

/**
 * @typedef {Object} WeatheringRate
 * @property {number} evaporationPercent24h
 * @property {number} naturalEmulsificationPercent
 * @property {number} biodegradationHalfLifeDays
 */

/**
 * Calculates oil slick physical weathering rate based on API gravity and temperature.
 *
 * @param {string} oilType
 * @param {number} [waterTempC=26.0]
 * @returns {WeatheringRate}
 */
export function calculateOilWeatheringRate(oilType, waterTempC = 26.0) {
  let evap = 25.0;
  let emul = 40.0;
  let halfLife = 14.0;

  if (oilType.includes('Light')) {
    evap = 55.0;
    emul = 15.0;
    halfLife = 5.0;
  } else if (oilType.includes('Heavy') || oilType.includes('Bunker')) {
    evap = 10.0;
    emul = 65.0;
    halfLife = 45.0;
  }

  // Temperature acceleration factor
  const tempFactor = 1.0 + (waterTempC - 20.0) * 0.02;

  return {
    evaporationPercent24h: Math.min(90.0, Math.round(evap * tempFactor * 10) / 10),
    naturalEmulsificationPercent: Math.min(95.0, Math.round(emul * tempFactor * 10) / 10),
    biodegradationHalfLifeDays: Math.round((halfLife / tempFactor) * 10) / 10,
  };
}

/**
 * Recommends microbial bioremediation strain dosing for oiled shoreline sediments.
 *
 * @param {number} beachLengthMeters
 * @param {number} oilThicknessMm
 * @returns {number}
 */
export function calculateBioremediationDosingKg(beachLengthMeters, oilThicknessMm) {
  const areaSqMeters = beachLengthMeters * 10.0;
  const volumeLiters = areaSqMeters * (oilThicknessMm / 1000.0) * 1000.0;
  const requiredMicrobialAgentKg = volumeLiters * 0.05; // 50g per liter of oil

  return Math.round(requiredMicrobialAgentKg * 10) / 10;
}
