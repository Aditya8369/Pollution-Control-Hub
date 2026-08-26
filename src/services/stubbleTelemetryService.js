// Pollution-Control-Hub/src/services/stubbleTelemetryService.js

/**
 * Service simulating real-time satellite thermal anomaly fire spots,
 * smoke plume trajectory dispersion, and bio-decomposer resource allocation.
 */
export async function fetchStubbleTelemetryData(regionId) {
    // Simulated telemetry telemetry payload matching NASA FIRMS / regional pollution control boards
    return {
        region: regionId || "Northern Plains (Punjab/Haryana/NCR)",
        timestamp: new Date().toISOString(),
        activeHotspots: [
            { id: "HS-801", lat: 30.90, lon: 75.85, intensityMW: 45.2, confidence: "High", timestamp: "10 mins ago" },
            { id: "HS-802", lat: 29.96, lon: 76.88, intensityMW: 32.8, confidence: "Medium", timestamp: "25 mins ago" },
            { id: "HS-803", lat: 30.33, lon: 76.38, intensityMW: 61.5, confidence: "High", timestamp: "5 mins ago" },
        ],
        plumeTrajectory: {
            direction: "SSE",
            windSpeedKmph: 14.2,
            affectedRadiusKm: 120,
            predictedAqiSpike: +145,
        },
        bioDecomposerFleet: {
            totalUnits: 1200,
            deployedUnits: 940,
            availableUnits: 260,
            incentiveClaimsPending: 342,
        }
    };
}
