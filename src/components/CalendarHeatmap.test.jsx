import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CalendarHeatmap from './CalendarHeatmap';

function days(dateStrings, aqi = 50) {
  return dateStrings.map((date) => ({ date, maxAqi: aqi }));
}

describe('CalendarHeatmap - rendering', () => {
  it('renders the empty state when given no data', () => {
    render(<CalendarHeatmap data={[]} />);
    expect(screen.getByText('No historical data available.')).toBeInTheDocument();
  });

  it('labels a measured day with its AQI and band', () => {
    render(<CalendarHeatmap data={[{ date: '2024-01-01', maxAqi: 42 }]} />);

    expect(
      screen.getByLabelText('2024-01-01: AQI 42, Good')
    ).toBeInTheDocument();
  });

  it('renders a day with no reading as "no reading", not as AQI 0', () => {
    render(<CalendarHeatmap data={[{ date: '2024-01-01', maxAqi: null }]} />);

    expect(screen.getByLabelText('2024-01-01: no reading available')).toBeInTheDocument();
    // The old code would have coloured this green through getAQIBand(0).
    expect(screen.queryByLabelText(/AQI 0/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Good/)).not.toBeInTheDocument();
  });

  it('does not print "AQI null" in the native tooltip', () => {
    const { container } = render(
      <CalendarHeatmap data={[{ date: '2024-01-01', maxAqi: null }]} />
    );

    const titles = [...container.querySelectorAll('[title]')].map((el) => el.getAttribute('title'));
    expect(titles.some((t) => t.includes('null'))).toBe(false);
    expect(titles).toContain('2024-01-01: no reading');
  });

  it('still colours a genuine reading of zero', () => {
    render(<CalendarHeatmap data={[{ date: '2024-01-01', maxAqi: 0 }]} />);

    expect(screen.getByLabelText('2024-01-01: AQI 0, Good')).toBeInTheDocument();
  });
});

describe('CalendarHeatmap - gaps (regression for #646)', () => {
  it('renders a cell for a date absent from the data', () => {
    render(<CalendarHeatmap data={days(['2024-01-01', '2024-01-02', '2024-01-04'])} />);

    // 2024-01-03 never appears in `data`; the grid reinstates it as unmeasured
    // rather than closing the gap and shifting the 4th into its place.
    expect(screen.getByLabelText('2024-01-03: no reading available')).toBeInTheDocument();
    expect(screen.getByLabelText('2024-01-04: AQI 50, Good')).toBeInTheDocument();
  });

  it('reports coverage when days are missing', () => {
    render(<CalendarHeatmap data={days(['2024-01-01', '2024-01-02', '2024-01-04'])} />);

    expect(screen.getByTestId('calendar-coverage')).toHaveTextContent(
      /3 of 4 days .* have a reading; 1 have none/i
    );
  });

  it('says nothing about coverage when the range is complete', () => {
    render(<CalendarHeatmap data={days(['2024-01-01', '2024-01-02', '2024-01-03'])} />);

    expect(screen.queryByTestId('calendar-coverage')).not.toBeInTheDocument();
  });

  it('renders every column as a full week', () => {
    const { container } = render(
      <CalendarHeatmap data={days(['2024-01-01', '2024-01-02', '2024-01-03'])} />
    );

    const weekColumns = container.querySelectorAll('.calendar-heatmap-week');
    expect(weekColumns.length).toBeGreaterThan(0);
    for (const column of weekColumns) {
      expect(column.children).toHaveLength(7);
    }
  });
});

describe('CalendarHeatmap - legend', () => {
  it('includes a "No reading" swatch so the grey cells are explained', () => {
    render(<CalendarHeatmap data={[{ date: '2024-01-01', maxAqi: 42 }]} />);

    expect(screen.getByText('No reading')).toBeInTheDocument();
  });

  it('keeps the six AQI bands', () => {
    render(<CalendarHeatmap data={[{ date: '2024-01-01', maxAqi: 42 }]} />);

    for (const label of [
      'Moderate',
      'Unhealthy (Sensitive)',
      'Unhealthy',
      'Very Unhealthy',
      'Hazardous',
    ]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });
});
