import { describe, it, expect } from 'vitest';
import { calculateCarbonFootprint, getReductionTips } from './carbonCalculator';

describe('carbonCalculator utility', () => {
  it('calculates carbon footprint correctly for vehicle, energy, and flights', () => {
    const result = calculateCarbonFootprint({
      vehicleType: 'petrol',
      vehicleKm: 100,
      electricityKwh: 200,
      lpgCylinders: 1,
      shortFlights: 2
    });

    expect(result.totalMonthlyKg).toBeGreaterThan(0);
    expect(result.totalAnnualTonnes).toBeGreaterThan(0);
    expect(result.impactLevel.level).toBe('Moderate');
    expect(result.breakdown).toHaveLength(5);
  });

  it('determines High impact level for large emissions', () => {
    const result = calculateCarbonFootprint({ vehicleType: 'petrol', vehicleKm: 1500, electricityKwh: 400 });
    expect(result.impactLevel.level).toBe('High');
  });

  it('handles empty or invalid inputs gracefully', () => {
    const result = calculateCarbonFootprint({ vehicleKm: -50, electricityKwh: 'invalid' });
    expect(result.totalMonthlyKg).toBe(0);
  });

  it('generates reduction tips based on breakdown', () => {
    const tips = getReductionTips([{ key: 'vehicle', monthlyKg: 150 }]);
    expect(tips).toHaveLength(1);
    expect(tips[0].id).toBe('tip-vehicle');
  });
});
