import {
  evaluateSoilHeavyMetalContamination,
  generateBrownfieldSoilReport,
} from './soilHeavyMetalRemediationService.js';

describe('SoilHeavyMetalRemediationService', () => {
  const cleanSample = {
    sampleId: 'soil-sample-01',
    siteId: 'brownfield-alpha',
    heavyMetalType: 'LEAD_PB',
    concentrationMgKg: 50,
  };

  const hazardousSample = {
    sampleId: 'soil-sample-02',
    siteId: 'brownfield-alpha',
    heavyMetalType: 'LEAD_PB',
    concentrationMgKg: 650,
  };

  it('evaluates clean soil baseline sample correctly', () => {
    const res = evaluateSoilHeavyMetalContamination(cleanSample);

    expect(res.sampleId).toBe('soil-sample-01');
    expect(res.isContaminated).toBe(false);
    expect(res.hazardTier).toBe('UNCONTAMINATED_SOIL_BASELINE');
    expect(res.phytoremediationRequired).toBe(false);
  });

  it('detects critical hazardous lead contamination and recommends hyperaccumulator species', () => {
    const res = evaluateSoilHeavyMetalContamination(hazardousSample);

    expect(res.isContaminated).toBe(true);
    expect(res.hazardTier).toBe('CRITICAL_HAZARDOUS_SOIL_CONTAMINATION');
    expect(res.phytoremediationRequired).toBe(true);
    expect(res.recommendedPlantSpecies).toContain('Sunflower');
    expect(res.estimatedRemediationMonths).toBeGreaterThan(0);
  });

  it('generates brownfield soil report across site soil core samples', () => {
    const report = generateBrownfieldSoilReport('brownfield-alpha', [cleanSample, hazardousSample]);

    expect(report.siteId).toBe('brownfield-alpha');
    expect(report.overallSoilStatus).toBe('CRITICAL_BROWNFIELD_HAZARD_ZONE');
    expect(report.contaminatedPlotCount).toBe(1);
    expect(report.phytoremediationActive).toBe(true);
  });
});
