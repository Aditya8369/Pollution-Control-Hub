/**
 * Groundwater Plume Migration & Leachate Risk Service
 * Evaluates hydraulic conductivity, soil porosity, and heavy metal mobility to predict groundwater contamination risks.
 */

export interface GroundwaterLeachateRisk {
  plotId: string;
  hydraulicConductivityMetersPerDay: number;
  groundwaterDepthMeters: number;
  plumeMigrationSpeedMetersPerYear: number;
  aquiferThreatTier: 'HIGH_AQUIFER_CONTAMINATION_RISK' | 'MODERATE_LEACHATE_MIGRATION' | 'SAFE_CONTAINED';
  containmentBarrierRequired: boolean;
}

/**
 * Evaluates groundwater migration speed and aquifer threat tier.
 */
export function evaluateGroundwaterLeachateRisk(
  plotId: string,
  soilConcentrationMgKg: number,
  hydraulicConductivity: number,
  groundwaterDepthMeters: number
): GroundwaterLeachateRisk {
  const speed = parseFloat((hydraulicConductivity * 365 * (soilConcentrationMgKg / 1000)).toFixed(2));
  const isHighRisk = speed > 5.0 || groundwaterDepthMeters < 3.0;

  let tier: GroundwaterLeachateRisk['aquiferThreatTier'] = 'SAFE_CONTAINED';
  if (isHighRisk) tier = 'HIGH_AQUIFER_CONTAMINATION_RISK';
  else if (speed > 1.5) tier = 'MODERATE_LEACHATE_MIGRATION';

  return {
    plotId,
    hydraulicConductivityMetersPerDay: hydraulicConductivity,
    groundwaterDepthMeters,
    plumeMigrationSpeedMetersPerYear: speed,
    aquiferThreatTier: tier,
    containmentBarrierRequired: isHighRisk,
  };
}
