import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Dashboard from './Dashboard';
import * as airQualityService from '../services/airQualityService';
import { cacheStore } from '../utils/cacheStore';

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../services/airQualityService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    get7DayForecast: vi.fn(),
  };
});

describe('Dashboard Component - 7-Day Forecast Chart', () => {
  const defaultProps = {
    cityName: 'New Delhi',
    lat: 28.6139,
    lon: 77.209,
    current: { us_aqi: 120, pm2_5: 45, pm10: 80, carbon_monoxide: 10, nitrogen_dioxide: 15, ozone: 20 },
    trend: [],
    cityComparisons: [],
    timeRange: 24,
    onTimeRangeChange: vi.fn(),
    lastUpdated: '10:00 AM',
    isRefreshing: false,
    confidenceScore: 'High',
    dataCompleteness: '100%',
    isFallback: false,
  };

  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.restoreAllMocks();
  });

  it('renders loading state when forecast data is pending', () => {
    vi.mocked(airQualityService.get7DayForecast).mockReturnValue(new Promise(() => {}));

    render(<Dashboard {...defaultProps} lat={28.6101} lon={77.2001} />);

    expect(screen.getByText(/Loading 7-day forecast/i)).toBeInTheDocument();
  });

  it('renders error state when forecast fetch fails', async () => {
    vi.mocked(airQualityService.get7DayForecast).mockRejectedValue(new Error('API error'));

    render(<Dashboard {...defaultProps} lat={28.6102} lon={77.2002} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load forecast data/i)).toBeInTheDocument();
    });
  });

  it('renders 7-Day Predictive AQI Area Chart when forecast data is loaded', async () => {
    const mockForecast = [
      { date: '2026-07-30', aqi: 110, predictedAQI: 110, lowerBound: 90, upperBound: 130, confidenceRange: [90, 130], weatherCode: 0 },
      { date: '2026-07-31', aqi: 115, predictedAQI: 115, lowerBound: 92, upperBound: 138, confidenceRange: [92, 138], weatherCode: 1 },
    ];
    vi.mocked(airQualityService.get7DayForecast).mockResolvedValue(mockForecast);

    render(<Dashboard {...defaultProps} lat={28.6103} lon={77.2003} />);

    await waitFor(() => {
      expect(screen.getByTestId('7-day-forecast-chart')).toBeInTheDocument();
      expect(screen.getByText(/7-Day Predictive AQI Trend & Confidence Bounds/i)).toBeInTheDocument();
    });
  });
});
