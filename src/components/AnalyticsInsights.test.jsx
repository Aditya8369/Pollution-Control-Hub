import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AnalyticsInsights, { formatKpi, buildTrendSeries } from './AnalyticsInsights';

/**
 * #896. Two defects, one file.
 *
 * The component read `analytics.weekly` and called `trend.slice()` with no guard, no
 * default and no propTypes. There is no error boundary between it and `Dashboard`, so a
 * missing prop threw during render and took the whole dashboard down — which is what
 * five unrelated city-comparison tests were failing on.
 *
 * The second is quieter. `estimateWeeklyMonthlyAverages()` returns nulls when nothing
 * could be measured, and `{null}` renders as nothing, so a gappy day showed three
 * labelled tiles with no numbers under them.
 */

// recharts measures its container, which jsdom reports as 0x0 — ResponsiveContainer then
// renders nothing and the chart assertions have nothing to look at. Stubbed to a plain
// wrapper so the surrounding logic (empty state vs. chart) is what is under test.
vi.mock('recharts', async () => {
    const actual = await vi.importActual('recharts');
    return {
        ...actual,
        ResponsiveContainer: ({ children }) => (
            <div data-testid="chart-container">{children}</div>
        ),
    };
});

const exportToSVG = vi.hoisted(() => vi.fn());
const exportToPNG = vi.hoisted(() => vi.fn());
vi.mock('../utils/chartExport', () => ({ exportToSVG, exportToPNG }));

afterEach(() => {
    vi.clearAllMocks();
});

beforeEach(() => {
    exportToSVG.mockReturnValue(true);
    exportToPNG.mockResolvedValue(undefined);
});

/** An hour's worth of trend, `count` entries long. */
function trendOf(count, value = 100) {
    return Array.from({ length: count }, () => ({ us_aqi: value }));
}

describe('formatKpi', () => {
    it('rounds a real reading', () => {
        expect(formatKpi(104.6)).toEqual({ text: '105', isMeasured: true });
        expect(formatKpi(0)).toEqual({ text: '0', isMeasured: true });
    });

    it('marks null as unmeasured rather than rendering nothing', () => {
        // `{null}` in JSX renders an empty tile, which reads as a rendering fault or,
        // worse, as a zero.
        expect(formatKpi(null)).toEqual({ text: '—', isMeasured: false });
        expect(formatKpi(undefined)).toEqual({ text: '—', isMeasured: false });
    });

    it('marks non-finite numbers as unmeasured', () => {
        expect(formatKpi(NaN).isMeasured).toBe(false);
        expect(formatKpi(Infinity).isMeasured).toBe(false);
    });

    it('marks a non-number as unmeasured', () => {
        expect(formatKpi('105').isMeasured).toBe(false);
        expect(formatKpi({}).isMeasured).toBe(false);
    });
});

describe('buildTrendSeries', () => {
    it('takes the last `timeRange` hours', () => {
        const series = buildTrendSeries(trendOf(48), 24);

        expect(series).toHaveLength(24);
        expect(series[0].hour).toBe('H1');
        expect(series[23].hour).toBe('H24');
    });

    it('drops hours with no reading instead of plotting them at zero', () => {
        const series = buildTrendSeries(
            [{ us_aqi: 90 }, { us_aqi: null }, { us_aqi: 110 }, {}],
            24
        );

        expect(series.map((p) => p.aqi)).toEqual([90, 110]);
    });

    it('survives anything that is not an array', () => {
        expect(buildTrendSeries(undefined, 24)).toEqual([]);
        expect(buildTrendSeries(null, 24)).toEqual([]);
        expect(buildTrendSeries({}, 24)).toEqual([]);
    });

    it('falls back to a sane window for a missing or nonsensical timeRange', () => {
        expect(buildTrendSeries(trendOf(48), undefined)).toHaveLength(24);
        expect(buildTrendSeries(trendOf(48), 0)).toHaveLength(24);
        expect(buildTrendSeries(trendOf(48), -5)).toHaveLength(24);
    });
});

describe('AnalyticsInsights - surviving missing props', () => {
    it('renders with no props at all', () => {
        // This is the crash: `Cannot read properties of undefined (reading 'weekly')`,
        // thrown from render and propagated up through Dashboard.
        expect(() => render(<AnalyticsInsights />)).not.toThrow();
        expect(screen.getByTestId('analytics-insights')).toBeInTheDocument();
    });

    it('renders with analytics present but trend missing', () => {
        expect(() =>
            render(<AnalyticsInsights analytics={{ weekly: 100, monthly: 105, prediction: 102 }} />)
        ).not.toThrow();
    });

    it('renders with trend present but analytics missing', () => {
        expect(() => render(<AnalyticsInsights trend={trendOf(24)} timeRange={24} />)).not.toThrow();
        expect(screen.getByTestId('analytics-kpi-weekly')).toHaveTextContent('—');
    });
});

describe('AnalyticsInsights - unmeasured values', () => {
    it('says so rather than leaving the tiles blank', () => {
        render(
            <AnalyticsInsights
                analytics={{ weekly: null, monthly: null, prediction: null }}
                trend={trendOf(24)}
                timeRange={24}
            />
        );

        expect(screen.getByTestId('analytics-kpi-weekly')).toHaveTextContent('—');
        expect(screen.getByTestId('analytics-kpi-monthly')).toHaveTextContent('—');
        expect(screen.getByTestId('analytics-kpi-prediction')).toHaveTextContent('—');
    });

    it('gives each placeholder an accessible reason, not just punctuation', () => {
        render(<AnalyticsInsights analytics={{ weekly: null }} />);

        // An em-dash carries no meaning to a screen reader — it reads as a pause, or as
        // nothing at all. The label says which tile and why.
        expect(screen.getAllByLabelText(/Not enough data/i)).toHaveLength(3);
        expect(
            screen.getByLabelText(/Weekly Avg AQI: Not enough data/i)
        ).toBeInTheDocument();
    });

    it('shows the measured values it does have alongside the ones it does not', () => {
        render(
            <AnalyticsInsights
                analytics={{ weekly: 104, monthly: null, prediction: 107 }}
                trend={trendOf(24)}
                timeRange={24}
            />
        );

        expect(screen.getByTestId('analytics-kpi-weekly')).toHaveTextContent('104');
        expect(screen.getByTestId('analytics-kpi-monthly')).toHaveTextContent('—');
        expect(screen.getByTestId('analytics-kpi-prediction')).toHaveTextContent('107');
    });
});

describe('AnalyticsInsights - the chart', () => {
    it('renders the chart when there are readings to plot', () => {
        render(<AnalyticsInsights trend={trendOf(24)} timeRange={24} />);

        expect(screen.getByTestId('chart-container')).toBeInTheDocument();
        expect(screen.queryByTestId('analytics-chart-empty')).not.toBeInTheDocument();
    });

    it('explains an empty window instead of drawing a bare axis', () => {
        render(<AnalyticsInsights trend={[]} timeRange={24} />);

        expect(screen.getByTestId('analytics-chart-empty')).toBeInTheDocument();
        expect(screen.queryByTestId('chart-container')).not.toBeInTheDocument();
    });

    it('treats a window of nothing but nulls as empty', () => {
        render(<AnalyticsInsights trend={[{ us_aqi: null }, {}, { us_aqi: null }]} timeRange={24} />);

        expect(screen.getByTestId('analytics-chart-empty')).toBeInTheDocument();
    });

    it('disables the export buttons when there is nothing to export', () => {
        render(<AnalyticsInsights trend={[]} timeRange={24} />);

        // These used to write a file containing an empty axis, which is a worse answer
        // than not offering the button.
        expect(screen.getByRole('button', { name: 'SVG' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'PNG' })).toBeDisabled();
    });

    it('enables the export buttons once there is a chart', () => {
        render(<AnalyticsInsights trend={trendOf(24)} timeRange={24} />);

        expect(screen.getByRole('button', { name: 'SVG' })).toBeEnabled();
        expect(screen.getByRole('button', { name: 'PNG' })).toBeEnabled();
    });
});

/**
 * #904. `exportToPNG` was fire-and-forget, so a browser that refused to encode the
 * canvas produced no file and no message — the button simply did nothing.
 */
describe('AnalyticsInsights - export failures', () => {
    it('says so when the PNG export fails', async () => {
        exportToPNG.mockRejectedValue(new Error('The canvas could not be encoded as a PNG'));

        render(<AnalyticsInsights trend={trendOf(24)} timeRange={24} />);
        fireEvent.click(screen.getByRole('button', { name: 'PNG' }));

        expect(await screen.findByTestId('analytics-export-error')).toHaveTextContent(
            /could not be exported/i
        );
    });

    it('says so when there is no chart for the SVG export to find', () => {
        exportToSVG.mockReturnValue(false);

        render(<AnalyticsInsights trend={trendOf(24)} timeRange={24} />);
        fireEvent.click(screen.getByRole('button', { name: 'SVG' }));

        expect(screen.getByTestId('analytics-export-error')).toBeInTheDocument();
    });

    it('shows nothing when the export succeeds', async () => {
        exportToSVG.mockReturnValue(true);
        exportToPNG.mockResolvedValue(undefined);

        render(<AnalyticsInsights trend={trendOf(24)} timeRange={24} />);
        fireEvent.click(screen.getByRole('button', { name: 'SVG' }));
        fireEvent.click(screen.getByRole('button', { name: 'PNG' }));

        await waitFor(() =>
            expect(screen.queryByTestId('analytics-export-error')).not.toBeInTheDocument()
        );
    });
});

