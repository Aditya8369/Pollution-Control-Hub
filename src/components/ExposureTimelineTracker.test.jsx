import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import ExposureTimelineTracker from "./ExposureTimelineTracker";
import {
  readExposureHistory,
  writeExposureHistory,
  recordExposure,
  computeDailySummaries,
  computeWeeklySummaries,
  computeHealthScore,
  generateRecommendations,
  getRiskMeta,
  exposureToCSV,
  clearExposureHistory,
} from "../services/exposureTimelineService";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => (typeof opts === "string" ? opts : opts?.defaultValue || key),
  }),
}));

vi.mock("../services/dataExportService", () => ({
  triggerDownload: vi.fn(),
  copyToClipboard: vi.fn(async () => true),
}));

// ---------------------------------------------------------------------------
// Service tests
// ---------------------------------------------------------------------------
describe("exposureTimelineService", () => {
  const mockHistory = [
    { date: "2026-08-25", hour: 8, aqi: 80, city: "Delhi", timestamp: 1724568000000 },
    { date: "2026-08-25", hour: 12, aqi: 120, city: "Delhi", timestamp: 1724582400000 },
    { date: "2026-08-25", hour: 18, aqi: 95, city: "Delhi", timestamp: 1724600800000 },
    { date: "2026-08-26", hour: 8, aqi: 110, city: "Delhi", timestamp: 1724654400000 },
    { date: "2026-08-26", hour: 14, aqi: 140, city: "Delhi", timestamp: 1724676000000 },
    { date: "2026-08-27", hour: 10, aqi: 60, city: "Delhi", timestamp: 1724748000000 },
  ];

  describe("computeDailySummaries", () => {
    it("groups by date and computes averages", () => {
      const summaries = computeDailySummaries(mockHistory);
      expect(summaries.length).toBe(3);
      const aug25 = summaries.find((s) => s.date === "2026-08-25");
      expect(aug25.hours).toBe(3);
      expect(aug25.avgAqi).toBeCloseTo(98.33, 0);
      expect(aug25.maxAqi).toBe(120);
      expect(aug25.minAqi).toBe(80);
    });

    it("returns empty for empty input", () => {
      expect(computeDailySummaries([])).toEqual([]);
    });

    it("handles null input", () => {
      expect(computeDailySummaries(null)).toEqual([]);
    });
  });

  describe("computeWeeklySummaries", () => {
    it("groups by week and computes totals", () => {
      const summaries = computeWeeklySummaries(mockHistory);
      expect(summaries.length).toBeGreaterThanOrEqual(1);
      expect(summaries[0].totalHours).toBeGreaterThan(0);
      expect(typeof summaries[0].riskLevel).toBe("string");
    });
  });

  describe("computeHealthScore", () => {
    it("returns 100 for empty history", () => {
      const result = computeHealthScore([]);
      expect(result.score).toBe(100);
    });

    it("returns lower score for high AQI history", () => {
      const highAqiHistory = Array.from({ length: 14 }, (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, "0")}`,
        hour: 10,
        aqi: 180,
        city: "Delhi",
      }));
      const result = computeHealthScore(highAqiHistory);
      expect(result.score).toBeLessThan(50);
    });

    it("returns high score for low AQI history", () => {
      const lowAqiHistory = Array.from({ length: 14 }, (_, i) => ({
        date: `2026-08-${String(i + 1).padStart(2, "0")}`,
        hour: 10,
        aqi: 30,
        city: "Delhi",
      }));
      const result = computeHealthScore(lowAqiHistory);
      expect(result.score).toBeGreaterThanOrEqual(80);
    });
  });

  describe("generateRecommendations", () => {
    it("returns recommendations array", () => {
      const recs = generateRecommendations(mockHistory);
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0]).toHaveProperty("title");
      expect(recs[0]).toHaveProperty("description");
      expect(recs[0]).toHaveProperty("priority");
      expect(recs[0]).toHaveProperty("icon");
    });

    it("suggests building profile for few data points", () => {
      const recs = generateRecommendations([{ date: "2026-08-28", hour: 10, aqi: 50, city: "A" }]);
      expect(recs.some((r) => r.title.includes("Build"))).toBe(true);
    });

    it("flags consecutive high exposure days", () => {
      const highDays = [];
      for (let d = 25; d <= 28; d++) {
        for (let h = 8; h <= 20; h += 4) {
          highDays.push({ date: `2026-08-${d}`, hour: h, aqi: 170, city: "Delhi" });
        }
      }
      const recs = generateRecommendations(highDays);
      expect(recs.some((r) => r.title.includes("Extended"))).toBe(true);
    });
  });

  describe("getRiskMeta", () => {
    it("returns metadata for all risk levels", () => {
      expect(getRiskMeta("low").emoji).toBe("🟢");
      expect(getRiskMeta("moderate").emoji).toBe("🟡");
      expect(getRiskMeta("high").emoji).toBe("🟠");
      expect(getRiskMeta("critical").emoji).toBe("🔴");
      expect(getRiskMeta("unknown").emoji).toBe("⚪");
    });
  });

  describe("exposureToCSV", () => {
    it("produces valid CSV", () => {
      const csv = exposureToCSV(mockHistory);
      expect(csv).toContain("Date,Hour,AQI,City,Timestamp");
      expect(csv).toContain("Delhi");
      expect(csv.split("\n").length).toBe(mockHistory.length + 2); // header comment + header + rows
    });

    it("handles empty input", () => {
      const csv = exposureToCSV([]);
      expect(csv).toContain("Date,Hour,AQI,City,Timestamp");
    });
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe("ExposureTimelineTracker", () => {
  it("renders panel with title", () => {
    render(<ExposureTimelineTracker current={{ us_aqi: 80 }} cityName="Delhi" />);
    expect(screen.getByTestId("exposure-timeline-tracker")).toBeTruthy();
    expect(screen.getByText(/Exposure Timeline/)).toBeTruthy();
  });

  it("displays health score section", () => {
    render(<ExposureTimelineTracker current={{ us_aqi: 80 }} cityName="Delhi" />);
    expect(screen.getByTestId("health-score")).toBeTruthy();
  });

  it("displays stats row", () => {
    render(<ExposureTimelineTracker current={{ us_aqi: 80 }} cityName="Delhi" />);
    expect(screen.getByTestId("stats-row")).toBeTruthy();
  });

  it("displays action buttons", () => {
    render(<ExposureTimelineTracker current={{ us_aqi: 80 }} cityName="Delhi" />);
    expect(screen.getByTestId("export-btn")).toBeTruthy();
    expect(screen.getByTestId("copy-btn")).toBeTruthy();
    expect(screen.getByTestId("clear-btn")).toBeTruthy();
  });

  it("shows empty state when no data", () => {
    // Mock localStorage to return empty
    const orig = window.localStorage.getItem;
    window.localStorage.getItem = () => null;
    render(<ExposureTimelineTracker current={null} cityName="Delhi" />);
    expect(screen.getByText(/No exposure data yet/)).toBeTruthy();
    window.localStorage.getItem = orig;
  });
});
