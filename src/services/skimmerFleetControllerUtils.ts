/**
 * Coastal Autonomous Skimmer Vessel & Barrier Interceptor Fleet Controller
 * Controls autonomous trash skimmer vessels and river mouth bubble barriers for marine debris containment.
 */

export interface SkimmerVesselStatus {
  vesselId: string;
  coastalZoneId: string;
  batteryLevelPercent: number;
  debrisHopperCapacityKg: number;
  currentDebrisLoadKg: number;
  isHopperFull: boolean;
  bubbleBarrierActive: boolean;
  skimmerStatus: 'COLLECTING' | 'RETURNING_TO_BASE' | 'OFFLINE';
}

/**
 * Evaluates skimmer vessel hopper capacity and triggers base return or bubble barrier activation.
 */
export function evaluateSkimmerFleetControl(
  vesselId: string,
  coastalZoneId: string,
  currentDebrisLoadKg: number,
  hopperCapacityKg = 500
): SkimmerVesselStatus {
  const isFull = currentDebrisLoadKg >= hopperCapacityKg * 0.9;
  const status = isFull ? 'RETURNING_TO_BASE' : 'COLLECTING';

  return {
    vesselId,
    coastalZoneId,
    batteryLevelPercent: 85,
    debrisHopperCapacityKg: hopperCapacityKg,
    currentDebrisLoadKg,
    isHopperFull: isFull,
    bubbleBarrierActive: true,
    skimmerStatus: status,
  };
}
