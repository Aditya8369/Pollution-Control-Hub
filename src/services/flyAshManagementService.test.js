/**
 * Thermal Power Plant Fly Ash Utilization & Environmental Compliance Service Unit Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateFlyAshUtilizationCompliance,
  calculatePondLeachateContaminationRisk,
  generateFlyAshDisposalDispatchPlan,
  FLY_ASH_GRADES,
} from './flyAshManagementService';

describe('FlyAshManagementService', () => {
  const samplePlant = {
    plantId: 'TPP-2026-104',
    plantName: 'Vindhyachal Super Thermal Power Station',
    dailyAshGenerationTons: 4500,
    currentUtilizationPercent: 68.5,
    ashPondCapacityTons: 500000,
    currentPondStorageTons: 420000,
    primaryAshGrade: FLY_ASH_GRADES.CLASS_F,
    distanceToCementPlantKm: 28.0,
    reportedAt: '2026-08-25T14:00:00Z',
  };

  it('should evaluate 100% Fly Ash utilization regulatory compliance', () => {
    const compliance = evaluateFlyAshUtilizationCompliance(samplePlant);
    expect(compliance).toBeDefined();
    expect(compliance.isFullyCompliant).toBe(false); // 68.5% is below 100% CPCB mandate
    expect(compliance.mandateDeficitPercent).toBeCloseTo(31.5, 1);
    expect(compliance.complianceStatus).toBe('NON_COMPLIANT_DEFICIT');
  });

  it('should calculate fly ash dyke overflow & groundwater leachate risk', () => {
    const risk = calculatePondLeachateContaminationRisk(
      samplePlant.currentPondStorageTons,
      samplePlant.ashPondCapacityTons
    );

    expect(risk).toBeDefined();
    expect(risk.capacityUtilizationPercent).toBe(84.0);
    expect(risk.overflowRiskCategory).toBe('HIGH_OVERFLOW_RISK');
    expect(risk.groundwaterLeachateAlert).toBe(true);
  });

  it('should generate fly ash off-take dispatch plan for cement & brick manufacturers', () => {
    const plan = generateFlyAshDisposalDispatchPlan(samplePlant);

    expect(plan).toBeDefined();
    expect(plan.plantId).toBe('TPP-2026-104');
    expect(plan.dailyOffTakeTargetTons).toBeGreaterThan(3000);
    expect(plan.cementIndustryOffTakeTons).toBeGreaterThan(0);
    expect(plan.brickManufacturingOffTakeTons).toBeGreaterThan(0);
    expect(plan.pneumaticBulkTankersDispatched).toBeGreaterThan(0);
  });
});
