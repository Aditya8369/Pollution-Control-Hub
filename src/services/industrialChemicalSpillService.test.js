/**
 * Industrial Chemical Spill Emergency Response Service Test Suite
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateSpillSeverity,
  calculateEvacuationRadiusKm,
  generateEmergencyDispatchPlan,
  SPILL_HAZARD_CLASSES,
} from './industrialChemicalSpillService';

describe('IndustrialChemicalSpillEmergencyResponseService', () => {
  const sampleIncident = {
    incidentId: 'SPILL-2026-901',
    facilityName: 'Gujarat Petrochemical Complex',
    chemicalName: 'Chlorine Gas',
    hazardClass: SPILL_HAZARD_CLASSES.TOXIC_GAS,
    quantityGallons: 2500,
    windSpeedKph: 18.5,
    airTemperatureC: 32.0,
    proximityToWaterBodyKm: 0.8,
    reportedAt: '2026-08-25T14:00:00Z',
  };

  it('should evaluate chemical spill severity correctly', () => {
    const severity = evaluateSpillSeverity(sampleIncident);
    expect(severity).toBeDefined();
    expect(severity.level).toBe('CRITICAL_EMERGENCY');
    expect(severity.severityScore).toBeGreaterThan(75);
    expect(severity.requiresImmediateEvacuation).toBe(true);
  });

  it('should calculate plume evacuation radius based on hazard class and wind speed', () => {
    const radiusKm = calculateEvacuationRadiusKm(
      SPILL_HAZARD_CLASSES.TOXIC_GAS,
      2500,
      18.5
    );
    expect(radiusKm).toBeGreaterThan(2.0);
    expect(radiusKm).toBeLessThan(25.0);
  });

  it('should generate emergency dispatch plan with multi-agency protocol', () => {
    const plan = generateEmergencyDispatchPlan(sampleIncident);

    expect(plan).toBeDefined();
    expect(plan.incidentId).toBe('SPILL-2026-901');
    expect(plan.dispatchUnits).toContain('HazMat Emergency Response Team Alpha');
    expect(plan.evacuationRadiusKm).toBeGreaterThan(2.0);
    expect(plan.containmentSteps.length).toBeGreaterThanOrEqual(3);
    expect(plan.protectiveEquipmentRequired).toContain('Level A Vapor-Protective Suit & SCBA');
  });
});
