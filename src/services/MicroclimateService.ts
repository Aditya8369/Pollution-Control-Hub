import {
  MicroclimateService,
  MicroclimateZoneReading,
  HeatMitigationIntervention,
  MicroclimateFilterOptions
} from "./MicroclimateModel";

export class MicroclimateServiceHandler {
  public static fetchZones(filters?: Partial<MicroclimateFilterOptions>): MicroclimateZoneReading[] {
    return MicroclimateService.getZones(filters);
  }

  public static registerNewZone(
    payload: Omit<MicroclimateZoneReading, "id" | "heatIslandIntensityDeltaC" | "heatRiskLevel">
  ): MicroclimateZoneReading {
    return MicroclimateService.registerZone(payload);
  }

  public static fetchInterventions(): HeatMitigationIntervention[] {
    return MicroclimateService.getInterventions();
  }

  public static scheduleMitigationProject(
    zoneId: string,
    interventionType: 'Cool Roof Retrofit' | 'Urban Tree Canopy Expansion' | 'Permeable Pavement Installation' | 'Green Wall Integration',
    costUsd: number
  ): HeatMitigationIntervention {
    return MicroclimateService.createIntervention(zoneId, interventionType, costUsd);
  }
}
