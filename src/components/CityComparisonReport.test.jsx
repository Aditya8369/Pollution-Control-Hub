import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import CityComparisonReport from "./CityComparisonReport";
import {
  getAQIBand,
  rankCities,
  computeDifferential,
  categoriseByRisk,
  comparePollutants,
  comparisonToCSV,
  generateComparisonSummary,
} from "../services/cityComparisonReportService";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => (typeof opts === "string" ? opts : opts?.defaultValue || key),
  }),
}));

vi.mock("../hooks/useSWR", () => ({
  useSWR: () => ({ data: null, error: null, isValidating: false, mutate: vi.fn() }),
}));

vi.mock("../services/airQualityService", () => ({
  fetchCityComparisons: vi.fn(async () => []),
}));

vi.mock("../services/dataExportService", () => ({
  triggerDownload: vi.fn(),
  copyToClipboard: vi.fn(async () => true),
}));

// ---------------------------------------------------------------------------
// Service tests
// ---------------------------------------------------------------------------
describe("cityComparisonReportService", () => {
  describe("getAQIBand", () => {
    it("returns Good for AQI ≤ 50", () => {
      expect(getAQIBand(25).label).toBe("Good");
      expect(getAQIBand(25).color).toBe("#22c55e");
    });

    it("returns Moderate for 51–100", () => {
      expect(getAQIBand(75).label).toBe("Moderate");
    });

    it("returns USG for 101–150", () => {
      expect(getAQIBand(125).label).toBe("Unhealthy for Sensitive Groups");
    });

    it("returns Unhealthy for 151–200", () => {
      expect(getAQIBand(175).label).toBe("Unhealthy");
    });

    it("returns Very Unhealthy for 201–300", () => {
      expect(getAQIBand(250).label).toBe("Very Unhealthy");
    });

    it("returns Hazardous for 301+", () => {
      expect(getAQIBand(400).label).toBe("Hazardous");
    });

    it("returns Unknown for null", () => {
      expect(getAQIBand(null).label).toBe("Unknown");
    });
  });

  describe("rankCities", () => {
    it("ranks cities by AQI ascending", () => {
      const cities = [
        { name: "Delhi", aqi: 150 },
        { name: "Mumbai", aqi: 80 },
        { name: "Chennai", aqi: 120 },
      ];
      const ranked = rankCities(cities);
      expect(ranked.length).toBe(3);
      expect(ranked[0].name).toBe("Mumbai");
      expect(ranked[0].rank).toBe(1);
      expect(ranked[1].name).toBe("Chennai");
      expect(ranked[2].name).toBe("Delhi");
    });

    it("filters out cities with null AQI", () => {
      const cities = [
        { name: "A", aqi: 100 },
        { name: "B", aqi: null },
        { name: "C", aqi: 50 },
      ];
      const ranked = rankCities(cities);
      expect(ranked.length).toBe(2);
      expect(ranked[0].name).toBe("C");
    });

    it("returns empty for empty input", () => {
      expect(rankCities([])).toEqual([]);
      expect(rankCities(null)).toEqual([]);
    });
  });

  describe("computeDifferential", () => {
    it("computes positive differential", () => {
      const result = computeDifferential(
        { name: "Delhi", aqi: 150 },
        { name: "Mumbai", aqi: 80 },
      );
      expect(result.diff).toBe(70);
      expect(result.worseCity).toBe("Delhi");
      expect(result.summary).toContain("higher");
    });

    it("computes negative differential", () => {
      const result = computeDifferential(
        { name: "Mumbai", aqi: 80 },
        { name: "Delhi", aqi: 150 },
      );
      expect(result.diff).toBe(-70);
      expect(result.worseCity).toBe("Delhi");
    });

    it("handles identical AQI", () => {
      const result = computeDifferential(
        { name: "A", aqi: 100 },
        { name: "B", aqi: 100 },
      );
      expect(result.diff).toBe(0);
      expect(result.worseCity).toBeNull();
    });

    it("handles null AQI", () => {
      const result = computeDifferential(
        { name: "A", aqi: null },
        { name: "B", aqi: 100 },
      );
      expect(result.worseCity).toBe("B");
    });
  });

  describe("categoriseByRisk", () => {
    it("categorises cities correctly", () => {
      const cities = [
        { name: "A", aqi: 50 },
        { name: "B", aqi: 120 },
        { name: "C", aqi: 175 },
        { name: "D", aqi: 250 },
      ];
      const groups = categoriseByRisk(cities);
      expect(groups.safe).toEqual(["A"]);
      expect(groups.moderate).toEqual(["B"]);
      expect(groups.unhealthy).toEqual(["C"]);
      expect(groups.critical).toEqual(["D"]);
    });
  });

  describe("comparePollutants", () => {
    it("returns pollutant breakdown with readings", () => {
      const cities = [
        { name: "A", pm2_5: 20, pm10: 40, no2: 30, o3: 80, co: 1.5 },
        { name: "B", pm2_5: 50, pm10: 60, no2: 15, o3: 90, co: 0.8 },
      ];
      const result = comparePollutants(cities);
      expect(result.length).toBe(5);
      const pm25 = result.find((p) => p.key === "pm2_5");
      expect(pm25.readings.length).toBe(2);
      expect(pm25.average).toBe(35);
      expect(pm25.citiesExceedingLimit).toContain("B"); // 50 > 15
    });
  });

  describe("comparisonToCSV", () => {
    it("generates valid CSV", () => {
      const ranked = [
        { rank: 1, name: "A", aqi: 50, band: { label: "Good" }, risk: "low", pm2_5: 10, pm10: 20, no2: 15, o3: 30, co: 0.5, relativeDiff: "0.0" },
        { rank: 2, name: "B", aqi: 100, band: { label: "Moderate" }, risk: "low", pm2_5: 30, pm10: 50, no2: 25, o3: 40, co: 0.8, relativeDiff: "100.0" },
      ];
      const csv = comparisonToCSV(ranked);
      expect(csv).toContain("Rank,City,US AQI");
      expect(csv).toContain('"A"');
      expect(csv).toContain('"B"');
    });
  });

  describe("generateComparisonSummary", () => {
    it("generates readable summary", () => {
      const ranked = [
        { rank: 1, name: "Mumbai", aqi: 60, band: { label: "Moderate" }, relativeDiff: "0.0" },
        { rank: 2, name: "Delhi", aqi: 150, band: { label: "Unhealthy for Sensitive Groups" }, relativeDiff: "150.0" },
      ];
      const summary = generateComparisonSummary(ranked);
      expect(summary).toContain("MULTI-CITY AIR QUALITY COMPARISON");
      expect(summary).toContain("Mumbai");
      expect(summary).toContain("Delhi");
      expect(summary).toContain("🥇");
    });

    it("returns message for empty input", () => {
      expect(generateComparisonSummary([])).toBe("No cities to compare.");
    });
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe("CityComparisonReport", () => {
  it("renders empty state when no saved locations", () => {
    render(<CityComparisonReport savedLocations={[]} cityName="Delhi" />);
    expect(screen.getByTestId("city-comparison-report")).toBeTruthy();
    expect(screen.getByText(/No saved cities yet/)).toBeTruthy();
  });

  it("renders panel with title when cities are saved", () => {
    const locations = [
      { name: "Mumbai", lat: 19.07, lon: 72.87 },
      { name: "Chennai", lat: 13.08, lon: 80.27 },
    ];
    render(<CityComparisonReport savedLocations={locations} cityName="Delhi" />);
    expect(screen.getByTestId("city-comparison-report")).toBeTruthy();
    expect(screen.getByText(/City Comparison Report/)).toBeTruthy();
  });

  it("displays ranking section", () => {
    const locations = [{ name: "Mumbai", lat: 19.07, lon: 72.87 }];
    render(<CityComparisonReport savedLocations={locations} cityName="Delhi" />);
    expect(screen.getByTestId("ranking-section")).toBeTruthy();
  });

  it("displays risk section", () => {
    const locations = [{ name: "Mumbai", lat: 19.07, lon: 72.87 }];
    render(<CityComparisonReport savedLocations={locations} cityName="Delhi" />);
    expect(screen.getByTestId("risk-section")).toBeTruthy();
  });

  it("displays action buttons", () => {
    const locations = [{ name: "Mumbai", lat: 19.07, lon: 72.87 }];
    render(<CityComparisonReport savedLocations={locations} cityName="Delhi" />);
    expect(screen.getByTestId("export-csv-btn")).toBeTruthy();
    expect(screen.getByTestId("copy-report-btn")).toBeTruthy();
  });
});
