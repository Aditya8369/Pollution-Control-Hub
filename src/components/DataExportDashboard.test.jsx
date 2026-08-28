import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import DataExportDashboard from "./DataExportDashboard";
import {
  trendToCSV,
  trendToJSON,
  generateTextReport,
  generateShareableLink,
  computeSummaryStats,
} from "../services/dataExportService";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => (typeof opts === "string" ? opts : opts?.defaultValue || key),
  }),
}));

// ---------------------------------------------------------------------------
// Service tests
// ---------------------------------------------------------------------------
describe("dataExportService", () => {
  const sampleTrend = [
    { time: "2026-08-28T08:00:00Z", us_aqi: 85, pm2_5: 30, pm10: 50, nitrogen_dioxide: 20, ozone: 35, carbon_monoxide: 0.6 },
    { time: "2026-08-28T09:00:00Z", us_aqi: 92, pm2_5: 35, pm10: 55, nitrogen_dioxide: 22, ozone: 38, carbon_monoxide: 0.7 },
    { time: "2026-08-28T10:00:00Z", us_aqi: 110, pm2_5: 45, pm10: 70, nitrogen_dioxide: 28, ozone: 42, carbon_monoxide: 0.9 },
  ];

  describe("trendToCSV", () => {
    it("produces a CSV with header and data rows", () => {
      const csv = trendToCSV(sampleTrend, "Delhi");
      expect(csv).toContain("# Air Quality Data Export");
      expect(csv).toContain("Timestamp,US AQI");
      expect(csv).toContain("85,30,50,20,35,0.6");
      expect(csv).toContain("Delhi");
    });

    it("handles empty input gracefully", () => {
      const csv = trendToCSV([], "Test");
      expect(csv).toContain("Timestamp,US AQI");
      expect(csv.split("\n").length).toBe(2); // header comment + header row only
    });

    it("handles null input", () => {
      const csv = trendToCSV(null);
      expect(csv).toContain("Timestamp,US AQI");
    });
  });

  describe("trendToJSON", () => {
    it("produces valid JSON with expected structure", () => {
      const json = trendToJSON(sampleTrend, "Mumbai", { lat: 19.07, lon: 72.87 });
      const parsed = JSON.parse(json);
      expect(parsed.exportVersion).toBe("1.0");
      expect(parsed.city).toBe("Mumbai");
      expect(parsed.coordinates.latitude).toBe(19.07);
      expect(parsed.dataPoints.length).toBe(3);
      expect(parsed.dataPoints[0].aqi.us_aqi).toBe(85);
      expect(parsed.metadata.totalDataPoints).toBe(3);
    });

    it("handles missing position", () => {
      const json = trendToJSON(sampleTrend, "Test", null);
      const parsed = JSON.parse(json);
      expect(parsed.coordinates.latitude).toBeNull();
    });
  });

  describe("generateTextReport", () => {
    it("generates a readable report with AQI band", () => {
      const current = { us_aqi: 120, pm2_5: 45, pm10: 70, nitrogen_dioxide: 28, ozone: 42, carbon_monoxide: 0.9 };
      const report = generateTextReport(current, "Delhi", { lat: 28.61, lon: 77.21 });
      expect(report).toContain("AIR QUALITY REPORT");
      expect(report).toContain("DELHI");
      expect(report).toContain("120");
      expect(report).toContain("Unhealthy for Sensitive Groups");
      expect(report).toContain("PM2.5");
      expect(report).toContain("28.61");
    });

    it("returns no-data message for null current", () => {
      expect(generateTextReport(null, "Test")).toBe("No data available.");
    });
  });

  describe("generateShareableLink", () => {
    it("produces a URL with city params", () => {
      const link = generateShareableLink("Chennai", 13.08, 80.27);
      expect(link).toContain("city=Chennai");
      expect(link).toContain("lat=13.08");
      expect(link).toContain("lon=80.27");
    });
  });

  describe("computeSummaryStats", () => {
    it("computes correct stats", () => {
      const stats = computeSummaryStats(sampleTrend);
      expect(stats.count).toBe(3);
      expect(stats.avgAqi).toBeCloseTo(95.67, 0);
      expect(stats.maxAqi).toBe(110);
      expect(stats.minAqi).toBe(85);
      expect(stats.avgPm25).toBeCloseTo(36.67, 0);
    });

    it("returns zeros for empty input", () => {
      const stats = computeSummaryStats([]);
      expect(stats.count).toBe(0);
      expect(stats.avgAqi).toBe(0);
    });

    it("handles null input", () => {
      const stats = computeSummaryStats(null);
      expect(stats.count).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe("DataExportDashboard", () => {
  const sampleTrend = [
    { time: "2026-08-28T08:00:00Z", us_aqi: 85, pm2_5: 30, pm10: 50, nitrogen_dioxide: 20, ozone: 35, carbon_monoxide: 0.6 },
    { time: "2026-08-28T09:00:00Z", us_aqi: 92, pm2_5: 35, pm10: 55, nitrogen_dioxide: 22, ozone: 38, carbon_monoxide: 0.7 },
    { time: "2026-08-28T10:00:00Z", us_aqi: 110, pm2_5: 45, pm10: 70, nitrogen_dioxide: 28, ozone: 42, carbon_monoxide: 0.9 },
  ];

  const current = { us_aqi: 110, pm2_5: 45, pm10: 70, nitrogen_dioxide: 28, ozone: 42, carbon_monoxide: 0.9 };

  const defaultProps = {
    trend: sampleTrend,
    current,
    cityName: "Delhi",
    position: { lat: 28.61, lon: 77.21 },
  };

  it("renders the panel with title", () => {
    render(<DataExportDashboard {...defaultProps} />);
    expect(screen.getByTestId("data-export-dashboard")).toBeTruthy();
    expect(screen.getByText(/Data Export/)).toBeTruthy();
  });

  it("displays stats row", () => {
    render(<DataExportDashboard {...defaultProps} />);
    expect(screen.getByTestId("stats-row")).toBeTruthy();
  });

  it("displays data preview table", () => {
    render(<DataExportDashboard {...defaultProps} />);
    expect(screen.getByTestId("data-preview")).toBeTruthy();
  });

  it("displays shareable link section", () => {
    render(<DataExportDashboard {...defaultProps} />);
    expect(screen.getByTestId("shareable-link-section")).toBeTruthy();
    expect(screen.getByTestId("shareable-link-input")).toBeTruthy();
  });

  it("renders all three export cards", () => {
    render(<DataExportDashboard {...defaultProps} />);
    expect(screen.getByTestId("export-csv")).toBeTruthy();
    expect(screen.getByTestId("export-json")).toBeTruthy();
    expect(screen.getByTestId("export-text")).toBeTruthy();
  });

  it("shows empty state when no data", () => {
    render(<DataExportDashboard trend={[]} current={null} cityName="Test" position={{ lat: 0, lon: 0 }} />);
    expect(screen.getByText(/No data to export/)).toBeTruthy();
  });

  it("shows time range filter", () => {
    render(<DataExportDashboard {...defaultProps} />);
    expect(screen.getByTestId("time-range-select")).toBeTruthy();
  });
});
