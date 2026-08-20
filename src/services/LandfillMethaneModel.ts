export interface LandfillSectorReading {
  id: string;
  landfillSiteName: string;
  wasteTypeCategory: 'Organic Municipal Waste' | 'Mixed Construction Debris' | 'Industrial Sludge' | 'Segregated E-Waste';
  sectorZoneId: string;
  methaneCh4Ppm: number; // Normal < 500 PPM
  surfaceTempCelsius: number;
  leachatePercolationPh: number;
  fireSubsurfaceRiskScore: number; // 0 - 100
  biogasRecoveryStatus: 'Active Capture Engine' | 'Venting Flaring' | 'Uncontrolled Leakage';
  environmentalHazardLevel: 'Low Risk' | 'Moderate Warning' | 'Critical Methane Hazard';
  lastSurveyedTimestamp: string;
}

export interface BiogasRecoveryDispatchRecord {
  id: string;
  sectorZoneId: string;
  landfillSiteName: string;
  treatmentAction: 'Cap & Flare Ignition' | 'Leachate Extraction Pump' | 'Bio-Cover Application' | 'Methane Extraction Vacuum';
  allocatedEquipmentUnits: number;
  estimatedCh4MitigatedM3: number;
  dispatchStatus: 'Dispatched' | 'Operational' | 'Completed';
  dispatchedTimestamp: string;
}

export interface LandfillFilterOptions {
  wasteCategory: string;
  hazardLevel: string;
  searchQuery: string;
}

const INITIAL_SECTORS: LandfillSectorReading[] = [
  {
    id: "landfill-101",
    landfillSiteName: "Ghazipur Municipal Landfill Complex",
    wasteTypeCategory: "Organic Municipal Waste",
    sectorZoneId: "SEC-GZ-NORTH",
    methaneCh4Ppm: 1250,
    surfaceTempCelsius: 58.4,
    leachatePercolationPh: 4.8,
    fireSubsurfaceRiskScore: 88,
    biogasRecoveryStatus: "Uncontrolled Leakage",
    environmentalHazardLevel: "Critical Methane Hazard",
    lastSurveyedTimestamp: "20 minutes ago"
  },
  {
    id: "landfill-102",
    landfillSiteName: "Bhalswa Eco Waste Facility",
    wasteTypeCategory: "Mixed Construction Debris",
    sectorZoneId: "SEC-BHL-WEST",
    methaneCh4Ppm: 420,
    surfaceTempCelsius: 39.2,
    leachatePercolationPh: 6.5,
    fireSubsurfaceRiskScore: 35,
    biogasRecoveryStatus: "Active Capture Engine",
    environmentalHazardLevel: "Low Risk",
    lastSurveyedTimestamp: "1 hour ago"
  },
  {
    id: "landfill-103",
    landfillSiteName: "Okhla Integrated Waste Hub",
    wasteTypeCategory: "Industrial Sludge",
    sectorZoneId: "SEC-OKH-EAST",
    methaneCh4Ppm: 780,
    surfaceTempCelsius: 49.0,
    leachatePercolationPh: 5.2,
    fireSubsurfaceRiskScore: 68,
    biogasRecoveryStatus: "Venting Flaring",
    environmentalHazardLevel: "Moderate Warning",
    lastSurveyedTimestamp: "2 hours ago"
  }
];

const INITIAL_DISPATCHES: BiogasRecoveryDispatchRecord[] = [
  {
    id: "treat-401",
    sectorZoneId: "SEC-GZ-NORTH",
    landfillSiteName: "Ghazipur Municipal Landfill Complex",
    treatmentAction: "Methane Extraction Vacuum",
    allocatedEquipmentUnits: 4,
    estimatedCh4MitigatedM3: 15000,
    dispatchStatus: "Operational",
    dispatchedTimestamp: "40 minutes ago"
  }
];

export class MunicipalLandfillService {
  private static sectors: LandfillSectorReading[] = [...INITIAL_SECTORS];
  private static dispatches: BiogasRecoveryDispatchRecord[] = [...INITIAL_DISPATCHES];

  public static getSectors(options?: Partial<LandfillFilterOptions>): LandfillSectorReading[] {
    let result = [...this.sectors];
    if (!options) return result;

    if (options.wasteCategory && options.wasteCategory !== "All") {
      result = result.filter((s) => s.wasteTypeCategory === options.wasteCategory);
    }

    if (options.hazardLevel && options.hazardLevel !== "All") {
      result = result.filter((s) => s.environmentalHazardLevel === options.hazardLevel);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.landfillSiteName.toLowerCase().includes(q) ||
          s.sectorZoneId.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static registerSector(
    sector: Omit<LandfillSectorReading, "id" | "fireSubsurfaceRiskScore" | "environmentalHazardLevel">
  ): LandfillSectorReading {
    const isCritical = sector.methaneCh4Ppm > 900 || sector.surfaceTempCelsius > 50;
    const newSector: LandfillSectorReading = {
      ...sector,
      id: `landfill-${Date.now()}`,
      fireSubsurfaceRiskScore: isCritical ? 82 : 30,
      environmentalHazardLevel: isCritical ? "Critical Methane Hazard" : "Low Risk"
    };

    this.sectors.unshift(newSector);
    return newSector;
  }

  public static getDispatches(): BiogasRecoveryDispatchRecord[] {
    return [...this.dispatches];
  }

  public static dispatchTreatmentAction(
    sectorZoneId: string,
    action: 'Cap & Flare Ignition' | 'Leachate Extraction Pump' | 'Bio-Cover Application' | 'Methane Extraction Vacuum',
    equipmentUnits: number
  ): BiogasRecoveryDispatchRecord {
    const sector = this.sectors.find((s) => s.sectorZoneId === sectorZoneId);
    if (!sector) throw new Error("Landfill sector record not found.");

    const newDispatch: BiogasRecoveryDispatchRecord = {
      id: `treat-${Date.now()}`,
      sectorZoneId,
      landfillSiteName: sector.landfillSiteName,
      treatmentAction: action,
      allocatedEquipmentUnits: equipmentUnits,
      estimatedCh4MitigatedM3: equipmentUnits * 3500,
      dispatchStatus: "Dispatched",
      dispatchedTimestamp: "Just now"
    };

    this.dispatches.unshift(newDispatch);
    return newDispatch;
  }
}
