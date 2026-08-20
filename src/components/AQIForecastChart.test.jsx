import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AQIForecastChart from './AQIForecastChart';

/**
 * #897. There were two components with this name — a `.jsx` and a `.tsx`, same directory,
 * same export, different endpoints — and nothing imported either. Neither had an error
 * state, because neither needed one: the service could not fail, it fabricated a
 * forecast instead. Now that it throws, these three states are the component.
 */

const fetchAQIForecast = vi.hoisted(() => vi.fn());
vi.mock('../services/forecastService', async () => {
    const actual = await vi.importActual('../services/forecastService');
    return { ...actual, fetchAQIForecast };
});

vi.mock('recharts', async () => {
    const actual = await vi.importActual('recharts');
    return {
        ...actual,
        // jsdom measures the container as 0x0, so ResponsiveContainer renders nothing
        // and there is no chart to assert against.
        ResponsiveContainer: ({ children }) => <div data-testid="chart-container">{children}</div>,
    };
});

const FORECAST = {
    source: 'open-meteo',
    horizonHours: 3,
    fetchedAt: 0,
    predictions: [
        { time: 'Now', timestamp: '2026-08-20T15:00', aqi: 120, lower: 110, upper: 130, hazardous: true, band: 'Unhealthy (Sensitive)' },
        { time: '4pm', timestamp: '2026-08-20T16:00', aqi: 165, lower: 152, upper: 178, hazardous: true, band: 'Unhealthy' },
        { time: '5pm', timestamp: '2026-08-20T17:00', aqi: 90, lower: 83, upper: 97, hazardous: false, band: 'Moderate' },
    ],
};

beforeEach(() => {
    fetchAQIForecast.mockReset();
});

afterEach(() => {
    vi.clearAllMocks();
});

describe('AQIForecastChart', () => {
    it('shows a loading state while the request is in flight', () => {
        fetchAQIForecast.mockReturnValue(new Promise(() => { }));

        render(<AQIForecastChart lat={28.6139} lon={77.209} />);

        expect(screen.getByTestId('forecast-loading')).toBeInTheDocument();
    });

    it('renders the chart once the forecast arrives', async () => {
        fetchAQIForecast.mockResolvedValue(FORECAST);

        render(<AQIForecastChart lat={28.6139} lon={77.209} cityName="Delhi" />);

        await waitFor(() => expect(screen.getByTestId('chart-container')).toBeInTheDocument());
        expect(screen.queryByTestId('forecast-error')).not.toBeInTheDocument();
    });

    it('names the peak hour rather than making the reader find it on the axis', async () => {
        fetchAQIForecast.mockResolvedValue(FORECAST);

        render(<AQIForecastChart lat={28.6139} lon={77.209} />);

        const peak = await screen.findByTestId('forecast-peak');
        expect(peak).toHaveTextContent('165');
        expect(peak).toHaveTextContent('Unhealthy');
        expect(peak).toHaveTextContent('4pm');
    });

    it('says the number is a projection, not a measurement', async () => {
        fetchAQIForecast.mockResolvedValue(FORECAST);

        render(<AQIForecastChart lat={28.6139} lon={77.209} />);

        expect(await screen.findByText(/a projection from Open-Meteo, not a measurement/i)).toBeInTheDocument();
    });

    it('reports a failure instead of drawing something', async () => {
        fetchAQIForecast.mockRejectedValue(new Error('Forecast request failed: 503'));

        render(<AQIForecastChart lat={28.6139} lon={77.209} />);

        // The old chart could not reach this state: the service answered every failure
        // with a hardcoded "Tomorrow 5 PM, AQI 178, hazardous".
        const error = await screen.findByTestId('forecast-error');
        expect(error).toHaveTextContent(/unavailable/i);
        expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument();
        expect(screen.queryByTestId('forecast-peak')).not.toBeInTheDocument();
    });

    it('keeps the upstream status code out of the panel', async () => {
        fetchAQIForecast.mockRejectedValue(new Error('Forecast request failed: 503'));

        render(<AQIForecastChart lat={28.6139} lon={77.209} />);

        await screen.findByTestId('forecast-error');
        // A status code is not something a visitor can act on.
        expect(screen.queryByText(/503/)).not.toBeInTheDocument();
    });

    it('does not ask for a forecast without a location', () => {
        render(<AQIForecastChart />);

        expect(fetchAQIForecast).not.toHaveBeenCalled();
        expect(screen.getByTestId('forecast-error')).toHaveTextContent(/no location/i);
    });

    it('refetches when the location changes', async () => {
        fetchAQIForecast.mockResolvedValue(FORECAST);

        const { rerender } = render(<AQIForecastChart lat={28.6139} lon={77.209} />);
        await screen.findByTestId('forecast-peak');

        rerender(<AQIForecastChart lat={19.076} lon={72.877} />);
        await waitFor(() => expect(fetchAQIForecast).toHaveBeenCalledTimes(2));
        expect(fetchAQIForecast.mock.calls[1].slice(0, 2)).toEqual([19.076, 72.877]);
    });

    it('ignores a response that lands after the location moved on', async () => {
        let resolveFirst;
        fetchAQIForecast
            .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
            .mockResolvedValue({ ...FORECAST, predictions: [{ ...FORECAST.predictions[0], aqi: 42, time: 'Now' }] });

        const { rerender } = render(<AQIForecastChart lat={28.6139} lon={77.209} />);
        rerender(<AQIForecastChart lat={19.076} lon={72.877} />);

        await screen.findByTestId('forecast-peak');
        resolveFirst(FORECAST);

        // Delhi's 165 must not overwrite Mumbai's 42 just because it finished last.
        await waitFor(() => expect(screen.getByTestId('forecast-peak')).toHaveTextContent('42'));
    });

    it('aborts the request when it unmounts', async () => {
        fetchAQIForecast.mockReturnValue(new Promise(() => { }));

        const { unmount } = render(<AQIForecastChart lat={28.6139} lon={77.209} />);
        const { signal } = fetchAQIForecast.mock.calls[0][2];

        expect(signal.aborted).toBe(false);
        unmount();
        expect(signal.aborted).toBe(true);
    });
});
