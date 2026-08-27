/**
 * E-Waste Hazardous Component Toxicity Assessment & PCB Characterization
 */

/**
 * @typedef {Object} ComponentToxicityReport
 * @property {number} leadContentGramsPerUnit
 * @property {number} cadmiumContentGramsPerUnit
 * @property {number} flameRetardantPbdePpm
 * @property {boolean} requiresHazardousWasteManifest
 */

/**
 * Calculates hazardous toxic substance content per electronic unit.
 *
 * @param {string} category
 * @returns {ComponentToxicityReport}
 */
export function assessEwasteComponentToxicity(category) {
  let leadGrams = 1.5;
  let cadmiumGrams = 0.2;
  let pbdePpm = 850.0;

  if (category.includes('Laptops') || category.includes('Desktops')) {
    leadGrams = 8.5;
    cadmiumGrams = 1.2;
    pbdePpm = 1200.0;
  } else if (category.includes('Refrigerators') || category.includes('ACs')) {
    leadGrams = 15.0;
    cadmiumGrams = 3.5;
    pbdePpm = 2500.0;
  }

  const manifestRequired = leadGrams > 5.0 || pbdePpm > 1000.0;

  return {
    leadContentGramsPerUnit: leadGrams,
    cadmiumContentGramsPerUnit: cadmiumGrams,
    flameRetardantPbdePpm: pbdePpm,
    requiresHazardousWasteManifest: manifestRequired,
  };
}
