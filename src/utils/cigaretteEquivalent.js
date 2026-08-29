import { aqiToPm25 } from "./exposureModel";

/**
 * Berkeley Earth rule of thumb: breathing ~22 µg/m³ of PM2.5 for a day is
 * roughly equivalent, in particulate intake, to smoking one cigarette.
 */
export const PM25_PER_CIGARETTE = 22;

/**
 * Convert a PM2.5 concentration to an equivalent number of cigarettes per day.
 *
 * @param {number} pm25 - PM2.5 concentration in µg/m³.
 * @returns {number} Equivalent cigarettes/day, rounded to 1 decimal. Non-finite
 * or non-positive input returns 0.
 * @example
 * pm25ToCigarettes(22);  // 1
 * pm25ToCigarettes(220); // 10
 */
export function pm25ToCigarettes(pm25) {
  if (typeof pm25 !== "number" || !Number.isFinite(pm25) || pm25 <= 0) return 0;
  return Math.round((pm25 / PM25_PER_CIGARETTE) * 10) / 10;
}

/**
 * Convert a US AQI value to an equivalent number of cigarettes per day, by first
 * mapping AQI back to a PM2.5 concentration.
 *
 * @param {number} aqi - US AQI value.
 * @returns {number} Equivalent cigarettes/day, rounded to 1 decimal.
 * @example
 * aqiToCigarettes(50);  // 0.5  (12 µg/m³)
 * aqiToCigarettes(100); // 1.6  (35.4 µg/m³)
 */
export function aqiToCigarettes(aqi) {
  return pm25ToCigarettes(aqiToPm25(aqi));
}
