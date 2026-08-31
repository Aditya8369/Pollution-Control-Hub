import { auditFacilityRegulatoryCompliance } from './hazmatComplianceAuditService';

describe('HazmatComplianceAuditService', () => {
  it('identifies PSM/RMP threshold exceedance correctly', () => {
    const inventory = {
      facilityId: 'plant-chem-01',
      chemicalName: 'Chlorine',
      casNumber: '7782-50-5',
      storageQuantityKg: 5000,
      thresholdPlanningQuantityKg: 1000,
      storageTemperatureCelsius: 20,
      storagePressureBar: 6.5,
    };

    const result = auditFacilityRegulatoryCompliance(inventory);

    expect(result.facilityId).toBe('plant-chem-01');
    expect(result.isPsmRegulated).toBe(true);
    expect(result.complianceTier).toBe('NON_COMPLIANT_HIGH_RISK');
    expect(result.regulatoryActionRequired.length).toBeGreaterThan(0);
  });
});
