import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RouteResults from './RouteResults';

/**
 * Regression cover for #667 — RouteResults was rendered by Commute.jsx without
 * `mode`, `routeHistory` or `applyHistoryEntry`, and dereferenced `routeHistory`
 * unconditionally on both of its branches. The Clean Route Planner tab threw
 * before painting anything.
 */

const measuredRoute = {
  distance: '5.00',
  duration: '15',
  pm25: '20.0',
  inhaledDose: '5.2',
  mode: 'driving',
  measured: true,
  measuredCheckpoints: 2,
  totalCheckpoints: 2,
};

const historyEntries = [
  { origin: 'Connaught Place', destination: 'India Gate', timestamp: '2026-08-10T09:00:00.000Z' },
  { origin: 'Hauz Khas', destination: 'Saket', timestamp: '2026-08-09T09:00:00.000Z' },
];

describe('RouteResults - required prop resilience (#667)', () => {
  it('renders the empty state without a routeHistory prop instead of throwing', () => {
    expect(() => render(<RouteResults routes={[]} />)).not.toThrow();
    expect(screen.queryByTestId('commute-history')).not.toBeInTheDocument();
  });

  it('renders the results view without a routeHistory prop instead of throwing', () => {
    expect(() =>
      render(<RouteResults routes={[measuredRoute]} pollutionDataAvailable />)
    ).not.toThrow();

    // The crash in #667 happened on this branch too, after the stats block had
    // already been built — so assert the results actually made it to the DOM.
    expect(screen.getByText('Route Selected')).toBeInTheDocument();
    expect(screen.getByText('20.0 µg/m³')).toBeInTheDocument();
  });

  it('falls back to the empty state when activeRouteIndex points past the results', () => {
    expect(() =>
      render(<RouteResults routes={[measuredRoute]} activeRouteIndex={4} />)
    ).not.toThrow();
    expect(screen.queryByText('Route Selected')).not.toBeInTheDocument();
  });
});

describe('RouteResults - Recent Routes', () => {
  it('lists history entries when there are no routes yet', () => {
    render(
      <RouteResults routes={[]} routeHistory={historyEntries} applyHistoryEntry={vi.fn()} />
    );

    expect(screen.getByText('Recent Routes')).toBeInTheDocument();
    expect(screen.getByText('Connaught Place → India Gate')).toBeInTheDocument();
    expect(screen.getByText('Hauz Khas → Saket')).toBeInTheDocument();
  });

  it('lists history entries alongside results', () => {
    render(
      <RouteResults
        routes={[measuredRoute]}
        pollutionDataAvailable
        routeHistory={historyEntries}
        applyHistoryEntry={vi.fn()}
      />
    );

    expect(screen.getByText('Route Options')).toBeInTheDocument();
    expect(screen.getByTestId('commute-history')).toBeInTheDocument();
    expect(screen.getByText('Connaught Place → India Gate')).toBeInTheDocument();
  });

  it('hands the clicked entry back to applyHistoryEntry', () => {
    const applyHistoryEntry = vi.fn();
    render(
      <RouteResults
        routes={[]}
        routeHistory={historyEntries}
        applyHistoryEntry={applyHistoryEntry}
      />
    );

    fireEvent.click(screen.getByText('Hauz Khas → Saket'));

    expect(applyHistoryEntry).toHaveBeenCalledTimes(1);
    expect(applyHistoryEntry).toHaveBeenCalledWith(historyEntries[1]);
  });

  it('renders nothing at all when there is no history and no routes', () => {
    const { container } = render(<RouteResults routes={[]} routeHistory={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the history list once, not once per branch', () => {
    render(
      <RouteResults
        routes={[measuredRoute]}
        pollutionDataAvailable
        routeHistory={historyEntries}
        applyHistoryEntry={vi.fn()}
      />
    );

    expect(screen.getAllByText('Recent Routes')).toHaveLength(1);
  });
});

describe('RouteResults - mode label', () => {
  it('uses the route own mode when it carries one', () => {
    render(<RouteResults routes={[measuredRoute]} mode="foot" pollutionDataAvailable />);
    expect(screen.getByText('driving')).toBeInTheDocument();
  });

  it('falls back to the mode prop when the route does not carry one', () => {
    const { mode, ...withoutMode } = measuredRoute;
    render(<RouteResults routes={[withoutMode]} mode="biking" pollutionDataAvailable />);
    expect(screen.getByText('biking')).toBeInTheDocument();
  });
});
