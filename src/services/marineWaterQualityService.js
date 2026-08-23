// src/services/marineWaterQualityService.js
//
// Coastal & Marine Water Quality Telemetry Surveillance Suite — data layer.
//
// There is no free, keyless public API for coastal telemetry (dissolved
// oxygen, microplastics, heavy metals, oil-slick imagery) the way Open-Meteo
// covers air quality, so this service deterministically SIMULATES a fleet of
// coastal monitoring buoys and a cleanup drone fleet from a small set of
// named stations. The simulation is seeded per-station so values are stable
// within a session and change slowly over time, rather than being random
// noise on every render — this mirrors how a real telemetry feed behaves.

export const COASTAL_STATIONS = [
    { id: 'mangalore-buoy-1', name: 'Mangalore Coastal Buoy 1', lat: 12.9141, lon: 74.8560 },
    { id: 'goa-panaji-buoy', name: 'Panaji Bay Monitoring Buoy', lat: 15.4909, lon: 73.8278 },
    { id: 'chennai-marina-buoy', name: 'Chennai Marina Buoy', lat: 13.0500, lon: 80.2824 },
    { id: 'mumbai-worli-buoy', name: 'Mumbai Worli Sea Face Buoy', lat: 19.0176, lon: 72.8162 },
    { id: 'kochi-fort-buoy', name: 'Kochi Fort Kochi Buoy', lat: 9.9658, lon: 76.2422 },
    { id: 'vizag-rk-buoy', name: 'Visakhapatnam RK Beach Buoy', lat: 17.7104, lon: 83.3238 },
];

/** Simple deterministic string hash -> 32-bit int, used to seed each station's PRNG. */
function hashSeed(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

/** Mulberry32 PRNG — small, fast, deterministic from a numeric seed. */
function mulberry32(seed) {
    let a = seed;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

/**
 * Slow drift: seeds a PRNG from station id + the current 15-minute "tick",
 * so readings are stable for 15 minutes at a time and then gently shift,
 * rather than jumping around on every re-render.
 */
function tickSeed(stationId) {
    const fifteenMinTick = Math.floor(Date.now() / (15 * 60 * 1000));
    return hashSeed(`${stationId}:${fifteenMinTick}`);
}

/**
 * @typedef {Object} WaterQualityMetrics
 * @property {number} dissolvedOxygenMgL   Dissolved oxygen, mg/L (healthy reef/marine life: >5)
 * @property {number} microplasticsPpm     Microplastics concentration, particles per m^3 (proxy "ppm")
 * @property {number} heavyMetalIndex      Composite heavy-metal concentration index, 0-100
 * @property {boolean} oilSlickDetected    Whether satellite/visual oil-slick detection triggered
 * @property {number} oilSlickCoverageKm2  Estimated slick area in km^2 if detected, else 0
 * @property {number} turbidityNtu         Turbidity, NTU
 * @property {number} phLevel              pH (healthy seawater: ~7.8-8.3)
 * @property {number} waterTempC           Sea surface temperature, deg C
 */

/**
 * Generates a simulated telemetry reading for one station.
 * @param {{id:string,name:string,lat:number,lon:number}} station
 * @returns {WaterQualityMetrics & { stationId: string, readingTime: string }}
 */
export function generateStationReading(station) {
    const rand = mulberry32(tickSeed(station.id));

    const dissolvedOxygenMgL = +(4 + rand() * 5).toFixed(2); // 4 - 9 mg/L
    const microplasticsPpm = +(rand() * rand() * 40).toFixed(2); // skewed low, occasional spikes
    const heavyMetalIndex = +(rand() * 60 + rand() * 20).toFixed(1); // 0 - 80
    const turbidityNtu = +(1 + rand() * 25).toFixed(1);
    const phLevel = +(7.6 + rand() * 0.9).toFixed(2);
    const waterTempC = +(22 + rand() * 8).toFixed(1);

    // Oil slick detection: rare event, biased by a station-specific base rate
    // so some stations (busier ports) trend riskier than quiet ones.
    const portRisk = hashSeed(station.id) % 100 < 35 ? 0.14 : 0.04;
    const oilSlickDetected = rand() < portRisk;
    const oilSlickCoverageKm2 = oilSlickDetected ? +(rand() * 4 + 0.2).toFixed(2) : 0;

    return {
        stationId: station.id,
        readingTime: new Date().toISOString(),
        dissolvedOxygenMgL,
        microplasticsPpm,
        heavyMetalIndex,
        oilSlickDetected,
        oilSlickCoverageKm2,
        turbidityNtu,
        phLevel,
        waterTempC,
    };
}

/**
 * Fetches (simulates) current telemetry for every coastal station.
 * Kept async to match the shape of the app's other service functions
 * (airQualityService, geocodingService) and to be a drop-in for a real
 * API call later.
 * @returns {Promise<Array<WaterQualityMetrics & {stationId:string, readingTime:string, station: object}>>}
 */
export async function fetchCoastalTelemetry() {
    return COASTAL_STATIONS.map((station) => ({
        ...generateStationReading(station),
        station,
    }));
}

/**
 * @typedef {Object} ThreatAssessment
 * @property {'Low'|'Moderate'|'High'|'Severe'} level
 * @property {number} score 0-100, higher = worse
 * @property {string} color
 * @property {number} bathingSafetyScore 0-100, higher = safer for bathing/recreation
 * @property {string} bathingSafetyLabel
 */

/**
 * Derives a marine ecosystem threat level + coastal bathing safety score
 * from a single station reading. Pure function, no I/O, easy to unit test.
 * @param {WaterQualityMetrics} reading
 * @returns {ThreatAssessment}
 */
export function assessThreatLevel(reading) {
    let score = 0;

    // Dissolved oxygen: below 5 mg/L stresses marine life; below 3 is critical.
    if (reading.dissolvedOxygenMgL < 3) score += 35;
    else if (reading.dissolvedOxygenMgL < 5) score += 18;
    else if (reading.dissolvedOxygenMgL < 6) score += 6;

    // Microplastics (particles proxy)
    if (reading.microplasticsPpm > 25) score += 25;
    else if (reading.microplasticsPpm > 10) score += 12;
    else if (reading.microplasticsPpm > 3) score += 4;

    // Heavy metal index (0-100 composite)
    score += Math.round(reading.heavyMetalIndex * 0.3);

    // Turbidity
    if (reading.turbidityNtu > 20) score += 10;
    else if (reading.turbidityNtu > 10) score += 4;

    // pH deviation from healthy seawater band (7.8 - 8.3)
    const phDeviation = Math.max(0, Math.abs(reading.phLevel - 8.05) - 0.25);
    score += Math.round(phDeviation * 40);

    // Oil slick is the single biggest acute threat.
    if (reading.oilSlickDetected) {
        score += 30 + Math.min(20, reading.oilSlickCoverageKm2 * 4);
    }

    score = clamp(Math.round(score), 0, 100);

    let level, color;
    if (score >= 70) { level = 'Severe'; color = '#7f1d1d'; }
    else if (score >= 45) { level = 'High'; color = '#dc2626'; }
    else if (score >= 20) { level = 'Moderate'; color = '#f59e0b'; }
    else { level = 'Low'; color = '#16a34a'; }

    // Bathing safety is the inverse of threat, further penalized directly by
    // an active oil slick regardless of the composite score.
    let bathingSafetyScore = clamp(100 - score, 0, 100);
    if (reading.oilSlickDetected) bathingSafetyScore = Math.min(bathingSafetyScore, 15);

    let bathingSafetyLabel;
    if (bathingSafetyScore >= 75) bathingSafetyLabel = 'Safe for bathing';
    else if (bathingSafetyScore >= 50) bathingSafetyLabel = 'Caution advised';
    else if (bathingSafetyScore >= 25) bathingSafetyLabel = 'Not recommended';
    else bathingSafetyLabel = 'Unsafe — avoid contact';

    return { level, score, color, bathingSafetyScore, bathingSafetyLabel };
}

/**
 * @typedef {Object} DroneUnit
 * @property {string} id
 * @property {'Sampling Drone'|'Cleanup Vessel'|'Skimmer Drone'} type
 * @property {'Idle'|'Dispatched'|'Sampling'|'Cleaning'|'Returning'|'Charging'} status
 * @property {number} batteryPct
 * @property {string|null} assignedStationId
 * @property {number} etaMinutes
 */

const FLEET_SEED_UNITS = [
    { id: 'AQUA-DRN-01', type: 'Sampling Drone' },
    { id: 'AQUA-DRN-02', type: 'Sampling Drone' },
    { id: 'SKIM-DRN-01', type: 'Skimmer Drone' },
    { id: 'CLEAN-VSL-01', type: 'Cleanup Vessel' },
    { id: 'CLEAN-VSL-02', type: 'Cleanup Vessel' },
];

const STATUS_CYCLE = ['Idle', 'Dispatched', 'Sampling', 'Cleaning', 'Returning', 'Charging'];

/**
 * Simulates the autonomous fleet's current state, auto-dispatching cleanup
 * units to any station currently showing a detected oil slick, and sampling
 * drones to whichever stations have the highest threat score.
 * @param {Array<{stationId:string, station:object}>} telemetry
 * @param {Record<string, ThreatAssessment>} threatByStation
 * @returns {DroneUnit[]}
 */
export function computeFleetStatus(telemetry, threatByStation) {
    const slickStations = telemetry.filter((t) => t.oilSlickDetected);
    const highThreatStations = [...telemetry]
        .sort((a, b) => (threatByStation[b.stationId]?.score ?? 0) - (threatByStation[a.stationId]?.score ?? 0))
        .slice(0, 2);

    return FLEET_SEED_UNITS.map((unit, idx) => {
        const rand = mulberry32(hashSeed(unit.id) ^ Math.floor(Date.now() / (5 * 60 * 1000)));
        const isCleanupUnit = unit.type === 'Cleanup Vessel' || unit.type === 'Skimmer Drone';

        let assignedStation = null;
        let status = 'Idle';

        if (isCleanupUnit && slickStations[idx % Math.max(slickStations.length, 1)] && slickStations.length > 0) {
            assignedStation = slickStations[idx % slickStations.length].station;
            status = rand() > 0.5 ? 'Cleaning' : 'Dispatched';
        } else if (!isCleanupUnit && highThreatStations[idx % highThreatStations.length]) {
            assignedStation = highThreatStations[idx % highThreatStations.length].station;
            status = STATUS_CYCLE[Math.floor(rand() * STATUS_CYCLE.length)];
        } else {
            status = rand() > 0.7 ? 'Charging' : 'Idle';
        }

        return {
            id: unit.id,
            type: unit.type,
            status,
            batteryPct: Math.round(20 + rand() * 80),
            assignedStationId: assignedStation ? assignedStation.id : null,
            assignedStationName: assignedStation ? assignedStation.name : null,
            etaMinutes: status === 'Dispatched' || status === 'Returning' ? Math.round(4 + rand() * 26) : 0,
        };
    });
}