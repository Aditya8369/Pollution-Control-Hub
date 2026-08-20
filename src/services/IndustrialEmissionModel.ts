export interface IndustrialStackReading {
  id: string;
  facilityName: string;
  industryCategory: 'Thermal Power' | 'Petrochemical Refinery' | 'Cement Manufacturing' | 'Steel & Metallurgy';
  stackId: string;
  locationRegion: string;
  so2Ppm: number;
  noxPpm: number;
  co2Percentage: number;
  pmMgM3: number;
  exhaustTempCelsius: number;
  flowRateM3Hr: number;
  complianceScore: number; // 0 - 100
  regulatoryLimitStatus: 'Fully Compliant' | 'Warning Threshold' | 'Severe Exceedance';
  lastCalibrated: string;
}

export interface EmissionViolationAlert {
  id: string;
  stackId: string;
  facilityName: string;
  pollutantExceeded: 'SO2' | 'NOx' | 'Particulate Matter' | 'CO2';
  measuredValue: number;
  permittedLimit: number;
  severityLevel: 'Minor' | 'Critical' | 'Hazardous';
  timestamp: string;
  mitigationActionTaken: boolean;
}

export interface IndustrialFilterOptions {
  industryCategory: string;
  regulatoryStatus: string;
  searchQuery: string;
}

const INITIAL_STACKS: IndustrialStackReading[] = [
  {
    id: "stack-101",
    facilityName: "Apex Energy Thermal Power Station",
    industryCategory: "Thermal Power",
    stackId: "STK-ALPHA-01",
    locationRegion: "Singrauli Industrial Area",
    so2Ppm: 124,
    noxPpm: 185,
    co2Percentage: 8.4,
    pmMgM3: 32,
    exhaustTempCelsius: 165,
    flowRateM3Hr: 450000,
    complianceScore: 94,
    regulatoryLimitStatus: "Fully Compliant",
    lastCalibrated: "2 days ago"
  },
  {
    id: "stack-102",
    facilityName: "Gujarat Horizon Petrochemical Refinery",
    industryCategory: "Petrochemical Refinery",
    stackId: "STK-FLARE-09",
    locationRegion: "Dahej Petroleum Hub",
    so2Ppm: 340,
    noxPpm: 410,
    co2Percentage: 14.8,
    pmMgM3: 98,
    exhaustTempCelsius: 240,
    flowRateM3Hr: 620000,
    complianceScore: 58,
    regulatoryLimitStatus: "Severe Exceedance",
    lastCalibrated: "5 days ago"
  },
  {
    id: "stack-103",
    facilityName: "UltraTech Matrix Cement Complex",
    industryCategory: "Cement Manufacturing",
    stackId: "STK-KILN-04",
    locationRegion: "Chandrapur Zone",
    so2Ppm: 195,
    noxPpm: 260,
    co2Percentage: 11.2,
    pmMgM3: 48,
    exhaustTempCelsius: 190,
    flowRateM3Hr: 380000,
    complianceScore: 82,
    regulatoryLimitStatus: "Warning Threshold",
    lastCalibrated: "1 day ago"
  }
];

const INITIAL_ALERTS: EmissionViolationAlert[] = [
  {
    id: "alert-701",
    stackId: "STK-FLARE-09",
    facilityName: "Gujarat Horizon Petrochemical Refinery",
    pollutantExceeded: "SO2",
    measuredValue: 340,
    permittedLimit: 200,
    severityLevel: "Hazardous",
    timestamp: "20 minutes ago",
    mitigationActionTaken: false
  }
];

export class IndustrialEmissionService {
  private static stacks: IndustrialStackReading[] = [...INITIAL_STACKS];
  private static alerts: EmissionViolationAlert[] = [...INITIAL_ALERTS];

  public static getStacks(options?: Partial<IndustrialFilterOptions>): IndustrialStackReading[] {
    let result = [...this.stacks];
    if (!options) return result;

    if (options.industryCategory && options.industryCategory !== "All") {
      result = result.filter((s) => s.industryCategory === options.industryCategory);
    }

    if (options.regulatoryStatus && options.regulatoryStatus !== "All") {
      result = result.filter((s) => s.regulatoryLimitStatus === options.regulatoryStatus);
    }

    if (options.searchQuery && options.searchQuery.trim() !== "") {
      const q = options.searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.facilityName.toLowerCase().includes(q) ||
          s.stackId.toLowerCase().includes(q) ||
          s.locationRegion.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public static registerStack(
    stack: Omit<IndustrialStackReading, "id" | "complianceScore" | "regulatoryLimitStatus">
  ): IndustrialStackReading {
    const isExceed = stack.so2Ppm > 250 || stack.noxPpm > 300 || stack.pmMgM3 > 75;
    const newStack: IndustrialStackReading = {
      ...stack,
      id: `stack-${Date.now()}`,
      complianceScore: isExceed ? 62 : 95,
      regulatoryLimitStatus: isExceed ? "Severe Exceedance" : "Fully Compliant"
    };

    this.stacks.unshift(newStack);
    return newStack;
  }

  public static getAlerts(): EmissionViolationAlert[] {
    return [...this.alerts];
  }

  public static resolveAlert(alertId: string): EmissionViolationAlert {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (!alert) throw new Error("Alert not found.");

    alert.mitigationActionTaken = true;
    return alert;
  }
}
