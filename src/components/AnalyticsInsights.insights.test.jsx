import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * Cover for #1053, at the component level.
 *
 * `aiInsightsService` is mocked so these exercise the panel's own handling —
 * escaping and request ordering — without a year of archive data behind them.
 */

const generateAIInsights = vi.fn();
vi.mock('../services/aiInsightsService', () => ({
  generateAIInsights: (...args) => generateAIInsights(...args),
}));

vi.mock('recharts', async () => {
  const Stub = ({ children }) => <div>{children}</div>;
  return {
    AreaChart: Stub, Area: Stub, XAxis: Stub, YAxis: Stub,
    Tooltip: Stub, CartesianGrid: Stub, ResponsiveContainer: Stub,
  };
});

vi.mock('../utils/chartExport', () => ({
  exportToSVG: vi.fn(() => true),
  exportToPNG: vi.fn(() => Promise.resolve()),
}));

const AnalyticsInsights = (await import('./AnalyticsInsights')).default;

/** @param {Partial<any>} [overrides] */
function insight(overrides = {}) {
  return {
    id: 'seasonal-extremes',
    icon: '📅',
    title: 'Seasonal Extremes',
    description: 'Based on the past year in Delhi, **January 2026** was worst.',
    confidence: 'High',
    source: 'Historical Data Aggregation',
    ...overrides,
  };
}

/** A promise plus the functions that settle it, for ordering tests. */
function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

describe('AnalyticsInsights — insight text is escaped (#1053)', () => {
  beforeEach(() => {
    generateAIInsights.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders the bold marker as an element and everything else as text', async () => {
    generateAIInsights.mockResolvedValue({ insights: [insight()], error: null });

    render(<AnalyticsInsights lat={28.6} lon={77.2} cityName="Delhi" />);

    await waitFor(() => expect(screen.getByText('January 2026').tagName).toBe('STRONG'));
  });

  it('does not build elements from a hostile location name', async () => {
    // `cityName` reaches `description` by interpolation in aiInsightsService,
    // and comes from the geocoder's answer to text the visitor typed.
    generateAIInsights.mockResolvedValue({
      insights: [
        insight({
          description:
            'Based on the past year in <img src=x onerror="window.__xss=1">, **June** was cleanest.',
        }),
      ],
      error: null,
    });

    const { container } = render(
      <AnalyticsInsights lat={28.6} lon={77.2} cityName='<img src=x onerror="window.__xss=1">' />
    );

    await waitFor(() => expect(screen.getByText('June').tagName).toBe('STRONG'));

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
    expect(window.__xss).toBeUndefined();
  });

  it('does not throw when an insight arrives without a description', async () => {
    generateAIInsights.mockResolvedValue({
      insights: [insight({ description: undefined })],
      error: null,
    });

    render(<AnalyticsInsights lat={28.6} lon={77.2} cityName="Delhi" />);

    // The title still renders; only the body is empty.
    await waitFor(() => expect(screen.getByText('Seasonal Extremes')).toBeInTheDocument());
  });
});

describe('AnalyticsInsights — stale requests (#1053)', () => {
  beforeEach(() => {
    generateAIInsights.mockReset();
  });

  it('ignores a response for a city that is no longer selected', async () => {
    const delhi = deferred();
    const mumbai = deferred();
    generateAIInsights
      .mockImplementationOnce(() => delhi.promise)
      .mockImplementationOnce(() => mumbai.promise);

    const { rerender } = render(
      <AnalyticsInsights lat={28.6} lon={77.2} cityName="Delhi" />
    );

    rerender(<AnalyticsInsights lat={19.0} lon={72.8} cityName="Mumbai" />);

    // Mumbai answers first, then Delhi's slower request lands.
    mumbai.resolve({ insights: [insight({ id: 'm', title: 'Mumbai insight' })], error: null });
    await waitFor(() => expect(screen.getByText('Mumbai insight')).toBeInTheDocument());

    delhi.resolve({ insights: [insight({ id: 'd', title: 'Delhi insight' })], error: null });

    await waitFor(() => expect(screen.getByText('Mumbai insight')).toBeInTheDocument());
    expect(screen.queryByText('Delhi insight')).not.toBeInTheDocument();
  });

  it('does not apply a late error over the current city', async () => {
    const first = deferred();
    const second = deferred();
    generateAIInsights
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);

    const { rerender } = render(<AnalyticsInsights lat={28.6} lon={77.2} cityName="Delhi" />);
    rerender(<AnalyticsInsights lat={19.0} lon={72.8} cityName="Mumbai" />);

    second.resolve({ insights: [insight({ id: 'm', title: 'Mumbai insight' })], error: null });
    await waitFor(() => expect(screen.getByText('Mumbai insight')).toBeInTheDocument());

    first.resolve({ insights: [], error: 'No historical data available.' });

    await waitFor(() => expect(screen.getByText('Mumbai insight')).toBeInTheDocument());
    expect(screen.queryByText('No historical data available.')).not.toBeInTheDocument();
  });

  it('does not fetch at all without coordinates', () => {
    render(<AnalyticsInsights cityName="Delhi" />);
    expect(generateAIInsights).not.toHaveBeenCalled();
  });
});
