/**
 * Thermal Power Plant Fly Ash Utilization & Environmental Compliance Service
 * Monitors 100% fly ash utilization mandates (CPCB / MoEFCC guidelines), evaluates ash pond dyke breach risks,
 * and models supply chain distribution to cement plants, NHAI road embankments, and brick manufacturers.
 */

export const FLY_ASH_GRADES = {
  CLASS_F: 'Class F Fly Ash (Silicic / Bituminous Coal)',
  CLASS_C: 'Class C Fly Ash (Calcareous / Lignite Coal)',
  BOTTOM_ASH: 'Bottom Ash / Boiler Slag',
  POND_ASH: 'Weathered Pond Ash',
};

export interface ThermalPowerPlantAshData {
  plantId: string;
  plantName: string;
  dailyAshGenerationTons: number;
  currentUtilizationPercent: number;
  ashPondCapacityTons: number;
  currentPondStorageTons: number;
  primaryAshGrade: string;
  distanceToCementPlantKm: number;
  reportedAt: string;
}

export interface FlyAshComplianceAssessment {
  complianceStatus: 'FULLY_COMPLIANT' | 'NEAR_COMPLIANT' | 'NON_COMPLIANT_DEFICIT' | 'CRITICAL_LEGAL_PENALTY';
  isFullyCompliant: boolean;
  mandateDeficitPercent: number;
  dailyDeficitTons: number;
  environmentalPenaltyPerDayINR: number;
}

export interface PondLeachateRiskAssessment {
  capacityUtilizationPercent: number;
  overflowRiskCategory: 'CRITICAL_BREACH_IMMINENT' | 'HIGH_OVERFLOW_RISK' | 'MODERATE_STORAGE' | 'SAFE_OPERATIONAL';
  groundwaterLeachateAlert: boolean;
  remainingPondLifeMonths: number;
}

export interface FlyAshDispatchPlan {
  plantId: string;
  plantName: string;
  dailyOffTakeTargetTons: number;
  cementIndustryOffTakeTons: number;
  brickManufacturingOffTakeTons: number;
  highwayEmbankmentOffTakeTons: number;
  pneumaticBulkTankersDispatched: number;
  recommendedActions: string[];
}

/**
 * Evaluates 100% Fly Ash utilization regulatory compliance against MoEFCC guidelines.
 */
export function evaluateFlyAshUtilizationCompliance(plant: ThermalPowerPlantAshData): FlyAshComplianceAssessment {
  const targetPercent = 100.0;
  const deficitPercent = Math.max(0, targetPercent - plant.currentUtilizationPercent);
  const dailyDeficitTons = Math.round(plant.dailyAshGenerationTons * (deficitPercent / 100.0));

  // Environmental compensation penalty calculated per ton deficit (INR 1500 / ton as per NGT guidelines)
  const penaltyPerDay = dailyDeficitTons * 1500;

  const isFullyCompliant = deficitPercent <= 0.0;
  let status: FlyAshComplianceAssessment['complianceStatus'] = 'FULLY_COMPLIANT';

  if (deficitPercent > 30.0) {
    status = 'CRITICAL_LEGAL_PENALTY';
  } else if (deficitPercent > 10.0) {
    status = 'NON_COMPLIANT_DEFICIT';
  } else if (deficitPercent > 0.0) {
    status = 'NEAR_COMPLIANT';
  }

  return {
    complianceStatus: status,
    isFullyCompliant,
    mandateDeficitPercent: Math.round(deficitPercent * 10) / 10,
    dailyDeficitTons,
    environmentalPenaltyPerDayINR: penaltyPerDay,
  };
}

/**
 * Evaluates ash pond storage utilization, dyke breach probability, and groundwater heavy metal leachate risk.
 */
export function calculatePondLeachateContaminationRisk(
  currentPondStorageTons: number,
  ashPondCapacityTons: number
): PondLeachateRiskAssessment {
  const utilPercent = ashPondCapacityTons > 0 ? (currentPondStorageTons / ashPondCapacityTons) * 100.0 : 0;
  const roundedUtil = Math.round(utilPercent * 10) / 10;

  let riskCategory: PondLeachateRiskAssessment['overflowRiskCategory'] = 'SAFE_OPERATIONAL';
  let leachateAlert = false;

  if (roundedUtil >= 90.0) {
    riskCategory = 'CRITICAL_BREACH_IMMINENT';
    leachateAlert = true;
  } else if (roundedUtil >= 75.0) {
    riskCategory = 'HIGH_OVERFLOW_RISK';
    leachateAlert = true;
  } else if (roundedUtil >= 50.0) {
    riskCategory = 'MODERATE_STORAGE';
  }

  // Estimated remaining lifespan assuming 1000 tons daily unutilized pond deposition
  const remainingCapacityTons = Math.max(0, ashPondCapacityTons - currentPondStorageTons);
  const remainingMonths = Math.round((remainingCapacityTons / 30000) * 10) / 10;

  return {
    capacityUtilizationPercent: roundedUtil,
    overflowRiskCategory: riskCategory,
    groundwaterLeachateAlert: leachateAlert,
    remainingPondLifeMonths: remainingMonths,
  };
}

/**
 * Generates automated fly ash dispatch and multi-sector off-take allocation plan.
 */
export function generateFlyAshDisposalDispatchPlan(plant: ThermalPowerPlantAshData): FlyAshDispatchPlan {
  const compliance = evaluateFlyAshUtilizationCompliance(plant);
  const totalGeneration = plant.dailyAshGenerationTons;

  // Recommended allocation matrix (50% Cement, 30% Highways, 20% Bricks)
  const cementTons = Math.round(totalGeneration * 0.50);
  const highwayTons = Math.round(totalGeneration * 0.30);
  const brickTons = Math.round(totalGeneration * 0.20);

  // Each pneumatic tanker carries ~30 tons of dry fly ash
  const tankersNeeded = Math.ceil(totalGeneration / 30.0);

  const actions: string[] = ['Maintain free dry fly ash loading silos for cement manufacturers.'];

  if (!compliance.isFullyCompliant) {
    actions.push(`Mandate free transportation of fly ash within 300 km radius for NHAI road projects.`);
    actions.push(`Issue notice to nearby red-clay brick kilns for 100% mandatory transition to fly-ash bricks.`);
    actions.push(`Increase pneumatic silo loading bays to eliminate unutilized wet pond dumping.`);
  } else {
    actions.push('Achieved 100% utilization target. Maintain steady supply contracts with local ready-mix concrete (RMC) plants.');
  }

  return {
    plantId: plant.plantId,
    plantName: plant.plantName,
    dailyOffTakeTargetTons: totalGeneration,
    cementIndustryOffTakeTons: cementTons,
    brickManufacturingOffTakeTons: brickTons,
    highwayEmbankmentOffTakeTons: highwayTons,
    pneumaticBulkTankersDispatched: tankersNeeded,
    recommendedActions: actions,
  };
}
