export interface MicroclimateZoneReading {
  id: string;
  zoneName: string;
  urbanType: 'Dense Commercial Core' | 'High-Density Residential' | 'Industrial Park' | 'Suburban Green Belt';
  ambientTempCelsius: number;
  surfaceTempCelsius: number;
  humidityPercentage: number;
  greenCanopyCoverPercentage: number;
  albedoReflectanceIndex: number; // 0.0 - 1.0
  heatIslandIntensityDeltaC: number; // +°C relative to rural baseline
  heatRiskLevel: 'Low' | 'Moderate' | 'High' | 'Extreme Heat Hazard';
  recommendedIntervention: 'Cool Roof Retrofit' | 'Urban Tree Canopy Expansion' | 'Permeable Pavement Installation' | 'Green Wall Integration';
}

export interface HeatMitigationIntervention {
  id: string;
  zoneId: string;
  zoneName: string;
  interventionType: 'Cool Roof Retrofit' | 'Urban Tree Canopy Expansion' | 'Permeable Pavement Installation' | 'Green Wall Integration';
  estimatedCostUsd: number;
  projectedTempReductionC: number;
  fundingStatus: 'Proposed' | 'Approved & Scheduled' | 'In Progress' | 'Completed';
  targetCompletionDate: string;
}

export interface MicroclimateFilterOptions {
  urbanType: string;
  heatRiskLevel: string;
  searchQuery: string;
}

const INITIAL_ZONES: MicroclimateZoneReading[] = [
  {
    id: "zone-101",
    zoneName: "Central Business District Core",
    urbanType: "Dense Commercial Core",
    ambientTempCelsius: 38.5,
    surfaceTempCelsius: 48.2,
    humidityPercentage: 42,
    greenCanopyCoverPercentage: 8.5,
    albedoReflectanceIndex: 0.15,
    heatIslandIntensityDeltaC: +5.8,
    heatRiskLevel: "Extreme Heat Hazard",
    recommendedIntervention: "Cool Roof Retrofit"
  },
  {
    id: "zone-102",
    zoneName: "Eastside Residential Sector 4",
    urbanType: "High-Density Residential",
    ambientTempCelsius: 35.2,
    surfaceTempCelsius: 41.0,
    humidityPercentage: 48,
    greenCanopyCoverPercentage: 16.0,
    albedoReflectanceIndex: 0.28,
    heatIslandIntensityDeltaC: +3.2,
    heatRiskLevel: "High",
    recommendedIntervention: "Urban Tree Canopy Expansion"
  },
  {
    id: "zone-103",
    zoneName: "Northside Logistics & Manufacturing Corridor",
    urbanType: "Industrial Park",
    ambientTempCelsius: 39.8,
    surfaceTempCelsius: 52.4,
    humidityPercentage: 35,
    greenCanopyCoverPercentage: 4.2,
    albedoReflectanceIndex: 0.12,
    heatIslandIntensityDeltaC: +7.1,
    heatRiskLevel: "Extreme Heat Hazard",
    recommendedIntervention: "Permeable Pavement Installation"
  }
];

const INITIAL_INTERVENTIONS: HeatMitigationIntervention[] = [
  {
    id: "mit-801",
    zoneId: "zone-101",
    zoneName: "Central Business District Core",
    interventionType: "Cool Roof Retrofit",
    estimatedCostUsd: 120000,
    projectedTempReductionC: 2.4,
    fundingStatus: "Approved & Scheduled",
    targetCompletionDate: "Q3 2026"
  }
];

export class MicroclimateService {
  private static zones: MicroclimateZoneReading[] = [...INITIAL_ZONES];
  private static interventions: HeatMitigationIntervention[] = [...INITIAL_INTERVENTIONS];

  public static getZones(options?: Partial<MicroclimateFilterOptions>): MicroclimateZoneReading[] {
    let result = [...this.zones];
    if (!options) return result;

    if (options.urbanType && options.urbanType !== "All") {
      result = result.filter((z) => z.urbanType === options.urbanType);
    }

    if (options.heatRiskLevel && options.heatRiskLevel !== "All") {
      result = result.filter((z) => z.heatRiskLevel === options.heatRiskLevel);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (z) =>
          z.zoneName.toLowerCase().includes(q) ||
          z.urbanType.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static registerZone(
    zone: Omit<MicroclimateZoneReading, "id" | "heatIslandIntensityDeltaC" | "heatRiskLevel">
  ): MicroclimateZoneReading {
    const delta = Math.round((zone.surfaceTempCelsius - zone.ambientTempCelsius + (100 - zone.greenCanopyCoverPercentage) * 0.05) * 10) / 10;
    const isExtreme = delta > 5.0;
    const newZone: MicroclimateZoneReading = {
      ...zone,
      id: `zone-${Date.now()}`,
      heatIslandIntensityDeltaC: delta,
      heatRiskLevel: isExtreme ? "Extreme Heat Hazard" : "High"
    };

    this.zones.unshift(newZone);
    return newZone;
  }

  public static getInterventions(): HeatMitigationIntervention[] {
    return [...this.interventions];
  }

  public static createIntervention(
    zoneId: string,
    interventionType: 'Cool Roof Retrofit' | 'Urban Tree Canopy Expansion' | 'Permeable Pavement Installation' | 'Green Wall Integration',
    costUsd: number
  ): HeatMitigationIntervention {
    const zone = this.zones.find((z) => z.id === zoneId);
    if (!zone) throw new Error("Microclimate zone not found.");

    const newIntervention: HeatMitigationIntervention = {
      id: `mit-${Date.now()}`,
      zoneId,
      zoneName: zone.zoneName,
      interventionType,
      estimatedCostUsd: costUsd,
      projectedTempReductionC: 2.1,
      fundingStatus: "Approved & Scheduled",
      targetCompletionDate: "Q4 2026"
    };

    this.interventions.unshift(newIntervention);
    return newIntervention;
  }
}
