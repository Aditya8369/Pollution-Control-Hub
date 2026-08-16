import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

const TRANSPORT_MODE_KEY = 'pollution-hub-commute-mode';
const SAVED_LOCATIONS_KEY = 'commute-saved-locations';

/**
 * Commute.jsx was left importing the deleted CommuteForm and calling useEffect without
 * importing it, so the tab could not render at all. These cover the pieces that were
 * silently wired to nothing once the form was split into RouteForm / SavedLocations /
 * RouteHistory, so a future split fails here rather than in the browser.
 */
describe('Commute - transport mode persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('defaults to driving with nothing stored', () => {
    render(<Commute />);

    expect(screen.getByRole('button', { name: 'Driving' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Cycling' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('writes the chosen mode to storage', () => {
    render(<Commute />);

    fireEvent.click(screen.getByRole('button', { name: 'Cycling' }));

    expect(localStorage.getItem(TRANSPORT_MODE_KEY)).toBe('biking');
    expect(screen.getByRole('button', { name: 'Cycling' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('restores the stored mode on the next mount', () => {
    // The write side already worked; the read side was missing entirely, so the
    // preference was discarded on every reload.
    localStorage.setItem(TRANSPORT_MODE_KEY, 'foot');

    render(<Commute />);

    expect(screen.getByRole('button', { name: 'Walking' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Driving' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('falls back to driving for a mode the planner no longer offers', () => {
    localStorage.setItem(TRANSPORT_MODE_KEY, 'teleport');

    render(<Commute />);

    expect(screen.getByRole('button', { name: 'Driving' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('survives localStorage being unreadable', () => {
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new DOMException('denied', 'SecurityError');
      });

    expect(() => render(<Commute />)).not.toThrow();
    expect(screen.getByRole('button', { name: 'Driving' })).toHaveAttribute('aria-pressed', 'true');

    getItem.mockRestore();
  });
});

describe('Commute - saved locations wiring', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('renders nothing when there is nothing saved', () => {
    render(<Commute />);

    expect(screen.queryByText('Saved Locations')).not.toBeInTheDocument();
  });

  it('shows saved chips, which SavedLocations was never mounted to display', () => {
    localStorage.setItem(
      SAVED_LOCATIONS_KEY,
      JSON.stringify([{ id: 'a1', label: 'Home', value: 'Hauz Khas' }])
    );

    render(<Commute />);

    expect(screen.getByText('Saved Locations')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('fills the starting point from a saved chip', () => {
    localStorage.setItem(
      SAVED_LOCATIONS_KEY,
      JSON.stringify([{ id: 'a1', label: 'Home', value: 'Hauz Khas' }])
    );

    render(<Commute />);
    fireEvent.click(screen.getByText('Home'));

    expect(screen.getByPlaceholderText('e.g. Connaught Place')).toHaveValue('Hauz Khas');
  });

  it('fills the destination from the same chip group', () => {
    localStorage.setItem(
      SAVED_LOCATIONS_KEY,
      JSON.stringify([{ id: 'a1', label: 'Office', value: 'Saket' }])
    );

    render(<Commute />);
    fireEvent.click(screen.getByText('→ Dest'));

    expect(screen.getByPlaceholderText('e.g. India Gate')).toHaveValue('Saket');
  });

  it('removes a saved chip', () => {
    localStorage.setItem(
      SAVED_LOCATIONS_KEY,
      JSON.stringify([{ id: 'a1', label: 'Home', value: 'Hauz Khas' }])
    );

    render(<Commute />);
    fireEvent.click(screen.getByLabelText('Remove saved location Home'));

    expect(screen.queryByText('Saved Locations')).not.toBeInTheDocument();
  });
});
