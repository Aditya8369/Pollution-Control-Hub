import { activateEmergencySuppressionSystems } from './chemicalSuppressionControllerUtils';

describe('ChemicalSuppressionControllerUtils', () => {
  it('activates full water mist curtain and emergency vent isolation on critical breach', () => {
    const status = activateEmergencySuppressionSystems('facility-01', 'CRITICAL_HAZMAT_BREACH');

    expect(status.facilityId).toBe('facility-01');
    expect(status.chemicalScrubberActive).toBe(true);
    expect(status.waterMistCurtainActive).toBe(true);
    expect(status.emergencyVentIsolationActive).toBe(true);
  });
});
