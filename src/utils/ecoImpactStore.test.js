import { describe, it, expect, vi, beforeEach } from "vitest";
import {
    logEcoTrip,
    readEcoTrips,
    filterToCurrentMonth,
    summarizeEcoImpact,
    ECO_TRIPS_STORAGE_KEY,
    TRIP_TYPES,
} from "./ecoImpactStore";
import { eventBus } from "../core/events";

beforeEach(() => {
    localStorage.clear();
});

describe("ecoImpactStore - logEcoTrip", () => {
    it("persists a trip and returns it", () => {
        const trip = logEcoTrip("cycling", 8);
        expect(trip.type).toBe("cycling");
        expect(trip.distanceKm).toBe(8);
        expect(trip.id).toBeDefined();
        expect(trip.timestamp).toBeDefined();

        const stored = readEcoTrips();
        expect(stored).toHaveLength(1);
        expect(stored[0].id).toBe(trip.id);
    });

    it("falls back to a default distance when none or an invalid one is given", () => {
        const trip = logEcoTrip("carAvoided", 0);
        expect(trip.distanceKm).toBeGreaterThan(0);

        const trip2 = logEcoTrip("carAvoided", -5);
        expect(trip2.distanceKm).toBeGreaterThan(0);

        const trip3 = logEcoTrip("carAvoided");
        expect(trip3.distanceKm).toBeGreaterThan(0);
    });

    it("throws for an unknown trip type", () => {
        expect(() => logEcoTrip("teleporting", 5)).toThrow();
    });

    it("emits ECO_TRIP_LOGGED with the logged trip", () => {
        const listener = vi.fn();
        eventBus.on("ECO_TRIP_LOGGED", listener);

        const trip = logEcoTrip("publicTransport", 12);

        expect(listener).toHaveBeenCalledWith(expect.objectContaining({ id: trip.id, type: "publicTransport" }));
        eventBus.off("ECO_TRIP_LOGGED", listener);
    });

    it("appends to existing trips rather than overwriting them", () => {
        logEcoTrip("cycling", 5);
        logEcoTrip("publicTransport", 10);
        expect(readEcoTrips()).toHaveLength(2);
    });
});

describe("ecoImpactStore - readEcoTrips", () => {
    it("returns an empty array when nothing has been logged", () => {
        expect(readEcoTrips()).toEqual([]);
    });

    it("returns an empty array for corrupted localStorage data instead of throwing", () => {
        localStorage.setItem(ECO_TRIPS_STORAGE_KEY, "{not valid json");
        expect(readEcoTrips()).toEqual([]);
    });

    it("returns an empty array when the stored value isn't an array", () => {
        localStorage.setItem(ECO_TRIPS_STORAGE_KEY, JSON.stringify({ not: "an array" }));
        expect(readEcoTrips()).toEqual([]);
    });
});

describe("ecoImpactStore - filterToCurrentMonth", () => {
    it("keeps only trips within the given reference month/year", () => {
        const trips = [
            { id: "1", type: "cycling", distanceKm: 5, timestamp: "2026-03-15T10:00:00.000Z" },
            { id: "2", type: "cycling", distanceKm: 5, timestamp: "2026-02-28T10:00:00.000Z" },
            { id: "3", type: "cycling", distanceKm: 5, timestamp: "2026-03-01T00:00:00.000Z" },
        ];
        const result = filterToCurrentMonth(trips, new Date("2026-03-20T00:00:00.000Z"));
        expect(result.map((t) => t.id)).toEqual(["1", "3"]);
    });

    it("returns an empty array when no trips fall in the reference month", () => {
        const trips = [{ id: "1", type: "cycling", distanceKm: 5, timestamp: "2025-01-01T00:00:00.000Z" }];
        expect(filterToCurrentMonth(trips, new Date("2026-03-20T00:00:00.000Z"))).toEqual([]);
    });
});

describe("ecoImpactStore - summarizeEcoImpact", () => {
    it("returns all-zero stats for an empty trip list", () => {
        const summary = summarizeEcoImpact([]);
        expect(summary).toEqual({
            cyclingCount: 0,
            publicTransportCount: 0,
            carAvoidedCount: 0,
            totalTrips: 0,
            co2AvoidedKg: 0,
            carDistanceAvoidedKm: 0,
        });
    });

    it("counts trips by type correctly", () => {
        const trips = [
            { type: "cycling", distanceKm: 5 },
            { type: "cycling", distanceKm: 3 },
            { type: "publicTransport", distanceKm: 10 },
            { type: "carAvoided", distanceKm: 2 },
        ];
        const summary = summarizeEcoImpact(trips);
        expect(summary.cyclingCount).toBe(2);
        expect(summary.publicTransportCount).toBe(1);
        expect(summary.carAvoidedCount).toBe(1);
        expect(summary.totalTrips).toBe(4);
    });

    it("sums total distance as car-distance-avoided regardless of trip type", () => {
        const trips = [
            { type: "cycling", distanceKm: 5 },
            { type: "publicTransport", distanceKm: 10 },
            { type: "carAvoided", distanceKm: 2 },
        ];
        const summary = summarizeEcoImpact(trips);
        expect(summary.carDistanceAvoidedKm).toBe(17);
    });

    it("computes CO2 avoided using the full car emission factor for cycling and car-avoided trips", () => {
        const summary = summarizeEcoImpact([{ type: "cycling", distanceKm: 10 }]);
        // 10km * 192 g/km = 1920g = 1.92kg
        expect(summary.co2AvoidedKg).toBeCloseTo(1.92, 2);
    });

    it("computes CO2 avoided using the reduced (car minus bus) factor for public transport trips", () => {
        const summary = summarizeEcoImpact([{ type: "publicTransport", distanceKm: 10 }]);
        // 10km * (192 - 105) g/km = 870g = 0.87kg
        expect(summary.co2AvoidedKg).toBeCloseTo(0.87, 2);
    });

    it("ignores trips with an unrecognized type instead of throwing", () => {
        const summary = summarizeEcoImpact([{ type: "teleporting", distanceKm: 100 }]);
        expect(summary.totalTrips).toBe(0);
        expect(summary.co2AvoidedKg).toBe(0);
    });
});

describe("ecoImpactStore - TRIP_TYPES", () => {
    it("exposes exactly the three trip types the feature spec calls for", () => {
        expect(Object.keys(TRIP_TYPES).sort()).toEqual(["carAvoided", "cycling", "publicTransport"].sort());
    });
});