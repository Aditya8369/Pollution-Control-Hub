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
  const measuredRoute = {
    geometry: [[77.209, 28.6139], [77.219, 28.6239]],
    distance: '5.00',
    duration: '15',
    pm25: '20.0',
    inhaledDose: '5.2',
    mode: 'driving',
    multiplier: 1.0,
    exposureScore: 100,
    measured: true,
    measuredCheckpoints: 2,
    totalCheckpoints: 2,
    coverage: 1,
    segments: [
      {
        coordinates: [[28.6139, 77.209], [28.6189, 77.214]],
        aqi: 45,
        category: 'Good',
        color: '#1f9d55',
        pm25: 10.0,
        measured: true,
      },
      {
        coordinates: [[28.6189, 77.214], [28.6239, 77.219]],
        aqi: 75,
        category: 'Moderate',
        color: '#f59e0b',
        pm25: 24.0,
        measured: true,
      },
    ],
  };

  // The component renders from `allRoutes`, so a fixture that only populated
  // `cleanestRoute` left it with nothing to draw and the assertions never ran.
  const mockRouteData = {
    cleanestRoute: measuredRoute,
    allRoutes: [measuredRoute],
    pollutionDataAvailable: true,
    rankedRouteCount: 1,
    totalRouteCount: 1,
  };

  /** The same route as it comes back when no pollution reading could be fetched (#544). */
  const unmeasuredRoute = {
    ...measuredRoute,
    pm25: null,
    inhaledDose: null,
    exposureScore: null,
    measured: false,
    measuredCheckpoints: 0,
    segments: measuredRoute.segments.map((seg) => ({
      ...seg,
      aqi: null,
      pm25: null,
      category: 'Unavailable',
      color: '#94a3b8',
      measured: false,
    })),
  };

  const mockUnmeasuredData = {
    cleanestRoute: null,
    allRoutes: [unmeasuredRoute],
    pollutionDataAvailable: false,
    rankedRouteCount: 0,
    totalRouteCount: 1,
  };

  /** Fills in both locations and submits the form. */
  const runSearch = () => {
    fireEvent.change(screen.getByPlaceholderText('e.g. Connaught Place'), {
      target: { value: 'Connaught Place' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. India Gate'), {
      target: { value: 'India Gate' },
    });
    fireEvent.click(screen.getByText('Find Cleanest Route'));
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
    runSearch();

    await waitFor(() => {
      expect(screen.getByText('Route Selected')).toBeInTheDocument();
      const polylines = screen.getAllByTestId('polyline');
      expect(polylines.length).toBe(2);
      expect(polylines[0]).toHaveAttribute('data-color', '#1f9d55');
      expect(polylines[1]).toHaveAttribute('data-color', '#f59e0b');
    });
  });

  it('shows the measured PM2.5 and dose for a fully measured route', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockResolvedValue(mockRouteData);

    render(<Commute />);
    runSearch();

    await waitFor(() => {
      expect(screen.getByText('20.0 µg/m³')).toBeInTheDocument();
      expect(screen.getByText('5.2 µg')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('commute-no-pollution-data')).not.toBeInTheDocument();
    expect(screen.queryByTestId('commute-coverage-note')).not.toBeInTheDocument();
  });

  it('warns instead of showing a number when no pollution data came back (#544)', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockResolvedValue(mockUnmeasuredData);

    render(<Commute />);
    runSearch();

    await waitFor(() => {
      expect(screen.getByTestId('commute-no-pollution-data')).toBeInTheDocument();
    });

    // The invented figure the old fallback produced must not appear anywhere.
    expect(screen.queryByText('25.0 µg/m³')).not.toBeInTheDocument();
    expect(screen.getAllByText('Not available').length).toBeGreaterThan(0);
    expect(screen.getByTestId('commute-coverage-note')).toHaveTextContent(
      /no pollution readings/i
    );
  });

  it('does not badge any route as cleanest when nothing could be measured', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockResolvedValue(mockUnmeasuredData);

    render(<Commute />);
    runSearch();

    await waitFor(() => {
      expect(screen.getByText('Route Options')).toBeInTheDocument();
    });
    expect(screen.queryByText('Cleanest')).not.toBeInTheDocument();
    expect(screen.getByText('☁️ No reading')).toBeInTheDocument();
  });

  it('greys out unmeasured polyline segments rather than colouring them Good', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockResolvedValue(mockUnmeasuredData);

    render(<Commute />);
    runSearch();

    await waitFor(() => {
      const polylines = screen.getAllByTestId('polyline');
      expect(polylines.length).toBe(2);
      for (const line of polylines) {
        expect(line).toHaveAttribute('data-color', '#94a3b8');
        expect(line).not.toHaveAttribute('data-color', '#1f9d55');
      }
    });
  });
});
