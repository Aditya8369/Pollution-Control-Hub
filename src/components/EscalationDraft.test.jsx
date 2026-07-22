import { describe, it, expect } from "vitest";
import { buildEscalationDraftText } from "./EscalationDraft";

const hotspot = {
  id: "hotspot-0",
  centerLat: 28.6139,
  centerLon: 77.209,
  reportCount: 4,
  averageSeverity: 2.5,
  reportIds: ["report-a", "report-b", "report-c", "report-d"],
  earliestReportAt: "2026-07-05T00:00:00Z",
  latestReportAt: "2026-07-11T00:00:00Z",
  escalationReady: true,
};

describe("buildEscalationDraftText", () => {
  it("includes the aggregate report count", () => {
    const text = buildEscalationDraftText(hotspot);
    expect(text).toContain("4");
    expect(text).toContain("Independent reports received: 4");
  });

  it("includes the average severity rounded to one decimal", () => {
    const text = buildEscalationDraftText(hotspot);
    expect(text).toContain("2.5");
  });

  it("includes the hotspot coordinates", () => {
    const text = buildEscalationDraftText(hotspot);
    expect(text).toContain("28.6139");
    expect(text).toContain("77.2090");
  });

  it("includes the city name when provided", () => {
    const text = buildEscalationDraftText(hotspot, { cityName: "Delhi" });
    expect(text).toContain("Delhi");
  });

  it("falls back to coordinates only when no city name is given", () => {
    const text = buildEscalationDraftText(hotspot);
    expect(text).toContain("approx. 28.6139, 77.2090");
  });

  it("never includes individual report ids", () => {
    const text = buildEscalationDraftText(hotspot, { cityName: "Delhi" });
    for (const id of hotspot.reportIds) {
      expect(text).not.toContain(id);
    }
  });

  it("explicitly states reporter identities are excluded", () => {
    const text = buildEscalationDraftText(hotspot);
    expect(text.toLowerCase()).toContain("individual reporter");
  });
});
