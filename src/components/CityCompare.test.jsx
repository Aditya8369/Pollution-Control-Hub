import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CityCompare from './CityCompare';
import * as airQualityService from '../services/airQualityService';

vi.mock('../services/airQualityService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    fetchAirQualityByCoords: vi.fn(),
  };
});

// Mock Recharts ResponsiveContainer to render children cleanly in Vitest DOM
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  };
});

describe('CityCompare Component - Multi-City Radar/Bar Chart & Refinements', () => {
  const mockCityData = {
    current: {
      us_aqi: 120,
      pm2_5: 45,
      pm10: 80,
      nitrogen_dioxide: 35,
      sulfur_dioxide: 12,
      ozone: 50,
      carbon_monoxide: 220,
    },
    trend: [
      { time: '2026-07-31T00:00', us_aqi: 110 },
      { time: '2026-07-31T12:00', us_aqi: 125 },
    ],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('renders Multi-City AQI Comparison title, quick presets, and search', async () => {
    vi.mocked(airQualityService.fetchAirQualityByCoords).mockResolvedValue(mockCityData);

    render(<CityCompare />);

    expect(screen.getByText('Multi-City AQI Comparison')).toBeInTheDocument();
    expect(screen.getByText('Quick Presets:')).toBeInTheDocument();
    expect(screen.getByText('Global Megacities')).toBeInTheDocument();
    expect(screen.getByText('Indian Metros')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('Fetching comparison data...')).not.toBeInTheDocument();
    });
  });

  it('renders segmented controls for chart type and scale mode', async () => {
    vi.mocked(airQualityService.fetchAirQualityByCoords).mockResolvedValue(mockCityData);

    render(<CityCompare />);

    await waitFor(() => {
      expect(screen.getByText('Multi-City Pollutant Comparison (Side-by-Side)')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Radar Chart' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Grouped Bar Chart' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Absolute Values' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Normalized (%)' })).toBeInTheDocument();
    });
  });

  it('switches between Radar Chart and Grouped Bar Chart views', async () => {
    vi.mocked(airQualityService.fetchAirQualityByCoords).mockResolvedValue(mockCityData);

    render(<CityCompare />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Radar Chart' })).toHaveClass('active');
    });

    const barBtn = screen.getByRole('button', { name: 'Grouped Bar Chart' });
    fireEvent.click(barBtn);

    expect(barBtn).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Radar Chart' })).not.toHaveClass('active');
    expect(screen.getByText(/Grouped Bar View/)).toBeInTheDocument();
  });

  it('switches between Absolute Values and Normalized scale modes', async () => {
    vi.mocked(airQualityService.fetchAirQualityByCoords).mockResolvedValue(mockCityData);

    render(<CityCompare />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Normalized (%)' })).toHaveClass('active');
      expect(screen.getByText(/Normalized Comparison \(%\)/)).toBeInTheDocument();
    });

    const absBtn = screen.getByRole('button', { name: 'Absolute Values' });
    fireEvent.click(absBtn);

    expect(absBtn).toHaveClass('active');
    expect(screen.getByRole('button', { name: 'Normalized (%)' })).not.toHaveClass('active');
    expect(screen.getAllByText(/Absolute Values/).length).toBeGreaterThan(0);
  });

  it('handles 1 to 4 cities comparison gracefully', async () => {
    vi.mocked(airQualityService.fetchAirQualityByCoords).mockResolvedValue(mockCityData);

    render(<CityCompare />);

    await waitFor(() => {
      expect(screen.getAllByText('Delhi').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Tokyo').length).toBeGreaterThan(0);
    });
  });
});
