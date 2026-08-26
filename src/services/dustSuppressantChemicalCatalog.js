/**
 * Construction Dust Suppression Chemical Suppressant Specifications Catalog
 */

export const DUST_SUPPRESSANT_CHEMICAL_CATALOG = [
  {
    chemicalName: 'Calcium Chloride (CaCl2) Brine Solution',
    suppressionType: 'Hygroscopic Moisture Retention',
    efficiencyPercent: 85.0,
    reapplicationFrequencyDays: 14,
  },
  {
    chemicalName: 'Lignosulfonate Organic Polymer Binder',
    suppressionType: 'Soil Crust Binding',
    efficiencyPercent: 90.0,
    reapplicationFrequencyDays: 30,
  },
  {
    chemicalName: 'Synthetic Polyacrylamide (PAM) Emulsion',
    suppressionType: 'Fugitive Particulate Agglomeration',
    efficiencyPercent: 94.0,
    reapplicationFrequencyDays: 45,
  },
];

/**
 * Calculates chemical dust suppressant quantity required for site area (liters).
 */
export function calculateChemicalSuppressantQuantityLiters(siteAreaSqMeters: number): number {
  return Math.round(siteAreaSqMeters * 0.5); // 0.5 Liters per sq meter
}
