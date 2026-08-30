import { calculateZldTreatmentMetrics } from './zldTreatmentPlantUtils';

describe('ZldTreatmentPlantUtils', () => {
  it('calculates ZLD recovery metrics and activates chemical dosing on heavy metal breach', () => {
    const state = calculateZldTreatmentMetrics('zld-plant-01', 'facility-alpha', 15, true);

    expect(state.plantId).toBe('zld-plant-01');
    expect(state.chemicalDosingActive).toBe(true);
    expect(state.recycledWaterRecoveryPercent).toBe(98.5);
    expect(state.sludgeSolidificationStatus).toBe('OPERATIONAL');
  });
});
