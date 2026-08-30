/**
 * Industrial Facility Hazmat Compliance Audit & Regulatory Reporting Engine
 * Evaluates facility chemical inventory thresholds against OSHA Process Safety Management (PSM)
 * and EPA Risk Management Plan (RMP) regulatory guidelines.
 */

export interface FacilityChemicalInventory {
  facilityId: string;
  chemicalName: string;
  casNumber: string;
  storageQuantityKg: number;
  thresholdPlanningQuantityKg: number;
  storageTemperatureCelsius: number;
  storagePressureBar: number;
}

export interface RegulatoryComplianceResult {
  facilityId: string;
  chemicalName: string;
  isPsmRegulated: boolean;
  isRmpRegulated: boolean;
  complianceTier: 'COMPLIANT_WITHIN_LIMITS' | 'PSM_RMP_THRESHOLD_EXCEEDED' | 'NON_COMPLIANT_HIGH_RISK';
  regulatoryActionRequired: string[];
}

/**
 * Evaluates facility hazardous chemical storage against OSHA PSM and EPA RMP thresholds.
 */
export function auditFacilityRegulatoryCompliance(inventory: FacilityChemicalInventory): RegulatoryComplianceResult {
  const isExceeded = inventory.storageQuantityKg >= inventory.thresholdPlanningQuantityKg;

  const actions: string[] = [];
  if (isExceeded) {
    actions.push(`Submit EPA RMP Offsite Consequence Analysis (OCA) report for ${inventory.chemicalName}.`);
    actions.push('Establish OSHA Process Hazard Analysis (PHA) audit team.');
  } else {
    actions.push('Maintain quarterly inventory logs and pressure vessel maintenance records.');
  }

  let status: RegulatoryComplianceResult['complianceTier'] = 'COMPLIANT_WITHIN_LIMITS';
  if (isExceeded && inventory.storageQuantityKg > inventory.thresholdPlanningQuantityKg * 2) {
    status = 'NON_COMPLIANT_HIGH_RISK';
  } else if (isExceeded) {
    status = 'PSM_RMP_THRESHOLD_EXCEEDED';
  }

  return {
    facilityId: inventory.facilityId,
    chemicalName: inventory.chemicalName,
    isPsmRegulated: isExceeded,
    isRmpRegulated: isExceeded,
    complianceTier: status,
    regulatoryActionRequired: actions,
  };
}
