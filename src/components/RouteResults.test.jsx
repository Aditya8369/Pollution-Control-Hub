import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RouteResults from './RouteResults';

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

describe('RouteResults - required prop resilience (#667)', () => {
  it('renders nothing when routes are empty instead of throwing', () => {
    const { container } = render(<RouteResults routes={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the results view instead of throwing', () => {
    expect(() =>
      render(<RouteResults routes={[measuredRoute]} pollutionDataAvailable />)
    ).not.toThrow();

    expect(screen.getByText('Route Selected')).toBeInTheDocument();
    expect(screen.getByText('20.0 µg/m³')).toBeInTheDocument();
  });

  it('falls back to the empty state when activeRouteIndex points past the results', () => {
    const { container } = render(<RouteResults routes={[measuredRoute]} activeRouteIndex={4} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('RouteResults - mode label', () => {
  it('uses the route own mode when it carries one', () => {
    render(<RouteResults routes={[measuredRoute]} mode="foot" pollutionDataAvailable />);
    expect(screen.getByText('driving')).toBeInTheDocument();
  });

  it('falls back to the mode prop when the route does not carry one', () => {
    const withoutMode = { ...measuredRoute };
    delete withoutMode.mode;

    render(<RouteResults routes={[withoutMode]} mode="biking" pollutionDataAvailable />);
    expect(screen.getByText('biking')).toBeInTheDocument();
  });
});
