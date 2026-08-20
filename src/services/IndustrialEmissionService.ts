import {
  IndustrialEmissionService,
  IndustrialStackReading,
  EmissionViolationAlert,
  IndustrialFilterOptions
} from "./IndustrialEmissionModel";

export class IndustrialEmissionServiceHandler {
  public static fetchStacks(filters?: Partial<IndustrialFilterOptions>): IndustrialStackReading[] {
    return IndustrialEmissionService.getStacks(filters);
  }

  public static registerNewStack(
    payload: Omit<IndustrialStackReading, "id" | "complianceScore" | "regulatoryLimitStatus">
  ): IndustrialStackReading {
    return IndustrialEmissionService.registerStack(payload);
  }

  public static fetchViolationAlerts(): EmissionViolationAlert[] {
    return IndustrialEmissionService.getAlerts();
  }

  public static acknowledgeViolationMitigation(alertId: string): EmissionViolationAlert {
    return IndustrialEmissionService.resolveAlert(alertId);
  }
}
