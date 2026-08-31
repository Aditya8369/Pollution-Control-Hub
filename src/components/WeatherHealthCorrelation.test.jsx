import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import WeatherHealthCorrelation from "./WeatherHealthCorrelation";
import {
  mean,
  stddev,
  pearsonCorrelation,
  classifyCorrelation,
  correlationDirection,
  alignDatasets,
  computeCorrelationMatrix,
  prepareScatterData,
  prepareDualAxisData,
  generateInsights,
  aqiColor,
  aqiBandLabel,
  WEATHER_VARIABLES,
  AQI_VARIABLES,
} from "../services/weatherCorrelationService";

// ---------------------------------------------------------------------------
// Mock useSWR to avoid cacheStore
// ---------------------------------------------------------------------------
vi.mock("../hooks/useSWR", () => ({
  useSWR: (key, fetcher) => {
    const [data] = require("react").useState(null);
    return { data, error: null, isValidating: false, mutate: vi.fn() };
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) =>
      typeof opts === "string"
        ? opts
        : opts?.defaultValue || key,
  }),
}));

vi.mock("../services/weatherService", () => ({
  fetchHourlyWeather: vi.fn(async () => []),
}));

// ---------------------------------------------------------------------------
// Service unit tests
// ---------------------------------------------------------------------------
describe("weatherCorrelationService", () => {
  describe("mean", () => {
    it("returns 0 for empty array", () => {
      expect(mean([])).toBe(0);
    });

    it("returns 0 for undefined input", () => {
      expect(mean(undefined)).toBe(0);
    });

    it("computes arithmetic mean", () => {
      expect(mean([2, 4, 6])).toBe(4);
    });

    it("ignores non-finite values", () => {
      expect(mean([10, NaN, 20])).toBe(15);
    });
  });

  describe("stddev", () => {
    it("returns 0 for fewer than 2 values", () => {
      expect(stddev([5])).toBe(0);
      expect(stddev([])).toBe(0);
    });

    it("computes sample standard deviation", () => {
      const result = stddev([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(result).toBeCloseTo(2.0, 1);
    });
  });

  describe("pearsonCorrelation", () => {
    it("returns 0 for insufficient data", () => {
      expect(pearsonCorrelation([1], [2])).toBe(0);
      expect(pearsonCorrelation([], [])).toBe(0);
    });

    it("detects perfect positive correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [2, 4, 6, 8, 10];
      expect(pearsonCorrelation(x, y)).toBeCloseTo(1.0, 4);
    });

    it("detects perfect negative correlation", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [10, 8, 6, 4, 2];
      expect(pearsonCorrelation(x, y)).toBeCloseTo(-1.0, 4);
    });

    it("returns ~0 for uncorrelated data", () => {
      const x = [1, 2, 3, 4, 5];
      const y = [3, 1, 4, 1, 5];
      const r = pearsonCorrelation(x, y);
      expect(Math.abs(r)).toBeLessThan(0.5);
    });

    it("handles NaN values in input", () => {
      const x = [1, 2, NaN, 4, 5];
      const y = [2, 4, 6, 8, 10];
      const r = pearsonCorrelation(x, y);
      expect(typeof r).toBe("number");
      expect(Number.isFinite(r)).toBe(true);
    });
  });

  describe("classifyCorrelation", () => {
    it("returns Strong for |r| >= 0.7", () => {
      expect(classifyCorrelation(0.8).label).toBe("Strong");
      expect(classifyCorrelation(-0.9).label).toBe("Strong");
    });

    it("returns Moderate for 0.4 <= |r| < 0.7", () => {
      expect(classifyCorrelation(0.5).label).toBe("Moderate");
    });

    it("returns Weak for 0.2 <= |r| < 0.4", () => {
      expect(classifyCorrelation(0.3).label).toBe("Weak");
    });

    it("returns Negligible for |r| < 0.2", () => {
      expect(classifyCorrelation(0.1).label).toBe("Negligible");
    });
  });

  describe("correlationDirection", () => {
    it("returns positive for positive r", () => {
      expect(correlationDirection(0.5)).toBe("positive");
    });

    it("returns negative for negative r", () => {
      expect(correlationDirection(-0.5)).toBe("negative");
    });

    it("returns no for near-zero r", () => {
      expect(correlationDirection(0.01)).toBe("no");
    });
  });

  describe("alignDatasets", () => {
    it("returns empty for invalid inputs", () => {
      expect(alignDatasets(null, null)).toEqual([]);
      expect(alignDatasets([], [])).toEqual([]);
    });

    it("aligns weather and AQI data by hour", () => {
      const weather = [
        { time: "2026-08-28T10:00:00Z", temperature: 25, humidity: 60, windSpeed: 3 },
        { time: "2026-08-28T13:00:00Z", temperature: 28, humidity: 55, windSpeed: 4 },
      ];
      const trend = [
        { time: "2026-08-28T10:00:00Z", us_aqi: 85, pm2_5: 30 },
        { time: "2026-08-28T11:00:00Z", us_aqi: 90, pm2_5: 35 },
        { time: "2026-08-28T13:00:00Z", us_aqi: 110, pm2_5: 45 },
      ];
      const result = alignDatasets(weather, trend);
      expect(result.length).toBe(2);
      expect(result[0].temperature).toBe(25);
      expect(result[0].us_aqi).toBe(85);
      expect(result[1].temperature).toBe(28);
      expect(result[1].us_aqi).toBe(110);
    });
  });

  describe("computeCorrelationMatrix", () => {
    it("returns correct shape", () => {
      const data = [
        { temperature: 20, humidity: 60, windSpeed: 3, us_aqi: 50, pm2_5: 20, pm10: 40, nitrogen_dioxide: 25, ozone: 30, carbon_monoxide: 0.5 },
        { temperature: 25, humidity: 55, windSpeed: 4, us_aqi: 80, pm2_5: 35, pm10: 55, nitrogen_dioxide: 30, ozone: 35, carbon_monoxide: 0.7 },
        { temperature: 30, humidity: 50, windSpeed: 5, us_aqi: 120, pm2_5: 50, pm10: 70, nitrogen_dioxide: 40, ozone: 45, carbon_monoxide: 1.0 },
        { temperature: 35, humidity: 45, windSpeed: 2, us_aqi: 160, pm2_5: 65, pm10: 85, nitrogen_dioxide: 50, ozone: 55, carbon_monoxide: 1.2 },
      ];
      const { matrix, weatherKeys, aqiKeys } = computeCorrelationMatrix(data);
      expect(weatherKeys.length).toBe(WEATHER_VARIABLES.length);
      expect(aqiKeys.length).toBe(AQI_VARIABLES.length);
      expect(matrix.length).toBe(WEATHER_VARIABLES.length);
      expect(matrix[0].length).toBe(AQI_VARIABLES.length);
      // Temperature should positively correlate with AQI in this dataset
      expect(matrix[0][0].r).toBeGreaterThan(0.5);
    });
  });

  describe("prepareScatterData", () => {
    it("returns scatter points with valid pairs", () => {
      const data = [
        { temperature: 20, us_aqi: 50, time: "2026-08-28T10:00:00Z" },
        { temperature: null, us_aqi: 60, time: "2026-08-28T11:00:00Z" },
        { temperature: 25, us_aqi: 80, time: "2026-08-28T12:00:00Z" },
      ];
      const result = prepareScatterData(data, "temperature", "us_aqi");
      expect(result.length).toBe(2);
      expect(result[0].x).toBe(20);
      expect(result[0].y).toBe(50);
    });
  });

  describe("prepareDualAxisData", () => {
    it("returns formatted dual-axis data", () => {
      const data = [
        { temperature: 20, us_aqi: 50, time: "2026-08-28T10:00:00Z" },
        { temperature: 25, us_aqi: 80, time: "2026-08-28T11:00:00Z" },
      ];
      const result = prepareDualAxisData(data, "temperature", "us_aqi");
      expect(result.length).toBe(2);
      expect(result[0].weather).toBe(20);
      expect(result[0].aqi).toBe(50);
      expect(typeof result[0].timeLabel).toBe("string");
    });
  });

  describe("generateInsights", () => {
    it("returns array of insight objects", () => {
      const matrix = Array.from({ length: 3 }, () =>
        Array.from({ length: 6 }, (_, i) => ({ r: i === 0 ? 0.8 : 0.1 })),
      );
      const insights = generateInsights(matrix);
      expect(Array.isArray(insights)).toBe(true);
      expect(insights.length).toBeGreaterThan(0);
      expect(insights[0]).toHaveProperty("title");
      expect(insights[0]).toHaveProperty("description");
      expect(insights[0]).toHaveProperty("severity");
      expect(insights[0]).toHaveProperty("icon");
    });

    it("returns empty for all-zero matrix", () => {
      const matrix = Array.from({ length: 3 }, () =>
        Array.from({ length: 6 }, () => ({ r: 0 })),
      );
      const insights = generateInsights(matrix);
      expect(insights).toEqual([]);
    });
  });

  describe("aqiColor", () => {
    it("returns green for good AQI", () => {
      expect(aqiColor(25)).toBe("#22c55e");
    });

    it("returns red for unhealthy AQI", () => {
      expect(aqiColor(175)).toBe("#ef4444");
    });

    it("returns gray for null", () => {
      expect(aqiColor(null)).toBe("#94a3b8");
    });
  });

  describe("aqiBandLabel", () => {
    it("returns correct labels", () => {
      expect(aqiBandLabel(25)).toBe("Good");
      expect(aqiBandLabel(75)).toBe("Moderate");
      expect(aqiBandLabel(125)).toBe("Unhealthy for Sensitive Groups");
      expect(aqiBandLabel(175)).toBe("Unhealthy");
      expect(aqiBandLabel(250)).toBe("Very Unhealthy");
      expect(aqiBandLabel(400)).toBe("Hazardous");
      expect(aqiBandLabel(null)).toBe("Unknown");
    });
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe("WeatherHealthCorrelation", () => {
  const defaultProps = {
    lat: 28.6139,
    lon: 77.209,
    trend: [],
    cityName: "Delhi",
  };

  it("renders the panel with title", () => {
    render(<WeatherHealthCorrelation {...defaultProps} />);
    expect(screen.getByTestId("weather-health-correlation")).toBeTruthy();
    expect(screen.getByText(/Weather–Health Correlation/)).toBeTruthy();
  });

  it("shows collecting data state when no aligned data", () => {
    render(<WeatherHealthCorrelation {...defaultProps} />);
    expect(screen.getByText(/Collecting data/)).toBeTruthy();
  });

  it("renders the empty state with city name in subtitle", () => {
    render(<WeatherHealthCorrelation {...defaultProps} />);
    expect(screen.getByText(/Delhi/)).toBeTruthy();
  });
});
