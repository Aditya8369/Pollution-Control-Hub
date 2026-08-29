import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

/** Cover for #1073, at the component level. */

const fetchAqiForecast = vi.fn();

vi.mock('../services/forecastAttributionService', () => ({
  fetchAqiForecast: (...args) => fetchAqiForecast(...args),
  fetchHistoricalAttribution: vi.fn(),
}));

const AqiForecastAttribution = (await import('./AqiForecastAttribution')).default;

/** @param {number} aqiMax @param {string} label */
function hour(aqiMax, label) {
  return { hour: label, aqiMin: aqiMax - 20, aqiMax, dominantPollutant: 'PM2.5' };
}

/** @param {Partial<any>} [overrides] */
function day(overrides = {}) {
  return {
    date: '2026-08-28',
    avgAqi: 168,
    minAqi: 120,
    maxAqi: 210,
    confidenceScore: 82,
    healthAdvisory: 'Sensitive groups should limit outdoor exertion.',
    attributions: [
      { source: 'VEHICULAR', percentage: 22, indicators: ['NO₂ morning peak'] },
      { source: 'INDUSTRIAL', percentage: 20, indicators: ['SO₂ signature'] },
      { source: 'BIOMASS', percentage: 19, indicators: ['Upwind fire counts'] },
      { source: 'CONSTRUCTION', percentage: 19, indicators: ['Coarse PM fraction'] },
      { source: 'NATURAL', percentage: 20, indicators: ['Dust transport'] },
    ],
    hourlyBreakdown: [
      hour(150, '00:00'),
      hour(150, '01:00'),
      hour(180, '02:00'),
      hour(140, '03:00'),
    ],
    ...overrides,
  };
}

/** @param {Partial<any>} [overrides] */
function response(overrides = {}) {
  return {
    location: 'Delhi',
    generatedAt: '2026-08-27T18:00:00.000Z',
    modelVersion: 'v2.1',
    forecasts: [day()],
    ...overrides,
  };
}

/** The trend cell of the row whose Time column reads `label`. */
function trendCellFor(label) {
  const row = screen.getByText(label).closest('tr');
  return row.cells[row.cells.length - 1];
}

beforeEach(() => {
  fetchAqiForecast.mockReset();
});

describe('AqiForecastAttribution — hourly trend (#1073)', () => {
  it('does not claim the first hour of the day is falling', async () => {
    fetchAqiForecast.mockResolvedValue(response());

    render(<AqiForecastAttribution />);
    await screen.findByText('00:00');

    // There is no hour before 00:00 to compare against; the old ternary printed
    // "↓ Falling" here on every day of every forecast.
    expect(trendCellFor('00:00')).not.toHaveTextContent(/falling/i);
    expect(trendCellFor('00:00')).toHaveTextContent(/no previous hour/i);
  });

  it('labels a flat hour steady rather than falling', async () => {
    fetchAqiForecast.mockResolvedValue(response());

    render(<AqiForecastAttribution />);
    await screen.findByText('01:00');

    expect(trendCellFor('01:00')).toHaveTextContent(/steady/i);
  });

  it('still labels a genuinely rising hour as rising', async () => {
    fetchAqiForecast.mockResolvedValue(response());

    render(<AqiForecastAttribution />);
    await screen.findByText('02:00');

    expect(trendCellFor('02:00')).toHaveTextContent(/rising/i);
  });

  it('still labels a genuinely falling hour as falling', async () => {
    fetchAqiForecast.mockResolvedValue(response());

    render(<AqiForecastAttribution />);
    await screen.findByText('03:00');

    expect(trendCellFor('03:00')).toHaveTextContent(/falling/i);
  });

  it('says so when a day has no hourly breakdown', async () => {
    fetchAqiForecast.mockResolvedValue(response({ forecasts: [day({ hourlyBreakdown: undefined })] }));

    render(<AqiForecastAttribution />);

    expect(await screen.findByText(/no hourly breakdown/i)).toBeInTheDocument();
  });
});

describe('AqiForecastAttribution — attribution bars (#1073)', () => {
  /** The filled part of the bar for `source`. */
  function barFillFor(source) {
    const bar = screen.getByRole('img', { name: new RegExp(`^${source}:`, 'i') });
    return bar.firstElementChild;
  }

  it('draws a share at its own width, not relative to the largest source', async () => {
    fetchAqiForecast.mockResolvedValue(response());
    render(<AqiForecastAttribution />);
    await screen.findByText('VEHICULAR');

    // 22 is the largest of the five, and used to be drawn at 100%.
    expect(barFillFor('VEHICULAR')).toHaveStyle({ width: '22%' });
    expect(barFillFor('BIOMASS')).toHaveStyle({ width: '19%' });
  });

  it('makes a dominant source visibly wider than a marginal one', async () => {
    fetchAqiForecast.mockResolvedValue(response({
      forecasts: [day({
        attributions: [
          { source: 'VEHICULAR', percentage: 80, indicators: [] },
          { source: 'NATURAL', percentage: 20, indicators: [] },
        ],
      })],
    }));
    render(<AqiForecastAttribution />);
    await screen.findByText('VEHICULAR');

    // Both were full-width and half-width respectively before; the point is
    // that 80 and 22 are no longer drawn identically across days.
    expect(barFillFor('VEHICULAR')).toHaveStyle({ width: '80%' });
    expect(barFillFor('NATURAL')).toHaveStyle({ width: '20%' });
  });

  it('says how much of the forecast is attributed', async () => {
    fetchAqiForecast.mockResolvedValue(response());
    render(<AqiForecastAttribution />);

    expect(await screen.findByText(/100% of the forecast attributed/i)).toBeInTheDocument();
  });

  it('does not present an incomplete account as a complete one', async () => {
    fetchAqiForecast.mockResolvedValue(response({
      forecasts: [day({
        attributions: [
          { source: 'VEHICULAR', percentage: 40, indicators: [] },
          { source: 'NATURAL', percentage: 20, indicators: [] },
        ],
      })],
    }));
    render(<AqiForecastAttribution />);

    expect(await screen.findByText(/60% of the forecast attributed/i)).toBeInTheDocument();
  });

  it('drops a malformed attribution instead of rendering NaN', async () => {
    fetchAqiForecast.mockResolvedValue(response({
      forecasts: [day({ attributions: [{ percentage: 40 }, { source: 'NATURAL', percentage: 20, indicators: [] }] })],
    }));
    render(<AqiForecastAttribution />);
    await screen.findByText('NATURAL');

    expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
  });
});

describe('AqiForecastAttribution — empty and partial responses (#1073)', () => {
  it('takes the empty branch when the response has no forecasts key', async () => {
    // `!forecastData.forecasts.length` threw here instead of reaching the
    // "No forecast data available" branch three lines below it.
    fetchAqiForecast.mockResolvedValue({ location: 'Delhi', modelVersion: 'v2.1' });

    render(<AqiForecastAttribution />);

    expect(await screen.findByText(/no forecast data available/i)).toBeInTheDocument();
  });

  it('takes the empty branch for an empty forecasts array', async () => {
    fetchAqiForecast.mockResolvedValue(response({ forecasts: [] }));

    render(<AqiForecastAttribution />);

    expect(await screen.findByText(/no forecast data available/i)).toBeInTheDocument();
  });

  it('shows the error message from a failed fetch', async () => {
    fetchAqiForecast.mockRejectedValue(new Error('Forecast model is retraining.'));

    render(<AqiForecastAttribution />);

    expect(await screen.findByText('Forecast model is retraining.')).toBeInTheDocument();
  });
});

describe('AqiForecastAttribution — the day tabs (#1073)', () => {
  it('marks the selected day as pressed', async () => {
    fetchAqiForecast.mockResolvedValue(response({
      forecasts: [day({ date: '2026-08-28' }), day({ date: '2026-08-29', avgAqi: 90 })],
    }));

    render(<AqiForecastAttribution />);
    const tabs = await screen.findAllByRole('button', { pressed: false });

    expect(tabs).toHaveLength(1);
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1);
  });

  it('switches the summary when another day is chosen', async () => {
    fetchAqiForecast.mockResolvedValue(response({
      forecasts: [day({ date: '2026-08-28' }), day({ date: '2026-08-29', avgAqi: 90 })],
    }));

    render(<AqiForecastAttribution />);
    await screen.findByText('168');

    const [, second] = screen.getAllByRole('button');
    fireEvent.click(second);

    expect(await screen.findByText('90')).toBeInTheDocument();
  });
});
