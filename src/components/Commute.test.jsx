import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Commute from './Commute';
import * as routePlanner from '../services/routePlanner';

vi.mock('../services/routePlanner', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    calculateCleanRoute: vi.fn(),
  };
});

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Polyline: ({ positions, color, children }) => (
    <div data-testid="polyline" data-color={color} data-positions={JSON.stringify(positions)}>
      {children}
    </div>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

describe('Commute Component - Leaflet Polyline Heatmap & Legend', () => {
  const mockRouteData = {
    cleanestRoute: {
      geometry: [[77.209, 28.6139], [77.219, 28.6239]],
      distance: '5.00',
      duration: '15',
      pm25: '20.0',
      inhaledDose: '5.2',
      mode: 'driving',
      multiplier: 1.0,
      exposureScore: 100,
      segments: [
        {
          coordinates: [[28.6139, 77.209], [28.6189, 77.214]],
          aqi: 45,
          category: 'Good',
          color: '#1f9d55',
          pm25: 10.0,
        },
        {
          coordinates: [[28.6189, 77.214], [28.6239, 77.219]],
          aqi: 75,
          category: 'Moderate',
          color: '#f59e0b',
          pm25: 24.0,
        },
      ],
    },
    allRoutes: [],
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders clean route planner form controls and AQI Legend', () => {
    render(<Commute />);

    expect(screen.getByText('Clean Route Planner')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Connaught Place')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. India Gate')).toBeInTheDocument();
    expect(screen.getByTestId('route-aqi-legend')).toBeInTheDocument();
    expect(screen.getByText('Route AQI Legend')).toBeInTheDocument();
    expect(screen.getByText(/Good \(0–50\)/)).toBeInTheDocument();
  });

  it('renders colored AQI Polyline segments when route search completes', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockResolvedValue(mockRouteData);

    render(<Commute />);

    const originInput = screen.getByPlaceholderText('e.g. Connaught Place');
    const destInput = screen.getByPlaceholderText('e.g. India Gate');
    const searchBtn = screen.getByText('Find Cleanest Route');

    fireEvent.change(originInput, { target: { value: 'Connaught Place' } });
    fireEvent.change(destInput, { target: { value: 'India Gate' } });
    fireEvent.click(searchBtn);

    await waitFor(() => {
      expect(screen.getByText('Route Selected')).toBeInTheDocument();
      const polylines = screen.getAllByTestId('polyline');
      expect(polylines.length).toBe(2);
      expect(polylines[0]).toHaveAttribute('data-color', '#1f9d55');
      expect(polylines[1]).toHaveAttribute('data-color', '#f59e0b');
    });
  });
});
