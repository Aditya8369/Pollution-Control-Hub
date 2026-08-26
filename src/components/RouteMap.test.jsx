import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import RouteMap from './RouteMap';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Polyline: ({ children }) => <div data-testid="polyline">{children}</div>,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
  Circle: ({ children }) => <div data-testid="circle">{children}</div>,
}));

vi.mock('leaflet', () => {
  const mockIcon = vi.fn().mockImplementation(() => ({}));
  const mockDivIcon = vi.fn().mockImplementation(() => ({}));
  return {
    default: {
      Icon: mockIcon,
      DivIcon: mockDivIcon
    }
  };
});

describe('RouteMap - Pollution Source Identification Overlay', () => {
  const defaultProps = {
    mapCenter: [28.6139, 77.209], // Delhi
    routes: [
      {
        leafletCoords: [
          [28.6139, 77.209],
          [28.6272, 77.2402]
        ],
        segments: []
      }
    ],
    activeRouteIndex: 0,
    origin: "Start Place",
    destination: "End Place",
    searchId: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders interactive layer controls overlay', () => {
    render(<RouteMap {...defaultProps} />);
    
    expect(screen.getByTestId('pollution-overlay-controls')).toBeInTheDocument();
    expect(screen.getByLabelText('Show Pollution Sources')).toBeInTheDocument();
    expect(screen.queryByTestId('pollution-category-filter')).not.toBeInTheDocument();
  });

  it('shows markers and circles when layer is toggled on', async () => {
    render(<RouteMap {...defaultProps} />);
    
    // Toggle on
    fireEvent.click(screen.getByLabelText('Show Pollution Sources'));
    
    // Filter dropdown should now be visible
    expect(screen.getByTestId('pollution-category-filter')).toBeInTheDocument();
    
    // Delhi has 3 pollution sources in our dataset, so 3 markers and 3 circles should render
    const markers = screen.getAllByTestId('marker');
    // Including start & destination markers, so total is 2 + 3 = 5 markers
    expect(markers.length).toBe(5);
    
    const circles = screen.getAllByTestId('circle');
    expect(circles.length).toBe(3);
  });

  it('filters pollution sources when category filter dropdown changes', () => {
    render(<RouteMap {...defaultProps} />);
    
    // Toggle on
    fireEvent.click(screen.getByLabelText('Show Pollution Sources'));
    
    // Change filter to Industrial Zones only
    fireEvent.change(screen.getByTestId('pollution-category-filter'), { target: { value: 'industrial_zone' } });
    
    // In Delhi, there is 1 industrial zone (Wazirpur), so circles should reduce to 1
    const circles = screen.getAllByTestId('circle');
    expect(circles.length).toBe(1);
    
    const markers = screen.getAllByTestId('marker');
    // Start + Dest + 1 industrial zone source = 3 markers
    expect(markers.length).toBe(3);
  });
});
