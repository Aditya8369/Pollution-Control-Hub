import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import HistoricalPollutionExplorer from './HistoricalPollutionExplorer';

vi.mock('../services/historicalExplorerService', () => ({
  fetchHistoricalForLocations: vi.fn(),
}));

vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div data-testid="responsive-container">{children}</div>
    ),
  };
});

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallbackOrTemplate) => {
      if (typeof fallbackOrTemplate === 'string') return fallbackOrTemplate;
      if (typeof fallbackOrTemplate === 'function') return fallbackOrTemplate();
      return key;
    },
  }),
}));

import { fetchHistoricalForLocations } from '../services/historicalExplorerService';

function makeDailyData(startDateStr, n) {
  const start = new Date(startDateStr + 'T00:00:00Z');
  const daily = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const date = d.toISOString().split('T')[0];
    daily.push({
      date, avgAqi: 50 + (i % 50), maxAqi: 60 + (i % 50),
      pm25: 20 + (i % 20), pm10: 40 + (i % 40), no2: 15 + (i % 15),
      ozone: 30 + (i % 30), co: 500 + (i % 200),
      hasReading: true, hoursMeasured: 24,
    });
  }
  return { daily, monthly: [], overallAvg: 60, daysInRange: n, daysWithReadings: n };
}

describe('HistoricalPollutionExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a loading state initially', async () => {
    fetchHistoricalForLocations.mockReturnValueOnce(new Promise(() => {}));
    render(<HistoricalPollutionExplorer position={{ lat: 18.52, lon: 73.85, cityName: 'Pune' }} />);
    expect(screen.getByTestId('historical-explorer-loading')).toBeTruthy();
  });

  it('renders the controls + main chart after data loads', async () => {
    fetchHistoricalForLocations.mockResolvedValueOnce([
      {
        location: { name: 'Pune', lat: 18.5204, lon: 73.8567 },
        data: makeDailyData('2024-01-01', 90),
        error: null,
      },
    ]);

    render(<HistoricalPollutionExplorer position={{ lat: 18.52, lon: 73.85, cityName: 'Pune' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('historical-explorer')).toBeTruthy();
    });

    expect(screen.getByTestId('explorer-cities')).toBeTruthy();
    expect(screen.getByTestId('explorer-pollutant')).toBeTruthy();
    expect(screen.getByTestId('explorer-view')).toBeTruthy();
    expect(screen.getByTestId('explorer-chart-type')).toBeTruthy();
    expect(screen.getByTestId('explorer-main-chart')).toBeTruthy();
    expect(screen.getByTestId('explorer-stats')).toBeTruthy();
  });

  it('renders an error state when the fetch fails', async () => {
    fetchHistoricalForLocations.mockResolvedValueOnce([
      {
        location: { name: 'Pune', lat: 18.5204, lon: 73.8567 },
        data: null,
        error: 'Network down',
      },
    ]);

    render(<HistoricalPollutionExplorer position={{ lat: 18.52, lon: 73.85, cityName: 'Pune' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('historical-explorer-error')).toBeTruthy();
    });
    expect(screen.getByTestId('historical-explorer-error').textContent).toContain('Network down');
  });

  it('renders the comparison chart when more than one city is selected', async () => {
    fetchHistoricalForLocations.mockResolvedValue([
      {
        location: { name: 'Pune', lat: 18.5204, lon: 73.8567 },
        data: makeDailyData('2024-01-01', 60),
        error: null,
      },
      {
        location: { name: 'Delhi', lat: 28.6139, lon: 77.209 },
        data: makeDailyData('2024-01-01', 60),
        error: null,
      },
    ]);

    const { rerender } = render(
      <HistoricalPollutionExplorer position={{ lat: 18.52, lon: 73.85, cityName: 'Pune' }} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('historical-explorer')).toBeTruthy();
    });

    const citiesSelect = screen.getByTestId('explorer-cities');
    fireEvent.change(citiesSelect, { target: { value: ['Pune', 'Delhi'] } });

    await waitFor(() => {
      expect(fetchHistoricalForLocations).toHaveBeenCalledTimes(2);
    });

    rerender(
      <HistoricalPollutionExplorer position={{ lat: 18.52, lon: 73.85, cityName: 'Pune' }} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('explorer-compare-chart')).toBeTruthy();
    });
  });

  it('calls export on CSV button click', async () => {
    const mockData = makeDailyData('2024-01-01', 60);
    fetchHistoricalForLocations.mockResolvedValueOnce([
      {
        location: { name: 'Pune', lat: 18.5204, lon: 73.8567 },
        data: mockData,
        error: null,
      },
    ]);

    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
    const clickSpy = vi.fn();
    HTMLAnchorElement.prototype.click = clickSpy;

    render(<HistoricalPollutionExplorer position={{ lat: 18.52, lon: 73.85, cityName: 'Pune' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('explorer-export-csv')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('explorer-export-csv'));
    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
  });

  it('changes the pollutant and updates the chart label', async () => {
    fetchHistoricalForLocations.mockResolvedValue([
      {
        location: { name: 'Pune', lat: 18.5204, lon: 73.8567 },
        data: makeDailyData('2024-01-01', 60),
        error: null,
      },
    ]);

    render(<HistoricalPollutionExplorer position={{ lat: 18.52, lon: 73.85, cityName: 'Pune' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('historical-explorer')).toBeTruthy();
    });

    expect(screen.getByTestId('explorer-main-chart').textContent).toContain('PM2.5');

    fireEvent.change(screen.getByTestId('explorer-pollutant'), { target: { value: 'no2' } });

    expect(screen.getByTestId('explorer-main-chart').textContent).toContain('NO');
  });

  it('changes the view granularity and re-renders the chart', async () => {
    fetchHistoricalForLocations.mockResolvedValue([
      {
        location: { name: 'Pune', lat: 18.5204, lon: 73.8567 },
        data: makeDailyData('2024-01-01', 180),
        error: null,
      },
    ]);

    render(<HistoricalPollutionExplorer position={{ lat: 18.52, lon: 73.85, cityName: 'Pune' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('historical-explorer')).toBeTruthy();
    });

    expect(screen.getByTestId('explorer-main-chart').textContent).toContain('monthly');

    fireEvent.change(screen.getByTestId('explorer-view'), { target: { value: 'yearly' } });
    expect(screen.getByTestId('explorer-main-chart').textContent).toContain('yearly');
  });

  it('renders the highest-pollution periods list when data is present', async () => {
    fetchHistoricalForLocations.mockResolvedValueOnce([
      {
        location: { name: 'Pune', lat: 18.5204, lon: 73.8567 },
        data: makeDailyData('2024-01-01', 180),
        error: null,
      },
    ]);

    render(<HistoricalPollutionExplorer position={{ lat: 18.52, lon: 73.85, cityName: 'Pune' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('historical-explorer')).toBeTruthy();
    });

    expect(screen.getByTestId('explorer-highest-periods')).toBeTruthy();
    const items = screen.getByTestId('explorer-highest-periods').querySelectorAll('li');
    expect(items.length).toBeGreaterThan(0);
  });

  it('renders a chip for the selected city', async () => {
    fetchHistoricalForLocations.mockResolvedValueOnce([
      {
        location: { name: 'Pune', lat: 18.5204, lon: 73.8567 },
        data: makeDailyData('2024-01-01', 30),
        error: null,
      },
    ]);

    render(<HistoricalPollutionExplorer position={{ lat: 18.52, lon: 73.85, cityName: 'Pune' }} />);

    await waitFor(() => {
      expect(screen.getByTestId('city-chip-Pune')).toBeTruthy();
    });
  });
});
