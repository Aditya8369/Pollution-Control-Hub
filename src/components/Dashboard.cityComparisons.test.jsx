import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Dashboard from './Dashboard';
import { cacheStore } from '../utils/cacheStore';

globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

vi.mock('../services/airQualityService', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, get7DayForecast: vi.fn(() => new Promise(() => {})) };
});

const baseProps = {
  cityName: 'New Delhi',
  lat: 28.6139,
  lon: 77.209,
  current: {
    us_aqi: 120,
    pm2_5: 45,
    pm10: 80,
    carbon_monoxide: 10,
    nitrogen_dioxide: 15,
    ozone: 20,
  },
  trend: [],
  timeRange: 24,
  onTimeRangeChange: vi.fn(),
  lastUpdated: '10:00 AM',
  isRefreshing: false,
  confidenceScore: 'High',
  dataCompleteness: '100%',
  isFallback: false,
};

describe('Dashboard city comparisons (regression for #499)', () => {
  beforeEach(async () => {
    await cacheStore.invalidate();
    vi.clearAllMocks();
  });

  it('names cities whose reading could not be fetched', () => {
    render(
      <Dashboard
        {...baseProps}
        cityComparisons={[
          { city: 'Delhi', aqi: 180, pm2_5: 60, pm10: 90, unavailable: false },
          { city: 'Mumbai', aqi: null, pm2_5: null, pm10: null, unavailable: true },
          { city: 'Chennai', aqi: null, pm2_5: null, pm10: null, unavailable: true },
        ]}
      />
    );

    const notice = screen.getByTestId('city-comparison-unavailable');
    expect(notice).toHaveTextContent('Mumbai');
    expect(notice).toHaveTextContent('Chennai');
    expect(notice).not.toHaveTextContent('Delhi');
  });

  it('labels unavailable cities as Unavailable rather than showing a number', () => {
    render(
      <Dashboard
        {...baseProps}
        cityComparisons={[
          { city: 'Delhi', aqi: 180, pm2_5: 60, pm10: 90, unavailable: false },
          { city: 'Mumbai', aqi: null, pm2_5: null, pm10: null, unavailable: true },
        ]}
      />
    );

    const items = screen.getAllByTestId('city-comparison-item');
    expect(items.map((el) => el.textContent)).toEqual([
      'Delhi: 180',
      'Mumbai: Unavailable',
    ]);
    // The old fabricated fallback must not resurface anywhere.
    expect(screen.queryByText(/Mumbai: 85/)).not.toBeInTheDocument();
  });

  it('shows no notice when every city reported successfully', () => {
    render(
      <Dashboard
        {...baseProps}
        cityComparisons={[
          { city: 'Delhi', aqi: 180, pm2_5: 60, pm10: 90, unavailable: false },
          { city: 'Mumbai', aqi: 95, pm2_5: 30, pm10: 50, unavailable: false },
        ]}
      />
    );

    expect(
      screen.queryByTestId('city-comparison-unavailable')
    ).not.toBeInTheDocument();
  });

  it('treats a null aqi as unavailable even without the flag (legacy cache entries)', () => {
    render(
      <Dashboard
        {...baseProps}
        cityComparisons={[{ city: 'Kolkata', aqi: null, pm2_5: null, pm10: null }]}
      />
    );

    expect(screen.getByTestId('city-comparison-unavailable')).toHaveTextContent(
      'Kolkata'
    );
  });

  it('renders without a comparison list at all', () => {
    render(<Dashboard {...baseProps} cityComparisons={undefined} />);

    expect(screen.getByTestId('city-comparisons')).toBeInTheDocument();
    expect(
      screen.queryByTestId('city-comparison-unavailable')
    ).not.toBeInTheDocument();
  });
});
