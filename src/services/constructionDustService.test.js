/**
 * Urban Construction Dust Suppression & CAAQMS Telemetry Service Unit Test Suite
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateConstructionSiteDustCompliance,
  calculateAntiSmogGunEfficiency,
  generateConstructionDustDispatchPlan,
  CONSTRUCTION_SITE_TYPES,
} from './constructionDustService';

describe('ConstructionDustService', () => {
  const sampleSite = {
    siteId: 'SITE-2026-301',
    siteName: 'Central Metro Corridor Line 4',
    siteType: CONSTRUCTION_SITE_TYPES.METRO_INFRASTRUCTURE,
    plotAreaSqMeters: 45000,
    pm25ConcentrationUgM3: 165.0,
    pm10ConcentrationUgM3: 380.0,
    activeAntiSmogGuns: 2,
    windSpeedKph: 16.0,
    reportedAt: '2026-08-25T14:00:00Z',
  };

  it('should evaluate construction site dust compliance against CPCB / CAAQMS norms', () => {
    const compliance = evaluateConstructionSiteDustCompliance(sampleSite);
    expect(compliance).toBeDefined();
    expect(compliance.isCompliant).toBe(false); // PM10 = 380 ug/m3 exceeds 100 ug/m3 norm
    expect(compliance.pm10ExceedanceRatio).toBeCloseTo(3.8, 1);
    expect(compliance.status).toBe('CRITICAL_VIOLATION_STOP_WORK');
    expect(compliance.stopWorkNoticeIssued).toBe(true);
  });

  it('should calculate anti-smog gun atomized mist suppression efficiency', () => {
    const efficiency = calculateAntiSmogGunEfficiency(
      sampleSite.activeAntiSmogGuns,
      sampleSite.plotAreaSqMeters,
      sampleSite.windSpeedKph
    );

    expect(efficiency).toBeDefined();
    // 45,000 sq m at the CPCB ratio of one gun per 5,000 needs 9; the site has 2.
    expect(efficiency.requiredAntiSmogGunsCount).toBe(9);
    // (2/9) * 65 * (1 - 16/40) = 8.7. A site running at 22% of its mandated gun
    // count suppressing over 30% would contradict the model, not confirm it.
    expect(efficiency.suppressionEfficiencyPercent).toBeCloseTo(8.7, 1);
    expect(efficiency.waterConsumptionLitersPerHour).toBeGreaterThan(1000);
  });

  it('should generate automated dust mitigation & anti-smog gun dispatch plan', () => {
    const plan = generateConstructionDustDispatchPlan(sampleSite);

    expect(plan).toBeDefined();
    expect(plan.siteId).toBe('SITE-2026-301');
    expect(plan.additionalAntiSmogGunsRequired).toBeGreaterThan(0);
    expect(plan.greenNettingRequiredSqMeters).toBeGreaterThan(10000);
    expect(plan.mitigationDirectives.length).toBeGreaterThanOrEqual(4);
  });
});
