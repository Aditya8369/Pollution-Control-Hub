import { generateHazardousSludgeManifest } from './hazardousSludgeManifestUtils';

describe('HazardousSludgeManifestUtils', () => {
  it('generates hazardous waste manifest when TCLP leachate exceeds safety limit', () => {
    const manifest = generateHazardousSludgeManifest('plant-plating-02', 15.5, 'CADMIUM_CD', 1.2);

    expect(manifest.facilityId).toBe('plant-plating-02');
    expect(manifest.isHazardousWasteClassified).toBe(true);
    expect(manifest.authorizedDisposalFacility).toContain('TSDF Hazardous Waste Landfill');
  });
});
