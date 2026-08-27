/**
 * Additional Hazardous Chemical Spill Mitigation Data Models & Evacuation Radii Utilities
 */

/**
 * @typedef {Object} SpillMitigationStep
 * @property {number} stepNumber
 * @property {string} actionTitle
 * @property {string} description
 * @property {string} responsibleAgency
 * @property {number} estimatedTimeMinutes
 */

export const HAZARDOUS_CHEMICAL_CATALOG = [
  { name: 'Chlorine Gas', hazardClass: 'Toxic / Corrosive Gas (Class 2.3)', casNumber: '7782-50-5', baseEvacuationKm: 3.5 },
  { name: 'Ammonia (Anhydrous)', hazardClass: 'Toxic / Corrosive Gas (Class 2.3)', casNumber: '7664-41-7', baseEvacuationKm: 2.8 },
  { name: 'Sulfuric Acid (98%)', hazardClass: 'Corrosive Acid / Alkali (Class 8)', casNumber: '7664-93-9', baseEvacuationKm: 1.0 },
  { name: 'Benzene (Industrial Solvent)', hazardClass: 'Flammable Liquid (Class 3)', casNumber: '71-43-2', baseEvacuationKm: 1.5 },
  { name: 'Hydrogen Peroxide (70%)', hazardClass: 'Organic Peroxide / Oxidizer (Class 5.2)', casNumber: '7722-84-1', baseEvacuationKm: 2.0 },
];

/**
 * Calculates chemical spill dispersion cloud area (sq km).
 *
 * @param {number} radiusKm
 * @returns {number}
 */
export function calculateDispersionCloudAreaSqKm(radiusKm) {
  return Math.round(Math.PI * Math.pow(radiusKm, 2) * 100) / 100;
}

/**
 * Generates detailed multi-step containment procedures.
 *
 * The hazard class is accepted but not yet branched on -- the four steps below
 * are the common HazMat sequence and apply to every class in
 * `HAZARDOUS_CHEMICAL_CATALOG`. Kept in the signature because callers already
 * pass it and class-specific procedures are the obvious next step; underscored
 * so the unused-argument rule records that as deliberate rather than a slip.
 *
 * @param {string} _hazardClass
 * @returns {SpillMitigationStep[]}
 */
export function generateMitigationProcedures(_hazardClass) {
  return [
    {
      stepNumber: 1,
      actionTitle: 'Initial Perimeter Exclusion Zone',
      description: 'Establish hot, warm, and cold safety zones around spill epicenter.',
      responsibleAgency: 'Local Police & HazMat Security',
      estimatedTimeMinutes: 15,
    },
    {
      stepNumber: 2,
      actionTitle: 'Vapor Cloud Suppression / Neutralization',
      description: 'Deploy water fog curtains or alkaline neutralizing solution.',
      responsibleAgency: 'HazMat Response Fire Division',
      estimatedTimeMinutes: 30,
    },
    {
      stepNumber: 3,
      actionTitle: 'Secondary Spill Retention Diking',
      description: 'Construct sandbag barriers to block storm drains and surface water run-off.',
      responsibleAgency: 'Municipal Disaster Control Team',
      estimatedTimeMinutes: 45,
    },
    {
      stepNumber: 4,
      actionTitle: 'Air & Soil Quality Telemetry Sampling',
      description: 'Conduct continuous ambient monitoring using PID meters and portable gas detectors.',
      responsibleAgency: 'State Pollution Control Board (SPCB)',
      estimatedTimeMinutes: 60,
    },
  ];
}
