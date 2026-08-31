import { evaluateStorageTankRuptureRisk } from './storageTankRuptureRiskService';

describe('StorageTankRuptureRiskService', () => {
  it('detects high rupture risk on combined high pressure and high temperature', () => {
    const telemetry = {
      tankId: 'tank-cl2-99',
      chemicalName: 'Chlorine',
      pressureBar: 12.5,
      temperatureCelsius: 55,
      reliefValveSealed: true,
    };

    const assessment = evaluateStorageTankRuptureRisk(telemetry);

    expect(assessment.tankId).toBe('tank-cl2-99');
    expect(assessment.ruptureRiskLevel).toBe('HIGH_RUPTURE_RISK');
    expect(assessment.reliefVentActivated).toBe(true);
    expect(assessment.coolingWaterRequired).toBe(true);
  });
});
