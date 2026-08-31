/**
 * Industrial Thermal Plume & Urban Heat Island Telemetry Surveillance Service
 * Evaluates infrared thermal sensor telemetry for power plants, steel mills, and urban microclimates,
 * calculates thermal plume dissipation rates, and assesses urban heat island vulnerability indices.
 */

export const THERMAL_PLUME_THRESHOLDS = {
  NORMAL_SURFACE_DELTA_C: 2.0,
  ELEVATED_WARMING_DELTA_C: 5.0,
  CRITICAL_HEAT_PLUME_DELTA_C: 10.0,
};

/**
 * Evaluates real-time thermal infrared sensor telemetry against ambient surface baseline.
 */
export function evaluateThermalPlumeTelemetry(reading) {
  if (!reading || !reading.sensorId || reading.surfaceTempCelsius === undefined || reading.ambientBaselineCelsius === undefined) {
    return {
      sensorId: reading?.sensorId || 'UNKNOWN',
      isBreached: false,
      thermalSeverityTier: 'NORMAL_THERMAL_BASELINE',
      plumeDissipationDistanceMeters: 0,
      coolingTowerInterlockRequired: false,
    };
  }

  const surface = reading.surfaceTempCelsius;
  const ambient = reading.ambientBaselineCelsius;
  const deltaC = surface - ambient;
  const windSpeedMs = reading.windSpeedMs || 3;

  let isBreached = false;
  let severityTier = 'NORMAL_THERMAL_BASELINE';
  let coolingInterlock = false;

  if (deltaC >= THERMAL_PLUME_THRESHOLDS.CRITICAL_HEAT_PLUME_DELTA_C) {
    isBreached = true;
    severityTier = 'CRITICAL_INDUSTRIAL_THERMAL_BREACH';
    coolingInterlock = true;
  } else if (deltaC >= THERMAL_PLUME_THRESHOLDS.ELEVATED_WARMING_DELTA_C) {
    isBreached = true;
    severityTier = 'ELEVATED_THERMAL_PLUME_WARNING';
  }

  // Calculate dissipation distance required for thermal plume to reach ambient baseline
  const dissipationDist = isBreached ? Math.round(deltaC * 45 * (5 / Math.max(1, windSpeedMs))) : 0;

  return {
    sensorId: reading.sensorId,
    facilityId: reading.facilityId,
    surfaceTempCelsius: surface,
    ambientBaselineCelsius: ambient,
    temperatureDeltaCelsius: parseFloat(deltaC.toFixed(2)),
    isBreached,
    thermalSeverityTier: severityTier,
    plumeDissipationDistanceMeters: dissipationDist,
    coolingTowerInterlockRequired: coolingInterlock,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Aggregates zone thermal infrared sensors to generate urban heat island vulnerability report.
 */
export function generateUrbanHeatIslandReport(zoneId, sensorReadings) {
  if (!sensorReadings || sensorReadings.length === 0) {
    return {
      zoneId,
      overallHeatIndexTier: 'STABLE_MICROCLIMATE',
      averageDeltaCelsius: 0,
      criticalHotspotsCount: 0,
      evaluations: [],
    };
  }

  const evals = sensorReadings.map(evaluateThermalPlumeTelemetry);
  const hotspots = evals.filter((e) => e.isBreached);
  const criticalCount = evals.filter((e) => e.thermalSeverityTier === 'CRITICAL_INDUSTRIAL_THERMAL_BREACH').length;
  const avgDelta = parseFloat((evals.reduce((acc, e) => acc + e.temperatureDeltaCelsius, 0) / evals.length).toFixed(2));

  let heatTier = 'STABLE_MICROCLIMATE';
  if (criticalCount > 0) heatTier = 'SEVERE_URBAN_HEAT_ISLAND_EMERGENCY';
  else if (hotspots.length > 0) heatTier = 'MODERATE_MICROCLIMATE_WARMING';

  return {
    zoneId,
    overallHeatIndexTier: heatTier,
    averageDeltaCelsius: avgDelta,
    criticalHotspotsCount: criticalCount,
    evaluations: evals,
    generatedAt: new Date().toISOString(),
  };
}
