/**
 * CPCB Construction Dust Audit Checklist & CAAQMS Telemetry Calibration Catalog
 */

export const CPCB_DUST_AUDIT_CHECKLIST = [
  { itemNumber: 1, requirement: '100% Wind-breaking tin sheets (min 10ft height) around boundary', isMandatory: true },
  { itemNumber: 2, requirement: 'Anti-smog guns deployed (1 gun per 5000 sq m)', isMandatory: true },
  { itemNumber: 3, requirement: 'Continuous Ambient Air Quality Monitoring System (CAAQMS) PM2.5/PM10 sensor active', isMandatory: true },
  { itemNumber: 4, requirement: 'Automated vehicle wheel washing bay with water recycling at exit', isMandatory: true },
  { itemNumber: 5, requirement: 'Covered tarpaulin transport for all loose C&D sand and gravel', isMandatory: true },
];

/**
 * Calculates site audit score.
 *
 * @param {boolean[]} checklistResponses
 * @returns {number}
 */
export function calculateSiteAuditScore(checklistResponses) {
  const passed = checklistResponses.filter(Boolean).length;
  return Math.round((passed / checklistResponses.length) * 100.0);
}
