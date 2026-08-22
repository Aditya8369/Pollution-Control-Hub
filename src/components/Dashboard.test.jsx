import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react';
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
    analytics: { weekly: 100, monthly: 110, prediction: 120 },
    nearbyPoints: []
  };

  beforeEach(async () => {
    if (typeof localStorage !== 'undefined' && typeof localStorage.clear === 'function') {
      localStorage.clear();
    }
    await cacheStore.invalidate();
    vi.restoreAllMocks();
  });

  it('renders loading state when forecast data is pending', async () => {
    vi.mocked(airQualityService.get7DayForecast).mockReturnValue(new Promise(() => {}));

    render(<Dashboard {...defaultProps} lat={28.6101} lon={77.2001} />);

    await waitFor(() => {
      expect(screen.getByText(/Loading 7-day forecast/i)).toBeInTheDocument();
    }, { timeout: 4000 });
  });

  it('renders error state when forecast fetch fails', async () => {
    vi.mocked(airQualityService.get7DayForecast).mockRejectedValue(new Error('API error'));

    render(<Dashboard {...defaultProps} lat={28.6102} lon={77.2002} />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to load forecast data/i)).toBeInTheDocument();
    }, { timeout: 4000 });
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

describe('Dashboard Widget Personalization', () => {
  const defaultProps = {
    cityName: 'New Delhi',
    lat: 28.6139,
    lon: 77.209,
    current: { us_aqi: 120, pm2_5: 45, pm10: 80, carbon_monoxide: 10, nitrogen_dioxide: 15, ozone: 20 },
    trend: [{ us_aqi: 110 }, { us_aqi: 120 }],
    cityComparisons: [],
    timeRange: 24,
    onTimeRangeChange: vi.fn(),
    lastUpdated: '10:00 AM',
    isRefreshing: false,
    confidenceScore: 'High',
    dataCompleteness: '100%',
    isFallback: false,
    analytics: { weekly: 100, monthly: 110, prediction: 120 },
    nearbyPoints: []
  };

  beforeEach(() => {
    let store = {};
    const mockStorage = {
      getItem: vi.fn((key) => store[key] || null),
      setItem: vi.fn((key, value) => { store[key] = String(value); }),
      removeItem: vi.fn((key) => { delete store[key]; }),
      clear: vi.fn(() => { store = {}; })
    };
    Object.defineProperty(global, 'localStorage', {
      value: mockStorage,
      writable: true,
      configurable: true
    });
  });

  it('renders Personalize button and opens the customizer drawer on click', async () => {
    render(<Dashboard {...defaultProps} />);
    
    const personalizeBtn = screen.getByRole('button', { name: /Personalize dashboard/i });
    expect(personalizeBtn).toBeInTheDocument();
    
    // Drawer should not be visible initially
    expect(screen.queryByText(/Personalize Your Dashboard/i)).not.toBeInTheDocument();
    
    // Click button to open customizer
    act(() => {
      fireEvent.click(personalizeBtn);
    });
    expect(screen.getByText(/Personalize Your Dashboard/i)).toBeInTheDocument();
    
    // Checkboxes should exist for all widgets
    expect(screen.getByRole('checkbox', { name: /Morning Briefing/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Challenges & Activities/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Did You Know\?/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Analytics Insights/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Location Map & Heatmap/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /7-Day Forecast Chart/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Alerts & Warnings/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Health Advisory/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Pollen & Allergen Forecast/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Sun Safety/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Solutions & Actions/i })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /Pollution Scenario Simulator/i })).toBeInTheDocument();
  });

  it('allows toggling widget visibility and persists layout preference in localStorage', () => {
    render(<Dashboard {...defaultProps} />);
    
    const personalizeBtn = screen.getByRole('button', { name: /Personalize dashboard/i });
    act(() => {
      fireEvent.click(personalizeBtn);
    });
    
    const morningBriefingCheckbox = screen.getByRole('checkbox', { name: /Morning Briefing/i });
    expect(morningBriefingCheckbox).toBeChecked();
    
    // Toggle visibility to hidden
    act(() => {
      fireEvent.click(morningBriefingCheckbox);
    });
    expect(morningBriefingCheckbox).not.toBeChecked();
    
    // Verify changes are persisted in localStorage
    const savedLayout = JSON.parse(localStorage.getItem('pch_dashboard_layout'));
    expect(savedLayout.find(w => w.id === 'morning-briefing').visible).toBe(false);
  });
});

describe('Dashboard Trend Chart Controls (#828)', () => {
  const defaultProps = {
    cityName: 'New Delhi',
    lat: 28.6139,
    lon: 77.209,
    current: { us_aqi: 120, pm2_5: 45, pm10: 80, carbon_monoxide: 10, nitrogen_dioxide: 15, ozone: 20 },
    trend: [
      { time: '2026-08-22T10:00:00Z', us_aqi: 110, pm2_5: 40, pm10: 70 },
      { time: '2026-08-22T11:00:00Z', us_aqi: 120, pm2_5: 45, pm10: 80 }
    ],
    cityComparisons: [],
    timeRange: 24,
    onTimeRangeChange: vi.fn(),
    lastUpdated: '10:00 AM',
    isRefreshing: false,
    confidenceScore: 'High',
    dataCompleteness: '100%',
    isFallback: false,
    analytics: { weekly: 100, monthly: 110, prediction: 120 },
    nearbyPoints: []
  };

  it('renders pollutant overlay buttons and granularity options', () => {
    render(<Dashboard {...defaultProps} />);

    const granularityContainer = screen.getByTestId('granularity-selector');
    const pollutantContainer = screen.getByTestId('pollutant-overlay-controls');

    expect(within(granularityContainer).getByRole('button', { name: 'Hourly' })).toBeInTheDocument();
    expect(within(granularityContainer).getByRole('button', { name: '3h Avg' })).toBeInTheDocument();
    expect(within(granularityContainer).getByRole('button', { name: 'Daily Avg' })).toBeInTheDocument();

    expect(within(pollutantContainer).getByRole('button', { name: 'AQI' })).toBeInTheDocument();
    expect(within(pollutantContainer).getByRole('button', { name: 'PM2.5' })).toBeInTheDocument();
    expect(within(pollutantContainer).getByRole('button', { name: 'PM10' })).toBeInTheDocument();
  });

  it('allows switching granularity and toggling pollutants', () => {
    render(<Dashboard {...defaultProps} />);

    const granularityContainer = screen.getByTestId('granularity-selector');
    const pollutantContainer = screen.getByTestId('pollutant-overlay-controls');

    const dailyBtn = within(granularityContainer).getByRole('button', { name: 'Daily Avg' });
    act(() => {
      fireEvent.click(dailyBtn);
    });

    const pm10Btn = within(pollutantContainer).getByRole('button', { name: 'PM10' });
    expect(pm10Btn).toHaveAttribute('aria-pressed', 'false');

    act(() => {
      fireEvent.click(pm10Btn);
    });
    expect(pm10Btn).toHaveAttribute('aria-pressed', 'true');
  });
});
