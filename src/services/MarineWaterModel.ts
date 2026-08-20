export interface MarineBuoyNodeReading {
  id: string;
  coastalZoneName: string;
  waterCategory: 'Port Estuary' | 'Coral Reef Sanctuary' | 'Public Bathing Beach' | 'Offshore Shipping Lane';
  buoyNodeId: string;
  dissolvedOxygenMgL: number; // Normal > 6.0 mg/L
  phLevel: number;
  microplasticsPpm: number;
  heavyMetalIndexPpb: number;
  oilSlickDetected: boolean;
  turbidityNtu: number;
  marineEcosystemHealthScore: number; // 0 - 100
  bathingSafetyStatus: 'Safe for Swimming' | 'Caution Advised' | 'Hazardous Toxic Runoff';
  lastSampledTimestamp: string;
}

export interface CleanupDroneDispatchRecord {
  id: string;
  buoyNodeId: string;
  coastalZoneName: string;
  droneType: 'Surface Skimmer' | 'Deep Sample Autonomous Submersible' | 'Oil Dispersant Spray Unit';
  skimmerCapacityKg: number;
  batteryStatusPercentage: number;
  missionStatus: 'Deployed' | 'Skimming Active' | 'Completed & Docked';
  dispatchedTimestamp: string;
}

export interface MarineFilterOptions {
  waterCategory: string;
  bathingSafetyStatus: string;
  searchQuery: string;
}

const INITIAL_BUOYS: MarineBuoyNodeReading[] = [
  {
    id: "buoy-101",
    coastalZoneName: "Marina Bay Beach Front",
    waterCategory: "Public Bathing Beach",
    buoyNodeId: "BUOY-MB-04",
    dissolvedOxygenMgL: 6.8,
    phLevel: 8.1,
    microplasticsPpm: 12.4,
    heavyMetalIndexPpb: 4.2,
    oilSlickDetected: false,
    turbidityNtu: 8.5,
    marineEcosystemHealthScore: 91,
    bathingSafetyStatus: "Safe for Swimming",
    lastSampledTimestamp: "15 minutes ago"
  },
  {
    id: "buoy-102",
    coastalZoneName: "Jawaharlal Nehru Port Estuary",
    waterCategory: "Port Estuary",
    buoyNodeId: "BUOY-JNPT-09",
    dissolvedOxygenMgL: 3.2,
    phLevel: 6.8,
    microplasticsPpm: 84.5,
    heavyMetalIndexPpb: 42.0,
    oilSlickDetected: true,
    turbidityNtu: 45.0,
    marineEcosystemHealthScore: 42,
    bathingSafetyStatus: "Hazardous Toxic Runoff",
    lastSampledTimestamp: "45 minutes ago"
  },
  {
    id: "buoy-103",
    coastalZoneName: "Malvan Marine Coral Sanctuary",
    waterCategory: "Coral Reef Sanctuary",
    buoyNodeId: "BUOY-CORAL-01",
    dissolvedOxygenMgL: 7.4,
    phLevel: 8.2,
    microplasticsPpm: 4.8,
    heavyMetalIndexPpb: 1.5,
    oilSlickDetected: false,
    turbidityNtu: 2.1,
    marineEcosystemHealthScore: 97,
    bathingSafetyStatus: "Safe for Swimming",
    lastSampledTimestamp: "1 hour ago"
  }
];

const INITIAL_DISPATCHES: CleanupDroneDispatchRecord[] = [
  {
    id: "drone-501",
    buoyNodeId: "BUOY-JNPT-09",
    coastalZoneName: "Jawaharlal Nehru Port Estuary",
    droneType: "Oil Dispersant Spray Unit",
    skimmerCapacityKg: 500,
    batteryStatusPercentage: 88,
    missionStatus: "Skimming Active",
    dispatchedTimestamp: "30 minutes ago"
  }
];

export class MarineWaterService {
  private static buoys: MarineBuoyNodeReading[] = [...INITIAL_BUOYS];
  private static dispatches: CleanupDroneDispatchRecord[] = [...INITIAL_DISPATCHES];

  public static getBuoys(options?: Partial<MarineFilterOptions>): MarineBuoyNodeReading[] {
    let result = [...this.buoys];
    if (!options) return result;

    if (options.waterCategory && options.waterCategory !== "All") {
      result = result.filter((b) => b.waterCategory === options.waterCategory);
    }

    if (options.bathingSafetyStatus && options.bathingSafetyStatus !== "All") {
      result = result.filter((b) => b.bathingSafetyStatus === options.bathingSafetyStatus);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (b) =>
          b.coastalZoneName.toLowerCase().includes(q) ||
          b.buoyNodeId.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static registerBuoy(
    buoy: Omit<MarineBuoyNodeReading, "id" | "marineEcosystemHealthScore" | "bathingSafetyStatus">
  ): MarineBuoyNodeReading {
    const isToxic = buoy.oilSlickDetected || buoy.dissolvedOxygenMgL < 4.0 || buoy.microplasticsPpm > 50;
    const newBuoy: MarineBuoyNodeReading = {
      ...buoy,
      id: `buoy-${Date.now()}`,
      marineEcosystemHealthScore: isToxic ? 48 : 88,
      bathingSafetyStatus: isToxic ? "Hazardous Toxic Runoff" : "Safe for Swimming"
    };

    this.buoys.unshift(newBuoy);
    return newBuoy;
  }

  public static getDispatches(): CleanupDroneDispatchRecord[] {
    return [...this.dispatches];
  }

  public static dispatchCleanupDrone(
    buoyNodeId: string,
    droneType: 'Surface Skimmer' | 'Deep Sample Autonomous Submersible' | 'Oil Dispersant Spray Unit'
  ): CleanupDroneDispatchRecord {
    const buoy = this.buoys.find((b) => b.buoyNodeId === buoyNodeId);
    if (!buoy) throw new Error("Buoy record not found.");

    const newDispatch: CleanupDroneDispatchRecord = {
      id: `drone-${Date.now()}`,
      buoyNodeId,
      coastalZoneName: buoy.coastalZoneName,
      droneType,
      skimmerCapacityKg: 400,
      batteryStatusPercentage: 100,
      missionStatus: "Deployed",
      dispatchedTimestamp: "Just now"
    };

    this.dispatches.unshift(newDispatch);
    return newDispatch;
  }
}
