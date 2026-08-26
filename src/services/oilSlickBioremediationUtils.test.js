/**
 * Unit Tests for Oil Slick Bioremediation Utilities
 */

import { describe, it, expect } from 'vitest';
import { calculateOilWeatheringRate, calculateBioremediationDosingKg } from '../utils/oilSlickBioremediationUtils';

describe('OilSlickBioremediationUtils', () => {
  it('should calculate weathering rate for light vs heavy crude', () => {
    const light = calculateOilWeatheringRate('Light Crude Oil', 28.0);
    const heavy = calculateOilWeatheringRate('Heavy Crude Oil', 28.0);

    expect(light.evaporationPercent24h).toBeGreaterThan(heavy.evaporationPercent24h);
    expect(heavy.naturalEmulsificationPercent).toBeGreaterThan(light.naturalEmulsificationPercent);
  });

  it('should calculate bioremediation dosing for beach cleanup', () => {
    const kg = calculateBioremediationDosingKg(500, 2.0); // 500m length, 2mm thickness
    expect(kg).toBeGreaterThan(10.0);
  });
});
