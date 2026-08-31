import { evaluateAquaticEcotoxicology } from './aquaticEcotoxicologyService';

describe('AquaticEcotoxicologyService', () => {
  it('evaluates high mercury bioaccumulation ecotoxicity correctly', () => {
    const assessment = evaluateAquaticEcotoxicology('river-basin-01', 'MERCURY_HG', 0.01);

    expect(assessment.waterBodyId).toBe('river-basin-01');
    expect(assessment.bioconcentrationFactorBCF).toBe(5000);
    expect(assessment.ecotoxicologicalRiskScore).toBeGreaterThanOrEqual(75);
    expect(assessment.aquaticLifeThreatTier).toBe('ACUTE_AQUATIC_TOXICITY');
    expect(assessment.remediationRecommendations.length).toBeGreaterThan(0);
  });
});
