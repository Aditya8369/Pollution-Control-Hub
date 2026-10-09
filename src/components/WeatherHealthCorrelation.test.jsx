import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WeatherHealthCorrelation from "./WeatherHealthCorrelation";
import {
  mean,
  stddev,
  pearsonCorrelation,
  classifyCorrelation,
  correlationDirection,
  alignDatasets,
  computeCorrelationMatrix,
  computeAqiBandBreakdown,
  generateInsights,
} from "../services/weatherCorrelationService";

// Mock ResizeObserver for Recharts in jsdom
beforeAll(() => {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

// Mock useSWR
vi.mock("../hooks/useSWR", () => ({
  useSWR: (key) => {
    if (!key) return { data: null, error: null };
    if (typeof key === "string" && key.includes("error")) {
      return { data: null, error: new Error("Network error") };
    }
    return { data: mockWeatherData, error: null };
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, optionsOrDefault, maybeOptions) => {
      const hasDefault = typeof optionsOrDefault === "string";
      const defaultValue = hasDefault ? optionsOrDefault : optionsOrDefault?.defaultValue;
      const options = hasDefault ? maybeOptions : optionsOrDefault;
      let text = defaultValue || key;
      if (options?.city) {
        text = text.replace(/\{\{\s*city\s*\}\}/g, options.city);
      }
      return text;
    },
  }),
}));

vi.mock("../services/weatherService", () => ({
  fetchHourlyWeather: vi.fn(async () => mockWeatherData),
}));

const mockWeatherData = [
  { time: "2026-10-09T10:00:00Z", temperature: 25.0, humidity: 60, windSpeed: 3.5 },
  { time: "2026-10-09T11:00:00Z", temperature: 27.0, humidity: 55, windSpeed: 4.0 },
  { time: "2026-10-09T12:00:00Z", temperature: 30.0, humidity: 50, windSpeed: 5.0 },
  { time: "2026-10-09T13:00:00Z", temperature: 32.0, humidity: 45, windSpeed: 6.0 },
];

const mockTrendData = [
  { time: "2026-10-09T10:00:00Z", us_aqi: 45, pm2_5: 12.0, pm10: 25.0, nitrogen_dioxide: 18.0, ozone: 35.0, carbon_monoxide: 0.5 },
  { time: "2026-10-09T11:00:00Z", us_aqi: 80, pm2_5: 26.0, pm10: 55.0, nitrogen_dioxide: 28.0, ozone: 45.0, carbon_monoxide: 0.8 },
  { time: "2026-10-09T12:00:00Z", us_aqi: 120, pm2_5: 43.0, pm10: 85.0, nitrogen_dioxide: 42.0, ozone: 60.0, carbon_monoxide: 1.2 },
  { time: "2026-10-09T13:00:00Z", us_aqi: 160, pm2_5: 72.0, pm10: 130.0, nitrogen_dioxide: 58.0, ozone: 75.0, carbon_monoxide: 1.8 },
];

const defaultProps = {
  lat: 28.6139,
  lon: 77.209,
  trend: mockTrendData,
  cityName: "Delhi",
};

// ---------------------------------------------------------------------------
// Service Unit Tests
// ---------------------------------------------------------------------------

describe("weatherCorrelationService", () => {
  describe("mean", () => {
    it("returns 0 for empty array or invalid inputs", () => {
      expect(mean([])).toBe(0);
      expect(mean(undefined)).toBe(0);
      expect(mean(null)).toBe(0);
    });

    it("computes arithmetic mean for finite numbers", () => {
      expect(mean([2, 4, 6])).toBe(4);
    });

    it("ignores non-finite values (NaN, Infinity)", () => {
      expect(mean([10, NaN, 20])).toBe(15);
      expect(mean([10, Infinity, 30])).toBe(20);
    });
  });

  describe("stddev", () => {
    it("returns 0 for fewer than 2 valid values", () => {
      expect(stddev([5])).toBe(0);
      expect(stddev([])).toBe(0);
      expect(stddev([NaN, 10])).toBe(0);
    });

    it("computes population standard deviation", () => {
      const result = stddev([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result).toBeCloseTo(2.0, 1);
    });
  });

  describe("pearsonCorrelation engine", () => {
    it("returns null for insufficient data points (n < 3)", () => {
      expect(pearsonCorrelation([1, 2], [2, 4])).toBeNull();
      expect(pearsonCorrelation([], [])).toBeNull();
      expect(pearsonCorrelation(null, [1, 2, 3])).toBeNull();
    });

    it("detects perfect positive correlation (+1.0)", () => {
      const x = [10, 20, 30, 40, 50];
      const y = [5, 10, 15, 20, 25];
      expect(pearsonCorrelation(x, y)).toBeCloseTo(1.0, 4);
    });

    it("detects perfect negative correlation (-1.0)", () => {
      const x = [10, 20, 30, 40, 50];
      const y = [50, 40, 30, 20, 10];
      expect(pearsonCorrelation(x, y)).toBeCloseTo(-1.0, 4);
    });

    it("returns ~0 for uncorrelated orthogonal inputs", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [3, 1, 4, 1, 5];
      const r = pearsonCorrelation(x, y);
      expect(r).not.toBeNull();
      expect(Math.abs(r)).toBeLessThan(0.5);
    });

    it("handles constant-valued variables safely without division by zero or NaN", () => {
      const x = [5, 5, 5, 5, 5]; // sx === 0
      const y = [10, 20, 30, 40, 50];
      expect(pearsonCorrelation(x, y)).toBe(0);
    });

    it("filters missing and NaN values within arrays safely", () => {
      const x = [1, 2, NaN, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const r = pearsonCorrelation(x, y);
      expect(r).toBeCloseTo(1.0, 4);
    });
  });

  describe("classifyCorrelation & direction", () => {
    it("classifies strong, moderate, weak, and negligible correlations", () => {
      expect(classifyCorrelation(0.85).label).toBe("Strong");
      expect(classifyCorrelation(-0.55).label).toBe("Moderate");
      expect(classifyCorrelation(0.30).label).toBe("Weak");
      expect(classifyCorrelation(-0.10).label).toBe("Negligible");
    });

    it("handles unavailable correlation values safely", () => {
      const result = classifyCorrelation(null);
      expect(result.label).toBe("Unavailable");
      expect(result.unavailable).toBe(true);
    });

    it("determines correlation direction string", () => {
      expect(correlationDirection(0.5)).toBe("positive");
      expect(correlationDirection(-0.4)).toBe("negative");
      expect(correlationDirection(0.01)).toBe("no");
      expect(correlationDirection(null)).toBe("none");
    });
  });

  describe("alignDatasets", () => {
    it("aligns weather and pollution observations by matching ISO hour stamp", () => {
      const aligned = alignDatasets(mockWeatherData, mockTrendData);
      expect(aligned.length).toBe(4);
      expect(aligned[0].temperature).toBe(25.0);
      expect(aligned[0].pm2_5).toBe(12.0);
    });

    it("filters out unmatched timestamps", () => {
      const unalignedTrend = [
        { time: "2026-10-10T10:00:00Z", us_aqi: 50 }, // Different day
      ];
      const aligned = alignDatasets(mockWeatherData, unalignedTrend);
      expect(aligned.length).toBe(0);
    });
  });

  describe("computeCorrelationMatrix", () => {
    it("computes a 3x5 matrix for 3 weather factors and 5 pollutants", () => {
      const aligned = alignDatasets(mockWeatherData, mockTrendData);
      const { matrix, weatherKeys, pollutantKeys } = computeCorrelationMatrix(aligned);

      expect(weatherKeys.length).toBe(3); // Temperature, Humidity, Wind Speed
      expect(pollutantKeys.length).toBe(5); // PM2.5, PM10, NO2, O3, CO
      expect(matrix.length).toBe(3);
      expect(matrix[0].length).toBe(5);

      // Temperature vs PM2.5 correlation should be strong positive in mock data
      expect(matrix[0][0].r).toBeGreaterThan(0.9);
      expect(matrix[0][0].count).toBe(4);
    });
  });

  describe("computeAqiBandBreakdown", () => {
    it("aggregates weather metric per AQI band", () => {
      const aligned = alignDatasets(mockWeatherData, mockTrendData);
      const breakdown = computeAqiBandBreakdown(aligned, "temperature");

      expect(breakdown.length).toBeGreaterThan(0);
      expect(breakdown[0]).toHaveProperty("name");
      expect(breakdown[0]).toHaveProperty("value");
      expect(breakdown[0]).toHaveProperty("count");
    });
  });

  describe("generateInsights", () => {
    it("generates severity-rated insights for valid data", () => {
      const aligned = alignDatasets(mockWeatherData, mockTrendData);
      const { matrix } = computeCorrelationMatrix(aligned);
      const insights = generateInsights(matrix, aligned.length);

      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toHaveProperty("severity");
      expect(insights[0]).toHaveProperty("title");
      expect(insights[0]).toHaveProperty("description");
    });

    it("generates explicit insufficient data insight when n < MIN_CORRELATION_OBSERVATIONS", () => {
      const insights = generateInsights([], 1);
      expect(insights.length).toBe(1);
      expect(insights[0].severity).toBe("insufficient");
      expect(insights[0].title).toContain("Insufficient Data");
    });
  });
});

// ---------------------------------------------------------------------------
// Component UI Tests
// ---------------------------------------------------------------------------

describe("WeatherHealthCorrelation Component", () => {
  it("renders the main panel title and city subtitle", () => {
    render(<WeatherHealthCorrelation {...defaultProps} />);
    expect(screen.getByTestId("weather-health-correlation")).toBeTruthy();
    expect(screen.getByText(/Weather–Health Correlation Analytics/)).toBeTruthy();
    expect(screen.getByText(/Delhi/)).toBeTruthy();
  });

  it("renders key summary stats cards and data quality badge", () => {
    render(<WeatherHealthCorrelation {...defaultProps} />);
    expect(screen.getByTestId("data-quality-badge")).toBeTruthy();
    expect(screen.getByTestId("stats-row")).toBeTruthy();
    expect(screen.getByText(/Avg Temperature/)).toBeTruthy();
    expect(screen.getByText(/Avg Humidity/)).toBeTruthy();
    expect(screen.getByText(/Avg Wind Speed/)).toBeTruthy();
  });

  it("renders the correlation matrix table with all 15 weather-pollutant pairs", () => {
    render(<WeatherHealthCorrelation {...defaultProps} />);
    expect(screen.getByTestId("correlation-matrix")).toBeTruthy();
    const cells = screen.getAllByTestId("matrix-cell");
    expect(cells.length).toBe(15);
  });

  it("allows selecting different weather factors and pollutant metrics", () => {
    render(<WeatherHealthCorrelation {...defaultProps} />);
    const weatherSelect = screen.getByLabelText(/Weather Variable/);
    const pollutantSelect = screen.getByLabelText(/Pollutant \/ AQI Metric/);

    fireEvent.change(weatherSelect, { target: { value: "humidity" } });
    expect(weatherSelect.value).toBe("humidity");

    fireEvent.change(pollutantSelect, { target: { value: "ozone" } });
    expect(pollutantSelect.value).toBe("ozone");
  });

  it("toggles between scatter plot view and dual-axis trend view", () => {
    render(<WeatherHealthCorrelation {...defaultProps} />);
    const toggleBtn = screen.getByText(/Show Dual-Axis Trend/);
    fireEvent.click(toggleBtn);
    expect(screen.getByText(/Show Scatter Plot/)).toBeTruthy();
  });

  it("renders severity-rated insights section", () => {
    render(<WeatherHealthCorrelation {...defaultProps} />);
    expect(screen.getByTestId("insights-section")).toBeTruthy();
  });

  it("renders empty state when trend data is empty", () => {
    render(<WeatherHealthCorrelation {...defaultProps} trend={[]} />);
    expect(screen.getByText(/Collecting data points…/)).toBeTruthy();
  });
});
