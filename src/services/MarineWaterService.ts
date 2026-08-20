import {
  MarineWaterService,
  MarineBuoyNodeReading,
  CleanupDroneDispatchRecord,
  MarineFilterOptions
} from "./MarineWaterModel";

export class MarineWaterServiceHandler {
  public static fetchBuoyNodes(filters?: Partial<MarineFilterOptions>): MarineBuoyNodeReading[] {
    return MarineWaterService.getBuoys(filters);
  }

  public static registerNewBuoyNode(
    payload: Omit<MarineBuoyNodeReading, "id" | "marineEcosystemHealthScore" | "bathingSafetyStatus">
  ): MarineBuoyNodeReading {
    return MarineWaterService.registerBuoy(payload);
  }

  public static fetchCleanupDroneDispatches(): CleanupDroneDispatchRecord[] {
    return MarineWaterService.getDispatches();
  }

  public static dispatchAutonomousCleanupFleet(
    buoyNodeId: string,
    droneType: 'Surface Skimmer' | 'Deep Sample Autonomous Submersible' | 'Oil Dispersant Spray Unit'
  ): CleanupDroneDispatchRecord {
    return MarineWaterService.dispatchCleanupDrone(buoyNodeId, droneType);
  }
}
