import { eventBus } from "../core/events";

export const ECO_TRIPS_STORAGE_KEY = "pollution-hub-eco-trips";

/** Average distance assumed for a trip when the user doesn't enter one, in km. */
const DEFAULT_TRIP_DISTANCE_KM = 5;

/**
 * Emission-factor constants used to estimate avoided CO2. These are widely-cited
 * approximations (grams CO2 per passenger-km), not precise measurements:
 * - An average petrol car emits roughly 192 g CO2/km.
 * - A bus trip (per passenger) emits roughly 105 g CO2/km, so choosing the bus over
 *   driving avoids the difference (192 - 105 = 87 g/km), not the full 192.
 * - Cycling and walking are treated as fully avoided car emissions (192 g/km) since
 *   they replace a car trip outright with a zero-emission one.
 */
const CAR_EMISSION_G_PER_KM = 192;
const BUS_EMISSION_G_PER_KM = 105;

export const TRIP_TYPES = {
    cycling: {
        id: "cycling",
        label: "Cycling trip",
        icon: "🚲",
        /** @param {number} km */
        co2AvoidedGrams: (km) => km * CAR_EMISSION_G_PER_KM,
    },
    publicTransport: {
        id: "publicTransport",
        label: "Public transport trip",
        icon: "🚌",
        co2AvoidedGrams: (km) => km * (CAR_EMISSION_G_PER_KM - BUS_EMISSION_G_PER_KM),
    },
    carAvoided: {
        id: "carAvoided",
        label: "Car trip avoided",
        icon: "🚗",
        co2AvoidedGrams: (km) => km * CAR_EMISSION_G_PER_KM,
    },
};

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : fallback;
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function persist(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn(`Could not persist ${key}:`, error);
    }
}

/**
 * @typedef {Object} EcoTrip
 * @property {string} id
 * @property {string} type - One of the TRIP_TYPES keys ('cycling', 'publicTransport', 'carAvoided'); validated at runtime in logEcoTrip.
 * @property {number} distanceKm
 * @property {string} timestamp - ISO string.
 */

/** @returns {EcoTrip[]} */
export function readEcoTrips() {
    return readJson(ECO_TRIPS_STORAGE_KEY, []);
}

/**
 * Logs a new eco-friendly trip and emits ECO_TRIP_LOGGED so other features
 * (achievements, daily challenges) can react without this module needing to
 * know about them directly.
 *
 * @param {string} type - One of the TRIP_TYPES keys ('cycling', 'publicTransport', 'carAvoided').
 * @param {number} [distanceKm]
 * @returns {EcoTrip}
 */
export function logEcoTrip(type, distanceKm = DEFAULT_TRIP_DISTANCE_KM) {
    if (!TRIP_TYPES[type]) {
        throw new Error(`Unknown eco trip type: ${type}`);
    }
    const safeDistance = Number.isFinite(distanceKm) && distanceKm > 0 ? distanceKm : DEFAULT_TRIP_DISTANCE_KM;

    const trip = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type,
        distanceKm: safeDistance,
        timestamp: new Date().toISOString(),
    };

    const trips = readEcoTrips();
    trips.push(trip);
    persist(ECO_TRIPS_STORAGE_KEY, trips);

    eventBus.emit("ECO_TRIP_LOGGED", trip);
    return trip;
}

/**
 * @param {EcoTrip[]} trips
 * @param {Date} [referenceDate]
 * @returns {EcoTrip[]} trips whose timestamp falls in the same calendar month/year as referenceDate.
 */
export function filterToCurrentMonth(trips, referenceDate = new Date()) {
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();
    return trips.filter((trip) => {
        const d = new Date(trip.timestamp);
        return d.getFullYear() === year && d.getMonth() === month;
    });
}

/**
 * @typedef {Object} EcoImpactSummary
 * @property {number} cyclingCount
 * @property {number} publicTransportCount
 * @property {number} carAvoidedCount
 * @property {number} totalTrips
 * @property {number} co2AvoidedKg
 * @property {number} carDistanceAvoidedKm
 */

/**
 * Aggregates a set of trips (typically the current month's, via
 * filterToCurrentMonth) into the summary shape the dashboard displays.
 *
 * @param {{ type: string, distanceKm: number }[]} trips
 * @returns {EcoImpactSummary}
 */
export function summarizeEcoImpact(trips) {
    let cyclingCount = 0;
    let publicTransportCount = 0;
    let carAvoidedCount = 0;
    let co2AvoidedGrams = 0;
    let carDistanceAvoidedKm = 0;

    for (const trip of trips) {
        const config = TRIP_TYPES[trip.type];
        if (!config) continue;

        if (trip.type === "cycling") cyclingCount += 1;
        else if (trip.type === "publicTransport") publicTransportCount += 1;
        else if (trip.type === "carAvoided") carAvoidedCount += 1;

        co2AvoidedGrams += config.co2AvoidedGrams(trip.distanceKm);
        // Every logged trip, regardless of type, represents a car trip that didn't
        // happen — cycling/transit/skip all substitute for driving that distance.
        carDistanceAvoidedKm += trip.distanceKm;
    }

    return {
        cyclingCount,
        publicTransportCount,
        carAvoidedCount,
        totalTrips: cyclingCount + publicTransportCount + carAvoidedCount,
        co2AvoidedKg: co2AvoidedGrams / 1000,
        carDistanceAvoidedKm,
    };
}