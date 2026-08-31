import { evaluateSpeciesIngestionRisk } from './marineSpeciesIngestionService';

describe('MarineSpeciesIngestionService', () => {
  it('evaluates high planktivore microplastic ingestion risk correctly', () => {
    const res = evaluateSpeciesIngestionRisk('Basking Shark', 'PLANKTIVORE', 800);

    expect(res.speciesName).toBe('Basking Shark');
    expect(res.particleIngestionRatePerDay).toBe(20000);
    expect(res.hazardTier).toBe('CRITICAL_SPECIES_THREAT');
    expect(res.chemicalLeachingRiskScore).toBeGreaterThanOrEqual(70);
  });
});
