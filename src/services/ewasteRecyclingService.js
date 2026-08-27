/**
 * Electronic Waste (E-Waste) Circular Recycling & Extended Producer Responsibility (EPR) Service
 * Tracks EPR targets, models urban mining recovery yields of Gold, Silver, Copper, and Lithium from PCBs/batteries,
 * and manages authorized e-waste refurbisher/dismantler supply chains.
 */

export const EWASTE_CATEGORIES = {
  SMARTPHONES_TABLETS: 'ITEE1 - Mobiles & Small Electronics',
  LAPTOPS_DESKTOPS: 'ITEE2 - Laptops, Servers & Personal Computers',
  CONSUMER_APPLIANCES: 'CEEW1 - Refrigerators, ACs & Washing Machines',
  LITHIUM_BATTERIES: 'BATT1 - EV & Portable Lithium-Ion Batteries',
  SOLAR_PV_PANELS: 'SOLAR1 - End-of-Life Photovoltaic Panels',
};

/**
 * @typedef {Object} EwasteProducerData
 * @property {string} producerId
 * @property {string} companyName
 * @property {number} annualSalesVolumeUnits
 * @property {string} category
 * @property {number} collectedEwasteTons
 * @property {number} recycledEwasteTons
 * @property {number} targetEprRecyclingRatePercent
 * @property {string} reportedAt
 */

/**
 * @typedef {Object} EprComplianceAssessment
 * @property {number} achievedRecyclingRatePercent
 * @property {'EPR_TARGET_ACHIEVED' | 'MODERATE_PROGRESS' | 'CRITICAL_EPR_DEFICIT'} eprStatus
 * @property {boolean} isCompliant
 * @property {number} recyclingTargetDeficitTons
 * @property {number} eprPenaltyINR
 */

/**
 * @typedef {Object} PreciousMetalYield
 * @property {number} goldRecoveryGrams
 * @property {number} silverRecoveryGrams
 * @property {number} copperRecoveryKg
 * @property {number} lithiumRecoveryKg
 * @property {number} estimatedMetalValueINR
 */

/**
 * @typedef {Object} EwasteDispatchPlan
 * @property {string} producerId
 * @property {string} companyName
 * @property {number} logisticsVehiclesDispatched
 * @property {string[]} authorizedRecyclers
 * @property {string[]} safeDismantlingDirectives
 */

/**
 * Evaluates Extended Producer Responsibility (EPR) recycling compliance under CPCB E-Waste Rules.
 *
 * @param {EwasteProducerData} producer
 * @returns {EprComplianceAssessment}
 */
export function evaluateEprRecyclingCompliance(producer) {
  const totalEwasteGeneratedEstimateTons = Math.max(1.0, (producer.annualSalesVolumeUnits * 1.5) / 1000.0);
  const targetTons = totalEwasteGeneratedEstimateTons * (producer.targetEprRecyclingRatePercent / 100.0);
  const achievedRate = (producer.recycledEwasteTons / totalEwasteGeneratedEstimateTons) * 100.0;

  const deficitTons = Math.max(0, targetTons - producer.recycledEwasteTons);
  const eprPenalty = Math.round(deficitTons * 25000); // INR 25,000 / ton penalty under EPR non-compliance

  const isCompliant = deficitTons <= 0;
  /** @type {EprComplianceAssessment['eprStatus']} */
  let status = 'CRITICAL_EPR_DEFICIT';

  if (achievedRate >= producer.targetEprRecyclingRatePercent) {
    status = 'EPR_TARGET_ACHIEVED';
  } else if (achievedRate >= producer.targetEprRecyclingRatePercent * 0.7) {
    status = 'MODERATE_PROGRESS';
  }

  return {
    achievedRecyclingRatePercent: Math.round(achievedRate * 10) / 10,
    eprStatus: status,
    isCompliant,
    recyclingTargetDeficitTons: Math.round(deficitTons * 10) / 10,
    eprPenaltyINR: eprPenalty,
  };
}

/**
 * Calculates urban mining precious metal recovery yield (Gold, Silver, Copper, Lithium) from recycled e-waste.
 *
 * @param {string} category
 * @param {number} recycledTons
 * @returns {PreciousMetalYield}
 */
export function calculatePreciousMetalRecoveryYieldGram(category, recycledTons) {
  let goldPerTon = 15.0; // 15g gold per ton of e-waste PCB
  let silverPerTon = 80.0; // 80g silver per ton
  let copperPerTon = 120.0; // 120kg copper per ton
  let lithiumPerTon = 10.0; // 10kg lithium per ton

  if (category === EWASTE_CATEGORIES.SMARTPHONES_TABLETS) {
    goldPerTon = 35.0;
    silverPerTon = 150.0;
    copperPerTon = 140.0;
    lithiumPerTon = 25.0;
  } else if (category === EWASTE_CATEGORIES.LITHIUM_BATTERIES) {
    goldPerTon = 2.0;
    silverPerTon = 10.0;
    copperPerTon = 180.0;
    lithiumPerTon = 85.0;
  }

  const goldGrams = Math.round(recycledTons * goldPerTon * 10) / 10;
  const silverGrams = Math.round(recycledTons * silverPerTon * 10) / 10;
  const copperKg = Math.round(recycledTons * copperPerTon * 10) / 10;
  const lithiumKg = Math.round(recycledTons * lithiumPerTon * 10) / 10;

  // Approximate metal market valuation (Gold INR 6500/g, Silver INR 80/g, Copper INR 750/kg, Lithium INR 2200/kg)
  const totalValue = (
    goldGrams * 6500 +
    silverGrams * 80 +
    copperKg * 750 +
    lithiumKg * 2200
  );

  return {
    goldRecoveryGrams: goldGrams,
    silverRecoveryGrams: silverGrams,
    copperRecoveryKg: copperKg,
    lithiumRecoveryKg: lithiumKg,
    estimatedMetalValueINR: Math.round(totalValue),
  };
}

/**
 * Generates automated e-waste collection center dispatch and dismantler logistics plan.
 *
 * @param {EwasteProducerData} producer
 * @returns {EwasteDispatchPlan}
 */
export function generateEwasteCollectionDispatchPlan(producer) {
  const compliance = evaluateEprRecyclingCompliance(producer);
  const vehiclesNeeded = Math.max(1, Math.ceil(producer.recycledEwasteTons / 5.0));

  const recyclers = [
    'Attero Recycling Hub (CPCB Authorized)',
    'E-Waste Recyclers India (Hydrometallurgical Facility)',
  ];

  const directives = [
    'Enforce zero-informal acid-leaching or open cable burning protocol.',
    'Automate PCB shredding and air-gravity separation for copper/precious metal recovery.',
    'Issue digital EPR Certificate of Recycling via CPCB portal upon weighing.',
  ];

  if (!compliance.isCompliant) {
    directives.push(`Establish ${Math.ceil(compliance.recyclingTargetDeficitTons / 10.0)} additional buy-back collection kiosks in Metro hubs.`);
  }

  return {
    producerId: producer.producerId,
    companyName: producer.companyName,
    logisticsVehiclesDispatched: vehiclesNeeded,
    authorizedRecyclers: recyclers,
    safeDismantlingDirectives: directives,
  };
}
