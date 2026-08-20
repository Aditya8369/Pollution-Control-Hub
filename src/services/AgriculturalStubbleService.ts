import {
  AgriculturalStubbleService,
  ThermalFireSpotReading,
  BioDecomposerDispatchRecord,
  StubbleFilterOptions
} from "./AgriculturalStubbleModel";

export class AgriculturalStubbleServiceHandler {
  public static fetchFireSpots(filters?: Partial<StubbleFilterOptions>): ThermalFireSpotReading[] {
    return AgriculturalStubbleService.getFireSpots(filters);
  }

  public static registerThermalFireSpot(
    payload: Omit<ThermalFireSpotReading, "id" | "incidentSeverity">
  ): ThermalFireSpotReading {
    return AgriculturalStubbleService.registerFireSpot(payload);
  }

  public static fetchDecomposerDispatches(): BioDecomposerDispatchRecord[] {
    return AgriculturalStubbleService.getDispatches();
  }

  public static dispatchBioDecomposerMachines(
    fireSpotId: string,
    unitsCount: number,
    incentiveUsd: number
  ): BioDecomposerDispatchRecord {
    return AgriculturalStubbleService.dispatchBioDecomposer(fireSpotId, unitsCount, incentiveUsd);
  }
}
