/**
 * Maritime Oil Spill & Coastal Vulnerability Service Unit Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  assessCoastalVulnerabilityIndex,
  calculateOilSlickDriftTrajectory,
  generateMaritimeResponsePlan,
  OIL_SPILL_TYPES,
} from './maritimeOilSpillService';

describe('MaritimeOilSpillService', () => {
  const sampleSpill = {
    spillId: 'OIL-2026-009',
    vesselName: 'MT Arabian Horizon',
    oilType: OIL_SPILL_TYPES.HEAVY_CRUDE,
    volumeBarrels: 15000,
    currentSpeedKnots: 2.5,
    windSpeedKnots: 18.0,
    windDirectionDegrees: 240,
    distanceToShoreKm: 12.0,
    coastalEcosystemType: 'Mangrove Reserve & Coral Reef',
  };

  it('should assess coastal vulnerability index correctly', () => {
    const vulnerability = assessCoastalVulnerabilityIndex(sampleSpill);
    expect(vulnerability).toBeDefined();
    expect(vulnerability.cviScore).toBeGreaterThan(70);
    expect(vulnerability.riskCategory).toBe('HIGH_COASTAL_RISK');
    expect(vulnerability.ecologicalImpactRating).toBe('EXTREME');
  });

  it('should calculate oil slick drift trajectory over 24 hours', () => {
    const trajectory = calculateOilSlickDriftTrajectory(
      sampleSpill.currentSpeedKnots,
      sampleSpill.windSpeedKnots,
      sampleSpill.windDirectionDegrees,
      24
    );

    expect(trajectory).toBeDefined();
    expect(trajectory.distanceTraveledNauticalMiles).toBeGreaterThan(10);
    expect(trajectory.estimatedLandfallHours).toBeLessThan(24);
  });

  it('should generate maritime response containment plan', () => {
    const plan = generateMaritimeResponsePlan(sampleSpill);

    expect(plan).toBeDefined();
    expect(plan.spillId).toBe('OIL-2026-009');
    expect(plan.containmentBoomsRequiredMeters).toBeGreaterThan(1000);
    expect(plan.skimmerVesselsDispatched).toBeGreaterThanOrEqual(2);
    expect(plan.dispersantVolumeLiters).toBeGreaterThan(0);
  });
});
