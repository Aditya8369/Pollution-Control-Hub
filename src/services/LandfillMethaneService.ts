import {
  MunicipalLandfillService,
  LandfillSectorReading,
  BiogasRecoveryDispatchRecord,
  LandfillFilterOptions
} from "./LandfillMethaneModel";

export class LandfillMethaneServiceHandler {
  public static fetchLandfillSectors(filters?: Partial<LandfillFilterOptions>): LandfillSectorReading[] {
    return MunicipalLandfillService.getSectors(filters);
  }

  public static registerNewLandfillSector(
    payload: Omit<LandfillSectorReading, "id" | "fireSubsurfaceRiskScore" | "environmentalHazardLevel">
  ): LandfillSectorReading {
    return MunicipalLandfillService.registerSector(payload);
  }

  public static fetchBiogasRecoveryDispatches(): BiogasRecoveryDispatchRecord[] {
    return MunicipalLandfillService.getDispatches();
  }

  public static dispatchLandfillTreatment(
    sectorZoneId: string,
    action: 'Cap & Flare Ignition' | 'Leachate Extraction Pump' | 'Bio-Cover Application' | 'Methane Extraction Vacuum',
    equipmentUnits: number
  ): BiogasRecoveryDispatchRecord {
    return MunicipalLandfillService.dispatchTreatmentAction(sectorZoneId, action, equipmentUnits);
  }
}
