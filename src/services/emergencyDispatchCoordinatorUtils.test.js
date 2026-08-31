import { generateIncidentCommandReport } from './emergencyDispatchCoordinatorUtils';

describe('EmergencyDispatchCoordinatorUtils', () => {
  it('synthesizes hazmat emergency telemetry into CODE_RED incident command report', () => {
    const criticalReadings = [
      {
        sensorId: 'sensor-cl2-01',
        facilityId: 'plant-beta',
        chemicalType: 'CHLORINE_CL2',
        concentrationPpm: 3.0,
        windSpeedKmh: 12,
      },
    ];

    const report = generateIncidentCommandReport('inc-001', 'plant-beta', criticalReadings, 180);

    expect(report.incidentId).toBe('inc-001');
    expect(report.overallThreatLevel).toBe('CODE_RED_EVACUATION');
    expect(report.recommendedDispatchTeams).toContain('Municipal Fire & Hazmat Unit');
    expect(report.evacuationAssemblyPoint).toBeDefined();
  });
});
