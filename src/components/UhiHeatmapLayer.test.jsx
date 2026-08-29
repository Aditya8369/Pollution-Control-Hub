import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Cover for the second half of #1074.
 *
 * react-leaflet's real MapContainer wants a laid-out DOM node, which jsdom does
 * not give it, so the map pieces are stubbed the way `HeatmapTimeline.test.jsx`
 * and `LocationMap.test.jsx` stub theirs.
 */

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center }) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)}>{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  // A button rather than a div, so the stub is clickable without tripping the
  // repo's jsx-a11y rules. The real Circle is an SVG path on a Leaflet map.
  Circle: ({ children, pathOptions, eventHandlers }) => (
    <button
      type="button"
      data-testid="grid-circle"
      data-color={pathOptions?.color}
      onClick={() => eventHandlers?.click?.()}
    >
      {children}
    </button>
  ),
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

vi.mock('leaflet', () => ({ default: {} }));

const fetchMicroclimateData = vi.fn();

vi.mock('../services/microclimateService', () => ({
  fetchMicroclimateData: (...args) => fetchMicroclimateData(...args),
  saveMicroclimateZone: vi.fn(),
}));

const UhiHeatmapLayer = (await import('./UhiHeatmapLayer')).default;

/** @param {Partial<any>} [overrides] */
function point(overrides = {}) {
  return {
    id: 'cell-1',
    coordinate: { lat: 28.61, lng: 77.21 },
    temperature: 43.2,
    humidity: 28,
    landCoverType: 'URBAN',
    uhiSeverity: 'SEVERE',
    timestamp: '2026-08-27T12:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  fetchMicroclimateData.mockReset();
});

describe('UhiHeatmapLayer — a response without gridData (#1074)', () => {
  it('does not store undefined and then map over it', async () => {
    // `setGridData(data.gridData)` stored `undefined`, and `gridData.map` threw.
    fetchMicroclimateData.mockResolvedValue({ savedZones: [], metadata: {} });

    render(<UhiHeatmapLayer />);

    expect(await screen.findByText(/no grid readings were published/i)).toBeInTheDocument();
    expect(screen.queryAllByTestId('grid-circle')).toHaveLength(0);
  });

  it('renders the circles it does get', async () => {
    fetchMicroclimateData.mockResolvedValue({
      gridData: [point(), point({ id: 'cell-2', uhiSeverity: 'LOW' })],
    });

    render(<UhiHeatmapLayer />);

    await waitFor(() => expect(screen.getAllByTestId('grid-circle')).toHaveLength(2));
  });

  it('colours a circle by its severity', async () => {
    fetchMicroclimateData.mockResolvedValue({
      gridData: [point({ uhiSeverity: 'SEVERE' }), point({ id: 'cell-2', uhiSeverity: 'LOW' })],
    });

    render(<UhiHeatmapLayer />);

    const circles = await screen.findAllByTestId('grid-circle');
    expect(circles[0].dataset.color).not.toBe(circles[1].dataset.color);
  });
});

describe('UhiHeatmapLayer — a failed load (#1074)', () => {
  it('offers a retry rather than a dead end', async () => {
    fetchMicroclimateData
      .mockRejectedValueOnce(new Error('Grid service is unreachable.'))
      .mockResolvedValueOnce({ gridData: [point()] });

    render(<UhiHeatmapLayer />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Grid service is unreachable.');
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => expect(screen.getAllByTestId('grid-circle')).toHaveLength(1));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not set state after unmount', async () => {
    let settle;
    fetchMicroclimateData.mockReturnValue(new Promise((resolve) => { settle = resolve; }));

    const { unmount } = render(<UhiHeatmapLayer />);
    unmount();

    await act(async () => {
      settle({ gridData: [point()] });
      await Promise.resolve();
    });

    expect(screen.queryAllByTestId('grid-circle')).toHaveLength(0);
  });
});

describe('UhiHeatmapLayer — the bounding box (#1074)', () => {
  it('fetches the default bounds', async () => {
    fetchMicroclimateData.mockResolvedValue({ gridData: [] });

    render(<UhiHeatmapLayer />);

    await waitFor(() => expect(fetchMicroclimateData).toHaveBeenCalledWith(28.7, 28.5, 77.3, 77.1));
  });

  it('centres the map on the bounds it fetched, not a hard-coded point', async () => {
    fetchMicroclimateData.mockResolvedValue({ gridData: [] });

    render(<UhiHeatmapLayer bounds={{ north: 19.2, south: 18.9, east: 73.0, west: 72.8 }} />);

    const map = await screen.findByTestId('map-container');
    const [lat, lng] = JSON.parse(map.dataset.center);
    expect(lat).toBeCloseTo(19.05, 5);
    expect(lng).toBeCloseTo(72.9, 5);
  });

  it('fetches the bounds it was given', async () => {
    fetchMicroclimateData.mockResolvedValue({ gridData: [] });

    render(<UhiHeatmapLayer bounds={{ north: 19.2, south: 18.9, east: 73.0, west: 72.8 }} />);

    await waitFor(() => expect(fetchMicroclimateData).toHaveBeenCalledWith(19.2, 18.9, 73.0, 72.8));
  });

  it('does not refetch when an equivalent bounds object is passed again', async () => {
    fetchMicroclimateData.mockResolvedValue({ gridData: [] });

    const { rerender } = render(<UhiHeatmapLayer bounds={{ north: 19.2, south: 18.9, east: 73.0, west: 72.8 }} />);
    await waitFor(() => expect(fetchMicroclimateData).toHaveBeenCalledTimes(1));

    // A caller passing an object literal rebuilds it every render; keying the
    // effect on the four numbers means that is not a refetch.
    rerender(<UhiHeatmapLayer bounds={{ north: 19.2, south: 18.9, east: 73.0, west: 72.8 }} />);
    await act(async () => { await Promise.resolve(); });

    expect(fetchMicroclimateData).toHaveBeenCalledTimes(1);
  });
});

describe('UhiHeatmapLayer — the selected point advisory (#1074)', () => {
  it('shows an advisory for the point that was clicked', async () => {
    fetchMicroclimateData.mockResolvedValue({ gridData: [point({ uhiSeverity: 'SEVERE', temperature: 43.2 })] });

    render(<UhiHeatmapLayer />);
    fireEvent.click(await screen.findByTestId('grid-circle'));

    expect(await screen.findByText(/stay hydrated/i)).toBeInTheDocument();
  });
});
