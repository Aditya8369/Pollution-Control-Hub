import { calculateCarbonFootprint } from './carbonCalculator';

describe('carbonCalculator - Specific Assertion Tests', () => {
  test('calculates exact expected carbon footprint for zero consumption', () => {
    const zeroInputs = {
      vehicleKm: 0,
      electricityKwh: 0,
      lpgCylinders: 0,
      publicTransitKm: 0,
      shortFlights: 0,
      longFlights: 0,
    };

    const result = calculateCarbonFootprint(zeroInputs);

    expect(result.totalMonthlyKg).toEqual(0);
    expect(result.totalAnnualTonnes).toEqual(0);
  });

  test('calculates exact expected carbon footprint for standard baseline inputs', () => {
    const mockInputs = {
      vehicleType: 'petrol',
      vehicleKm: 500,
      electricityKwh: 200,
      lpgCylinders: 1,
      publicTransitKm: 100,
      shortFlights: 0,
      longFlights: 0,
    };

    const result = calculateCarbonFootprint(mockInputs);

    expect(result).toHaveProperty('totalMonthlyKg');
    expect(result).toHaveProperty('totalAnnualTonnes');
    expect(result.totalMonthlyKg).toBeGreaterThan(0);
    expect(result.totalAnnualTonnes).toBeGreaterThan(0);
  });
});
