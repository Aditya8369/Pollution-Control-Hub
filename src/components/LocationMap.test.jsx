import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import LocationMap from './LocationMap';
import { eventBus } from '../core/events';

const COMMUNITY_REPORTS_STORAGE_KEY = 'pollution-community-reports';

// Mock Leaflet and React-Leaflet for unit testing environment
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  CircleMarker: ({ children }) => <div data-testid="circle-marker">{children}</div>,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

vi.mock('leaflet', () => ({
  default: {
    divIcon: (opts) => opts,
  },
}));

describe('LocationMap Component', () => {
  const defaultProps = {
    center: { lat: 28.6139, lon: 77.209 },
    nearbyPoints: [
      { id: '1', lat: 28.62, lon: 77.21, areaName: 'Connaught Place', aqi: 150 },
    ],
    confidenceScore: 'High',
    windData: null,
  };

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('renders the map panel and Show Community Reports toggle button', () => {
    render(<LocationMap {...defaultProps} />);

    expect(screen.getByTestId('location-map')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Show Community Reports/i })
    ).toBeInTheDocument();
  });

  it('toggles community reports overlay on and off', () => {
    render(<LocationMap {...defaultProps} />);

    const toggleBtn = screen.getByRole('button', { name: /Show Community Reports/i });
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(
      screen.getByRole('button', { name: /Hide Community Reports/i })
    ).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(
      screen.getByRole('button', { name: /Show Community Reports/i })
    ).toBeInTheDocument();
  });

  it('filters and renders only valid geotagged reports when overlay is active', () => {
    const reports = [
      {
        id: 'r1',
        title: 'Industrial Smoke',
        status: 'Pending',
        latitude: 28.65,
        longitude: 77.22,
        createdAt: '2026-07-29T10:00:00.000Z',
      },
      {
        id: 'r2',
        title: 'Non Geotagged Report',
        status: 'Pending',
        latitude: null,
        longitude: null,
      },
    ];
    localStorage.setItem(COMMUNITY_REPORTS_STORAGE_KEY, JSON.stringify(reports));

    render(<LocationMap {...defaultProps} />);

    // Turn on overlay
    fireEvent.click(screen.getByRole('button', { name: /Show Community Reports/i }));

    expect(screen.getByText('Industrial Smoke')).toBeInTheDocument();
    expect(screen.getByText('Status: Pending')).toBeInTheDocument();
    expect(screen.queryByText('Non Geotagged Report')).not.toBeInTheDocument();
  });

  it('updates community reports in real-time via eventBus event', () => {
    render(<LocationMap {...defaultProps} />);

    // Turn on overlay
    fireEvent.click(screen.getByRole('button', { name: /Show Community Reports/i }));

    expect(screen.queryByText('Live Geotagged Issue')).not.toBeInTheDocument();

    // Save report to localStorage and emit event
    const newReport = {
      id: 'live1',
      title: 'Live Geotagged Issue',
      status: 'Verified (community)',
      latitude: 28.70,
      longitude: 77.10,
      createdAt: '2026-07-29T12:00:00.000Z',
    };
    localStorage.setItem(COMMUNITY_REPORTS_STORAGE_KEY, JSON.stringify([newReport]));

    act(() => {
      eventBus.emit('COMMUNITY_REPORT_SUBMITTED', newReport);
    });

    expect(screen.getByText('Live Geotagged Issue')).toBeInTheDocument();
    expect(screen.getByText('Status: Verified (community)')).toBeInTheDocument();
  });

  it('safely handles legacy reports without coordinates in localStorage', () => {
    const legacy = [
      { id: 'old1', title: 'Legacy Trash Burning', status: 'Pending' },
    ];
    localStorage.setItem(COMMUNITY_REPORTS_STORAGE_KEY, JSON.stringify(legacy));

    render(<LocationMap {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: /Show Community Reports/i }));
    expect(screen.queryByText('Legacy Trash Burning')).not.toBeInTheDocument();
  });
});
