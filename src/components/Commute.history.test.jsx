import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Commute from './Commute';

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

/**
 * Commute renders RouteResults; #667 was that it did so without three of the props
 * RouteResults reads. These assert the wiring from the Commute side, so a future
 * edit that drops a prop again fails here rather than in whatever tab happens to
 * mount the component.
 *
 * History is seeded through localStorage — useRouteHistory hydrates from it — which
 * keeps this independent of the search path.
 */
describe('Commute - RouteResults prop wiring (#667)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('mounts with no history and no routes', () => {
    expect(() => render(<Commute />)).not.toThrow();
    expect(screen.getByText('Clean Route Planner')).toBeInTheDocument();
  });

  it('passes routeHistory through, so Recent Routes renders', () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        { origin: 'Connaught Place', destination: 'India Gate', timestamp: '2026-08-10T09:00:00.000Z' },
      ])
    );

    render(<Commute />);

    expect(screen.getByText('Recent Routes')).toBeInTheDocument();
    expect(screen.getByText('Connaught Place → India Gate')).toBeInTheDocument();
  });

  it('passes applyHistoryEntry through, so a history entry refills the form', () => {
    localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify([
        { origin: 'Hauz Khas', destination: 'Saket', timestamp: '2026-08-10T09:00:00.000Z' },
      ])
    );

    render(<Commute />);
    fireEvent.click(screen.getByText('Hauz Khas → Saket'));

    expect(screen.getByPlaceholderText('e.g. Connaught Place')).toHaveValue('Hauz Khas');
    expect(screen.getByPlaceholderText('e.g. India Gate')).toHaveValue('Saket');
  });

  it('tolerates a corrupt history entry in storage', () => {
    localStorage.setItem(HISTORY_STORAGE_KEY, 'not json');
    expect(() => render(<Commute />)).not.toThrow();
    expect(screen.queryByText('Recent Routes')).not.toBeInTheDocument();
  });
});
