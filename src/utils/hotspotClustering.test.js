import { describe, it, expect } from "vitest";
import { clusterReports, haversineDistanceMeters } from "./hotspotClustering";

const DELHI = { lat: 28.6139, lon: 77.209 };
// ~110m north of DELHI - well within a 500m radius
const DELHI_NEARBY = { lat: 28.6149, lon: 77.209 };
// Mumbai - far outside any reasonable radius
const MUMBAI = { lat: 19.076, lon: 72.8777 };

function makeReport(overrides = {}) {
  return {
    id: "id-" + Math.random(),
    title: "Issue",
    description: "desc",
    votes: 0,
    status: "Pending",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("haversineDistanceMeters", () => {
  it("returns ~0 for identical points", () => {
    expect(haversineDistanceMeters(DELHI, DELHI)).toBeCloseTo(0, 1);
  });

  it("returns a large distance between Delhi and Mumbai (~1150km)", () => {
    const d = haversineDistanceMeters(DELHI, MUMBAI);
    expect(d).toBeGreaterThan(1_000_000);
    expect(d).toBeLessThan(1_300_000);
  });
});

describe("clusterReports", () => {
  it("groups nearby, recent reports into a single hotspot", () => {
    const now = new Date("2026-07-12T00:00:00Z");
    const reports = [
      makeReport({ id: "a", lat: DELHI.lat, lon: DELHI.lon, createdAt: "2026-07-10T00:00:00Z" }),
      makeReport({ id: "b", lat: DELHI_NEARBY.lat, lon: DELHI_NEARBY.lon, createdAt: "2026-07-11T00:00:00Z" }),
    ];

    const { hotspots } = clusterReports(reports, { now, radiusMeters: 500, windowDays: 7 });

    expect(hotspots).toHaveLength(1);
    expect(hotspots[0].reportCount).toBe(2);
    expect(hotspots[0].reportIds.sort()).toEqual(["a", "b"]);
  });

  it("keeps geographically distant reports as separate hotspots", () => {
    const now = new Date("2026-07-12T00:00:00Z");
    const reports = [
      makeReport({ id: "a", lat: DELHI.lat, lon: DELHI.lon, createdAt: "2026-07-10T00:00:00Z" }),
      makeReport({ id: "b", lat: MUMBAI.lat, lon: MUMBAI.lon, createdAt: "2026-07-11T00:00:00Z" }),
    ];

    const { hotspots } = clusterReports(reports, { now, radiusMeters: 500, windowDays: 7 });

    expect(hotspots).toHaveLength(2);
    expect(hotspots.map((h) => h.reportCount)).toEqual([1, 1]);
  });

  it("excludes reports older than the time window", () => {
    const now = new Date("2026-07-12T00:00:00Z");
    const reports = [
      makeReport({ id: "old", lat: DELHI.lat, lon: DELHI.lon, createdAt: "2026-06-01T00:00:00Z" }),
      makeReport({ id: "new", lat: DELHI.lat, lon: DELHI.lon, createdAt: "2026-07-11T00:00:00Z" }),
    ];

    const { hotspots, skipped } = clusterReports(reports, { now, windowDays: 7 });

    expect(hotspots).toHaveLength(1);
    expect(hotspots[0].reportIds).toEqual(["new"]);
    expect(skipped.map((r) => r.id)).toEqual(["old"]);
  });

  it("skips reports missing lat/lon rather than crashing", () => {
    const now = new Date("2026-07-12T00:00:00Z");
    const reports = [
      makeReport({ id: "no-geo", createdAt: "2026-07-11T00:00:00Z" }), // no lat/lon
      makeReport({ id: "geo", lat: DELHI.lat, lon: DELHI.lon, createdAt: "2026-07-11T00:00:00Z" }),
    ];

    const { hotspots, skipped } = clusterReports(reports, { now });

    expect(hotspots).toHaveLength(1);
    expect(hotspots[0].reportIds).toEqual(["geo"]);
    expect(skipped.map((r) => r.id)).toEqual(["no-geo"]);
  });

  it("marks escalationReady once a hotspot crosses the threshold", () => {
    const now = new Date("2026-07-12T00:00:00Z");
    const reports = ["a", "b", "c"].map((id) =>
      makeReport({ id, lat: DELHI.lat, lon: DELHI.lon, createdAt: "2026-07-11T00:00:00Z" })
    );

    const { hotspots } = clusterReports(reports, { now, escalationThreshold: 3 });

    expect(hotspots[0].escalationReady).toBe(true);
  });

  it("does not mark escalationReady below the threshold", () => {
    const now = new Date("2026-07-12T00:00:00Z");
    const reports = ["a", "b"].map((id) =>
      makeReport({ id, lat: DELHI.lat, lon: DELHI.lon, createdAt: "2026-07-11T00:00:00Z" })
    );

    const { hotspots } = clusterReports(reports, { now, escalationThreshold: 3 });

    expect(hotspots[0].escalationReady).toBe(false);
  });

  it("computes averageSeverity as the mean vote count of member reports", () => {
    const now = new Date("2026-07-12T00:00:00Z");
    const reports = [
      makeReport({ id: "a", lat: DELHI.lat, lon: DELHI.lon, votes: 2, createdAt: "2026-07-11T00:00:00Z" }),
      makeReport({ id: "b", lat: DELHI.lat, lon: DELHI.lon, votes: 4, createdAt: "2026-07-11T00:00:00Z" }),
    ];

    const { hotspots } = clusterReports(reports, { now });

    expect(hotspots[0].averageSeverity).toBe(3);
  });

  it("returns no hotspots for an empty report list", () => {
    const { hotspots, skipped } = clusterReports([], { now: new Date() });
    expect(hotspots).toEqual([]);
    expect(skipped).toEqual([]);
  });
});
