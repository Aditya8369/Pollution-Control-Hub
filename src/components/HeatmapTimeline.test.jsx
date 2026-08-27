import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import HeatmapTimeline from './HeatmapTimeline';

// One shared fake map instance, so a test can assert what the component asked the
// map to do. react-leaflet's real MapContainer needs a laid-out DOM node; jsdom
// reports every element as 0x0.
const mapInstance = vi.hoisted(() => ({
  setView: vi.fn(),
  getZoom: vi.fn(() => 11),
  addLayer: vi.fn(),
  removeLayer: vi.fn(),
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, center }) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)}>{children}</div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  useMap: () => mapInstance,
}));

vi.mock('leaflet', () => ({ default: {} }));

// #895 again: the heat plugin expects a global `L` and is loaded through this
// helper precisely so it can be substituted here.
const loadHeatLayer = vi.hoisted(() => vi.fn(async () => null));
vi.mock('../utils/heatLayer', () => ({ loadHeatLayer }));

const fetchLocalGridTimeline = vi.hoisted(() => vi.fn());
vi.mock('../services/airQualityService', () => ({ fetchLocalGridTimeline }));

/**
 * A grid response shaped like `fetchLocalGridTimeline`'s, with `hours` hourly
 * readings per point.
 */
function gridResponse(hours, { peakArea = 'North' } = {}) {
  const times = Array.from({ length: hours }, (_, i) => `2026-03-01T${String(i).padStart(2, '0')}:00`);
  const series = (base) => Array.from({ length: hours }, (_, i) => base + i);

  return [
    { id: 'grid-center', lat: 28.6, lon: 77.2, areaName: 'Center', times, hourly: { us_aqi: series(50), pm2_5: series(10) } },
    { id: 'grid-1', lat: 28.7, lon: 77.2, areaName: peakArea, times, hourly: { us_aqi: series(120), pm2_5: series(40) } },
  ];
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchLocalGridTimeline.mockResolvedValue(gridResponse(24));
});

describe('HeatmapTimeline - recentring on a city change (regression for #1012)', () => {
  it('moves the map when the coordinates change', async () => {
    const { rerender } = render(<HeatmapTimeline lat={28.6139} lon={77.209} cityName="Delhi" />);
    await screen.findByTestId('timeline-hour-slider');

    mapInstance.setView.mockClear();

    rerender(<HeatmapTimeline lat={19.076} lon={72.8777} cityName="Mumbai" />);

    await waitFor(() => {
      expect(mapInstance.setView).toHaveBeenCalledWith([19.076, 72.8777], 11);
    });
  });

  it('keeps the user\'s zoom level when it recentres', async () => {
    mapInstance.getZoom.mockReturnValue(14);
    const { rerender } = render(<HeatmapTimeline lat={28.6139} lon={77.209} />);
    await screen.findByTestId('timeline-hour-slider');

    rerender(<HeatmapTimeline lat={19.076} lon={72.8777} />);

    await waitFor(() => {
      expect(mapInstance.setView).toHaveBeenLastCalledWith([19.076, 72.8777], 14);
    });
  });

  it('does not move the map when the coordinates are unchanged', async () => {
    const { rerender } = render(<HeatmapTimeline lat={28.6139} lon={77.209} cityName="Delhi" />);
    await screen.findByTestId('timeline-hour-slider');

    mapInstance.setView.mockClear();
    rerender(<HeatmapTimeline lat={28.6139} lon={77.209} cityName="Delhi (NCR)" />);

    // A prop change that isn't a move must not fight the user's own panning.
    expect(mapInstance.setView).not.toHaveBeenCalled();
  });
});

describe('HeatmapTimeline - hour index bounds', () => {
  it('clamps the opening hour to a series shorter than a day', async () => {
    // Local hour is whatever the test machine says; a 3-hour series can never
    // contain hour 20, and the old build left the slider above its own max.
    fetchLocalGridTimeline.mockResolvedValue(gridResponse(3));

    render(<HeatmapTimeline lat={28.6139} lon={77.209} />);

    const slider = await screen.findByTestId('timeline-hour-slider');
    expect(Number(slider.value)).toBeLessThanOrEqual(Number(slider.max));
    expect(Number(slider.max)).toBe(2);
  });

  it('still shows a hotspot for a short series', async () => {
    fetchLocalGridTimeline.mockResolvedValue(gridResponse(3, { peakArea: 'North' }));

    render(<HeatmapTimeline lat={28.6139} lon={77.209} />);

    // With an out-of-range index the hotspot line vanished silently.
    expect(await screen.findByTestId('timeline-hotspot')).toHaveTextContent('North');
  });

  it('ignores a slider value past the end of the series', async () => {
    fetchLocalGridTimeline.mockResolvedValue(gridResponse(6));
    render(<HeatmapTimeline lat={28.6139} lon={77.209} />);

    const slider = await screen.findByTestId('timeline-hour-slider');
    fireEvent.change(slider, { target: { value: '99' } });

    expect(Number(slider.value)).toBe(5);
  });

  it('renders without throwing when a grid point has no times array', async () => {
    fetchLocalGridTimeline.mockResolvedValue([
      { id: 'grid-center', lat: 28.6, lon: 77.2, areaName: 'Center', hourly: { us_aqi: [80] } },
    ]);

    render(<HeatmapTimeline lat={28.6139} lon={77.209} />);

    // `gridData[0]?.times.length` threw here and took the panel down.
    expect(await screen.findByTestId('heatmap-timeline')).toBeInTheDocument();
  });
});

describe('HeatmapTimeline - control accessibility', () => {
  it('gives the hour slider an accessible name', async () => {
    render(<HeatmapTimeline lat={28.6139} lon={77.209} />);
    await screen.findByTestId('timeline-hour-slider');

    expect(screen.getByRole('slider', { name: /hour of day/i })).toBeInTheDocument();
  });

  it('announces the hour as a clock time, not an array index', async () => {
    render(<HeatmapTimeline lat={28.6139} lon={77.209} />);
    const slider = await screen.findByTestId('timeline-hour-slider');

    const announced = slider.getAttribute('aria-valuetext');
    expect(announced).toBeTruthy();
    expect(announced).not.toBe(slider.value);
  });

  it('exposes the play toggle state', async () => {
    render(<HeatmapTimeline lat={28.6139} lon={77.209} />);
    const toggle = await screen.findByTestId('timeline-play-toggle');

    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });

  it('stops playback when the slider is dragged', async () => {
    render(<HeatmapTimeline lat={28.6139} lon={77.209} />);
    const toggle = await screen.findByTestId('timeline-play-toggle');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(screen.getByTestId('timeline-hour-slider'), { target: { value: '4' } });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });
});

describe('HeatmapTimeline - load states', () => {
  it('reports an error when the grid comes back empty', async () => {
    fetchLocalGridTimeline.mockResolvedValue([]);
    render(<HeatmapTimeline lat={28.6139} lon={77.209} />);

    expect(await screen.findByText(/Couldn't load hourly grid data/)).toBeInTheDocument();
  });

  it('reports an error when the fetch rejects', async () => {
    fetchLocalGridTimeline.mockRejectedValue(new Error('network'));
    render(<HeatmapTimeline lat={28.6139} lon={77.209} />);

    expect(await screen.findByText(/Couldn't load hourly grid data/)).toBeInTheDocument();
  });

  it('does not fetch without coordinates', () => {
    render(<HeatmapTimeline />);
    expect(fetchLocalGridTimeline).not.toHaveBeenCalled();
  });
});
