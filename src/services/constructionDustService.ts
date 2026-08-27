/**
 * Urban Construction Dust Suppression & CAAQMS Telemetry Service
 * Monitors real-time PM2.5 / PM10 emissions at urban construction and demolition (C&D) sites,
 * models anti-smog gun mist atomization efficiency, and enforces mandatory CPCB dust mitigation rules.
 */

export const CONSTRUCTION_SITE_TYPES = {
  COMMERCIAL_HIGHRISE: 'High-Rise Commercial Building Construction',
  METRO_INFRASTRUCTURE: 'Metro Rail & Underground Tunnel Corridor',
  HIGHWAY_FLYOVER: 'Urban Highway & Flyover Expansion',
  DEMOLITION_ZONE: 'Demolition & Debris Processing Zone',
  RESIDENTIAL_COLONY: 'Residential Housing Township',
};

/**
 * @typedef {Object} ConstructionSiteDustData
 * @property {string} siteId
 * @property {string} siteName
 * @property {string} siteType
 * @property {number} plotAreaSqMeters
 * @property {number} pm25ConcentrationUgM3
 * @property {number} pm10ConcentrationUgM3
 * @property {number} activeAntiSmogGuns
 * @property {number} windSpeedKph
 * @property {string} reportedAt
 */

/**
 * @typedef {Object} DustComplianceAssessment
 * @property {'FULL_COMPLIANCE' | 'MODERATE_EXCEEDANCE' | 'HIGH_POLLUTION_ALERT' | 'CRITICAL_VIOLATION_STOP_WORK'} status
 * @property {boolean} isCompliant
 * @property {number} pm10ExceedanceRatio
 * @property {boolean} stopWorkNoticeIssued
 * @property {number} dailyPenaltyINR
 */

/**
 * @typedef {Object} AntiSmogGunEfficiency
 * @property {number} requiredAntiSmogGunsCount
 * @property {number} suppressionEfficiencyPercent
 * @property {number} waterConsumptionLitersPerHour
 * @property {number} dropletMicronSize
 */

/**
 * @typedef {Object} ConstructionDustDispatchPlan
 * @property {string} siteId
 * @property {string} siteName
 * @property {number} additionalAntiSmogGunsRequired
 * @property {number} greenNettingRequiredSqMeters
 * @property {number} waterSprinklingTankersDispatched
 * @property {string[]} mitigationDirectives
 */

/**
 * Evaluates construction site PM2.5 / PM10 dust emissions against CPCB / CAAQMS 24-hour ambient air quality standards.
 *
 * @param {ConstructionSiteDustData} site
 * @returns {DustComplianceAssessment}
 */
export function evaluateConstructionSiteDustCompliance(site) {
  const pm10Limit = 100.0; // 100 ug/m3 24h limit
  const pm25Limit = 60.0;  // 60 ug/m3 24h limit

  const pm10Ratio = site.pm10ConcentrationUgM3 / pm10Limit;
  const isCompliant = site.pm10ConcentrationUgM3 <= pm10Limit && site.pm25ConcentrationUgM3 <= pm25Limit;

  /** @type {DustComplianceAssessment['status']} */
  let status = 'FULL_COMPLIANCE';
  let stopWork = false;
  let penalty = 0;

  if (pm10Ratio >= 3.0 || site.pm25ConcentrationUgM3 > 250.0) {
    status = 'CRITICAL_VIOLATION_STOP_WORK';
    stopWork = true;
    penalty = 500000; // INR 5 Lakh per day stop-work penalty under NGT rules
  } else if (pm10Ratio >= 2.0) {
    status = 'HIGH_POLLUTION_ALERT';
    penalty = 200000;
  } else if (pm10Ratio > 1.0) {
    status = 'MODERATE_EXCEEDANCE';
    penalty = 50000;
  }

  return {
    status,
    isCompliant,
    pm10ExceedanceRatio: Math.round(pm10Ratio * 10) / 10,
    stopWorkNoticeIssued: stopWork,
    dailyPenaltyINR: penalty,
  };
}

/**
 * Calculates anti-smog gun mist atomization efficiency and water consumption.
 *
 * @param {number} activeGuns
 * @param {number} plotAreaSqMeters
 * @param {number} windSpeedKph
 * @returns {AntiSmogGunEfficiency}
 */
export function calculateAntiSmogGunEfficiency(activeGuns, plotAreaSqMeters, windSpeedKph) {
  // CPCB mandate: 1 anti-smog gun per 5,000 sq meters of active construction area
  const requiredGuns = Math.max(1, Math.ceil(plotAreaSqMeters / 5000.0));
  const gunDeficitRatio = Math.min(1.0, activeGuns / requiredGuns);

  // High wind speeds reduce atomized mist stay-time
  const windFactor = Math.max(0.4, 1.0 - windSpeedKph / 40.0);
  const baseEfficiency = gunDeficitRatio * 65.0 * windFactor;

  const waterPerHour = activeGuns * 2500; // 2,500 liters/hr per anti-smog cannon

  return {
    requiredAntiSmogGunsCount: requiredGuns,
    suppressionEfficiencyPercent: Math.round(baseEfficiency * 10) / 10,
    waterConsumptionLitersPerHour: waterPerHour,
    dropletMicronSize: 50.0, // 50 micron micro-droplet atomization
  };
}

/**
 * Generates automated construction dust suppression and anti-smog gun dispatch plan.
 *
 * @param {ConstructionSiteDustData} site
 * @returns {ConstructionDustDispatchPlan}
 */
export function generateConstructionDustDispatchPlan(site) {
  const compliance = evaluateConstructionSiteDustCompliance(site);
  const gunMetrics = calculateAntiSmogGunEfficiency(site.activeAntiSmogGuns, site.plotAreaSqMeters, site.windSpeedKph);

  const additionalGunsNeeded = Math.max(0, gunMetrics.requiredAntiSmogGunsCount - site.activeAntiSmogGuns);
  const greenNettingSqM = Math.round(site.plotAreaSqMeters * 0.4);
  const tankersCount = Math.max(1, Math.ceil(site.plotAreaSqMeters / 10000.0));

  /** @type {string[]} */
  const directives = [
    'Enforce 100% green agro-mesh scaffolding enclosure around building perimeter.',
    'Deploy automated tire-washing bays at all site entry and exit gates.',
    'Conduct wet-suppression mist spraying over unpaved haul roads twice daily.',
  ];

  if (compliance.stopWorkNoticeIssued) {
    directives.push('🚨 STOP-WORK ORDER ISSUED: Halt all excavation, C&D crushing, and uncontained dumping immediately.');
    directives.push(`Deploy ${additionalGunsNeeded} additional long-throw anti-smog cannons within 24 hours.`);
  } else if (!compliance.isCompliant) {
    directives.push('Increase water misting frequency during peak dry afternoon hours (12:00 - 16:00).');
  }

  return {
    siteId: site.siteId,
    siteName: site.siteName,
    additionalAntiSmogGunsRequired: additionalGunsNeeded,
    greenNettingRequiredSqMeters: greenNettingSqM,
    waterSprinklingTankersDispatched: tankersCount,
    mitigationDirectives: directives,
  };
}
