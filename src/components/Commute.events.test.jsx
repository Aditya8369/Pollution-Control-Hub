import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Commute from './Commute';
import * as routePlanner from '../services/routePlanner';
import { eventBus } from '../core/events';

vi.mock('../services/routePlanner', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, calculateCleanRoute: vi.fn() };
});

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }) => <div data-testid="marker">{children}</div>,
  Polyline: () => <div data-testid="polyline" />,
  Popup: ({ children }) => <div data-testid="popup">{children}</div>,
}));

const HISTORY_STORAGE_KEY = 'commute-route-history';

const route = {
  geometry: [[77.209, 28.6139], [77.219, 28.6239]],
  distance: '5.00',
  duration: '15',
  pm25: '20.0',
  inhaledDose: '5.2',
  mode: 'driving',
  measured: true,
  measuredCheckpoints: 2,
  totalCheckpoints: 2,
  segments: [],
};

const successResult = {
  cleanestRoute: route,
  allRoutes: [route],
  pollutionDataAvailable: true,
  rankedRouteCount: 1,
  totalRouteCount: 1,
};

const runSearch = () => {
  fireEvent.change(screen.getByPlaceholderText('e.g. Connaught Place'), {
    target: { value: 'Connaught Place' },
  });
  fireEvent.change(screen.getByPlaceholderText('e.g. India Gate'), {
    target: { value: 'India Gate' },
  });
  fireEvent.click(screen.getByText('Find Cleanest Route'));
};

/**
 * Regression cover for #668 — `eventBus` was used in Commute.jsx but never
 * imported, so every successful search threw a ReferenceError inside the try
 * block and was reported to the user as a routing failure.
 */
describe('Commute - successful search side effects (#668)', () => {
  /** @type {any[]} */
  let planned;
  /** @type {(payload: any) => void} */
  let onPlanned;

  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    planned = [];
    onPlanned = (payload) => planned.push(payload);
    eventBus.on('ROUTE_PLANNED', onPlanned);
  });

  afterEach(() => {
    eventBus.off('ROUTE_PLANNED', onPlanned);
  });

  it('emits ROUTE_PLANNED once per successful search', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockResolvedValue(successResult);

    render(<Commute />);
    runSearch();

    await waitFor(() => expect(planned).toHaveLength(1));
    expect(planned[0]).toEqual({
      origin: 'Connaught Place',
      destination: 'India Gate',
      mode: 'driving',
    });
  });

  it('records the search in route history', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockResolvedValue(successResult);

    render(<Commute />);
    runSearch();

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0]).toMatchObject({
        origin: 'Connaught Place',
        destination: 'India Gate',
      });
    });
  });

  it('shows no error when the search succeeded', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockResolvedValue(successResult);

    render(<Commute />);
    runSearch();

    await waitFor(() => expect(screen.getByText('Route Selected')).toBeInTheDocument());
    expect(screen.queryByTestId('commute-route-error')).not.toBeInTheDocument();
  });

  it('does not emit ROUTE_PLANNED when the search returned no routes', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockResolvedValue({
      ...successResult,
      cleanestRoute: null,
      allRoutes: [],
      totalRouteCount: 0,
    });

    render(<Commute />);
    runSearch();

    await waitFor(() =>
      expect(screen.getByText('Find Cleanest Route')).not.toBeDisabled()
    );
    expect(planned).toHaveLength(0);
  });

  // EventBus.emit already isolates subscriber errors; this pins the end-to-end
  // property rather than any one layer's guard, so neither can regress silently.
  it('still renders the routes when a ROUTE_PLANNED subscriber throws', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockResolvedValue(successResult);
    vi.spyOn(console, 'error').mockImplementation(() => { });

    const explode = () => {
      throw new Error('subscriber blew up');
    };
    eventBus.on('ROUTE_PLANNED', explode);

    try {
      render(<Commute />);
      runSearch();

      await waitFor(() => expect(screen.getByText('Route Selected')).toBeInTheDocument());
      // The whole point of #668: bookkeeping must not be reported as a routing failure.
      expect(screen.queryByTestId('commute-route-error')).not.toBeInTheDocument();
      expect(planned).toHaveLength(1);
    } finally {
      eventBus.off('ROUTE_PLANNED', explode);
    }
  });
});

describe('Commute - failed search reporting (#668)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => { });
  });

  it('reports an unresolvable location by name', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockRejectedValue(
      new Error('Location not found: India Gate')
    );

    render(<Commute />);
    runSearch();

    const banner = await screen.findByTestId('commute-route-error');
    expect(banner).toHaveTextContent(/couldn't find "India Gate"/i);
    expect(banner).not.toHaveTextContent(/spelled/i);
  });

  it('reports a connection failure as a connection failure', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockRejectedValue(
      new TypeError('Failed to fetch')
    );

    render(<Commute />);
    runSearch();

    expect(await screen.findByTestId('commute-route-error')).toHaveTextContent(
      /check your connection/i
    );
  });

  it('writes no history and emits nothing for a failed search', async () => {
    const planned = [];
    const onPlanned = (payload) => planned.push(payload);
    eventBus.on('ROUTE_PLANNED', onPlanned);

    vi.mocked(routePlanner.calculateCleanRoute).mockRejectedValue(
      new Error('Could not calculate routes')
    );

    try {
      render(<Commute />);
      runSearch();

      await screen.findByTestId('commute-route-error');
      expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBeNull();
      expect(planned).toHaveLength(0);
    } finally {
      eventBus.off('ROUTE_PLANNED', onPlanned);
    }
  });

  it('re-enables the form after a failure', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockRejectedValue(
      new Error('Could not calculate routes')
    );

    render(<Commute />);
    runSearch();

    await screen.findByTestId('commute-route-error');
    expect(screen.getByText('Find Cleanest Route')).not.toBeDisabled();
  });

  it('clears the previous error when a later search succeeds', async () => {
    vi.mocked(routePlanner.calculateCleanRoute)
      .mockRejectedValueOnce(new Error('Could not calculate routes'))
      .mockResolvedValueOnce(successResult);

    render(<Commute />);
    runSearch();
    await screen.findByTestId('commute-route-error');

    runSearch();

    await waitFor(() => expect(screen.getByText('Route Selected')).toBeInTheDocument());
    expect(screen.queryByTestId('commute-route-error')).not.toBeInTheDocument();
  });

  it('lets the user dismiss the error', async () => {
    vi.mocked(routePlanner.calculateCleanRoute).mockRejectedValue(
      new Error('Could not calculate routes')
    );

    render(<Commute />);
    runSearch();

    await screen.findByTestId('commute-route-error');
    fireEvent.click(screen.getByLabelText('Dismiss route error'));

    expect(screen.queryByTestId('commute-route-error')).not.toBeInTheDocument();
  });
});
