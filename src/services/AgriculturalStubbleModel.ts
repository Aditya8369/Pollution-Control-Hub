export interface ThermalFireSpotReading {
  id: string;
  districtName: string;
  stateRegion: string;
  cropType: 'Paddy Rice' | 'Wheat Stubble' | 'Sugarcane Trash' | 'Cotton Residue';
  fireSpotCount: number;
  estimatedAcresAffected: number;
  plumeDirectionVector: 'North-West ➔ South-East' | 'West ➔ East' | 'South-West ➔ North-East';
  pm25SpikeContribution: number; // µg/m³
  satelliteSource: 'MODIS / VIIRS' | 'Sentinel-3 SLSTR' | 'INSAT-3DR Thermal';
  incidentSeverity: 'Isolated Farm' | 'Moderate Cluster' | 'Severe Regional Outbreak';
  lastDetectedTimestamp: string;
}

export interface BioDecomposerDispatchRecord {
  id: string;
  fireSpotId: string;
  districtName: string;
  unitsDispatched: number;
  subsidyIncentiveUsd: number;
  farmerGroupContact: string;
  dispatchStatus: 'En Route' | 'Spraying Active' | 'Completed';
  dispatchedTimestamp: string;
}

export interface StubbleFilterOptions {
  cropType: string;
  incidentSeverity: string;
  searchQuery: string;
}

const INITIAL_FIRE_SPOTS: ThermalFireSpotReading[] = [
  {
    id: "fire-101",
    districtName: "Sangrur District",
    stateRegion: "Punjab Agrarian Belt",
    cropType: "Paddy Rice",
    fireSpotCount: 142,
    estimatedAcresAffected: 850,
    plumeDirectionVector: "North-West ➔ South-East",
    pm25SpikeContribution: 185,
    satelliteSource: "MODIS / VIIRS",
    incidentSeverity: "Severe Regional Outbreak",
    lastDetectedTimestamp: "35 minutes ago"
  },
  {
    id: "fire-102",
    districtName: "Karnal District",
    stateRegion: "Haryana Agricultural Zone",
    cropType: "Wheat Stubble",
    fireSpotCount: 48,
    estimatedAcresAffected: 290,
    plumeDirectionVector: "West ➔ East",
    pm25SpikeContribution: 72,
    satelliteSource: "Sentinel-3 SLSTR",
    incidentSeverity: "Moderate Cluster",
    lastDetectedTimestamp: "1 hour ago"
  },
  {
    id: "fire-103",
    districtName: "Tarai Belt Complex",
    stateRegion: "Western Uttar Pradesh",
    cropType: "Sugarcane Trash",
    fireSpotCount: 18,
    estimatedAcresAffected: 110,
    plumeDirectionVector: "South-West ➔ North-East",
    pm25SpikeContribution: 28,
    satelliteSource: "INSAT-3DR Thermal",
    incidentSeverity: "Isolated Farm",
    lastDetectedTimestamp: "2 hours ago"
  }
];

const INITIAL_DISPATCHES: BioDecomposerDispatchRecord[] = [
  {
    id: "disp-901",
    fireSpotId: "fire-101",
    districtName: "Sangrur District",
    unitsDispatched: 12,
    subsidyIncentiveUsd: 4500,
    farmerGroupContact: "Sangrur Kisan Co-op #14",
    dispatchStatus: "Spraying Active",
    dispatchedTimestamp: "20 minutes ago"
  }
];

export class AgriculturalStubbleService {
  private static fireSpots: ThermalFireSpotReading[] = [...INITIAL_FIRE_SPOTS];
  private static dispatches: BioDecomposerDispatchRecord[] = [...INITIAL_DISPATCHES];

  public static getFireSpots(options?: Partial<StubbleFilterOptions>): ThermalFireSpotReading[] {
    let result = [...this.fireSpots];
    if (!options) return result;

    if (options.cropType && options.cropType !== "All") {
      result = result.filter((f) => f.cropType === options.cropType);
    }

    if (options.incidentSeverity && options.incidentSeverity !== "All") {
      result = result.filter((f) => f.incidentSeverity === options.incidentSeverity);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.districtName.toLowerCase().includes(q) ||
          f.stateRegion.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static registerFireSpot(
    spot: Omit<ThermalFireSpotReading, "id" | "incidentSeverity">
  ): ThermalFireSpotReading {
    const isSevere = spot.fireSpotCount > 100;
    const newSpot: ThermalFireSpotReading = {
      ...spot,
      id: `fire-${Date.now()}`,
      incidentSeverity: isSevere ? "Severe Regional Outbreak" : "Moderate Cluster"
    };

    this.fireSpots.unshift(newSpot);
    return newSpot;
  }

  public static getDispatches(): BioDecomposerDispatchRecord[] {
    return [...this.dispatches];
  }

  public static dispatchBioDecomposer(
    fireSpotId: string,
    unitsCount: number,
    incentiveUsd: number
  ): BioDecomposerDispatchRecord {
    const spot = this.fireSpots.find((f) => f.id === fireSpotId);
    if (!spot) throw new Error("Fire spot record not found.");

    const newDispatch: BioDecomposerDispatchRecord = {
      id: `disp-${Date.now()}`,
      fireSpotId,
      districtName: spot.districtName,
      unitsDispatched: unitsCount,
      subsidyIncentiveUsd: incentiveUsd,
      farmerGroupContact: `${spot.districtName} Farm Co-op`,
      dispatchStatus: "En Route",
      dispatchedTimestamp: "Just now"
    };

    this.dispatches.unshift(newDispatch);
    return newDispatch;
  }
}
