import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import SensorHealthDashboard, { readMetric, getScoreColor, formatPercentage } from './SensorHealthDashboard';
import { fetchHealthMetrics, acknowledgeAlert } from '../services/sensorMaintenanceService';

vi.mock('../services/sensorMaintenanceService', () => ({
    fetchHealthMetrics: vi.fn(),
    acknowledgeAlert: vi.fn(),
}));

const POLL_MS = 30000;

function healthPayload(overrides = {}) {
    return {
        healthScore: { sensorId: 'sensor_001', healthScore: 85, uptimePercentage: 99.2, ...overrides.healthScore },
        alerts: overrides.alerts ?? [],
    };
}

function alert(overrides = {}) {
    return {
        id: 'alert-1',
        alertType: 'FLATLINE',
        severity: 'MODERATE',
        description: 'Sensor reporting identical PM2.5 values consecutively.',
        detectedAt: '2026-08-27T10:00:00.000Z',
        acknowledged: false,
        ...overrides,
    };
}

/** Renders and waits for the first load to settle, so tests start from a loaded page. */
async function renderLoaded() {
    render(<SensorHealthDashboard />);
    await waitFor(() => expect(screen.queryByTestId('health-loading')).not.toBeInTheDocument());
}

beforeEach(() => {
    fetchHealthMetrics.mockResolvedValue(healthPayload());
    acknowledgeAlert.mockResolvedValue({ ok: true });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe('readMetric', () => {
    it('keeps a genuine zero', () => {
        // The whole point: zero is a legal value in both health_score and
        // uptime_percentage, and it is what a dead sensor looks like.
        expect(readMetric(0)).toBe(0);
    });

    it('accepts a numeric string, as DECIMAL columns arrive over JSON', () => {
        expect(readMetric('0.00')).toBe(0);
        expect(readMetric('98.50')).toBe(98.5);
    });

    it('reports genuinely absent values as null', () => {
        expect(readMetric(null)).toBeNull();
        expect(readMetric(undefined)).toBeNull();
        expect(readMetric('')).toBeNull();
        expect(readMetric('not a number')).toBeNull();
        expect(readMetric(NaN)).toBeNull();
    });
});

describe('getScoreColor', () => {
    it('does not colour an unknown score as failing', () => {
        expect(getScoreColor(null)).toBe('text-gray-400');
    });

    it('colours a zero score red rather than treating it as unknown', () => {
        expect(getScoreColor(0)).toBe('text-red-600');
    });

    it('bands the rest of the range', () => {
        expect(getScoreColor(80)).toBe('text-green-600');
        expect(getScoreColor(50)).toBe('text-yellow-600');
        expect(getScoreColor(49)).toBe('text-red-600');
    });
});

describe('formatPercentage', () => {
    it('never substitutes a plausible number for a missing measurement', () => {
        expect(formatPercentage(null)).toBe('No data');
        expect(formatPercentage(null)).not.toContain('98.5');
    });

    it('renders a real zero', () => {
        expect(formatPercentage(0)).toBe('0%');
    });

    it('keeps one decimal for fractional values', () => {
        expect(formatPercentage(99.24)).toBe('99.2%');
        expect(formatPercentage(100)).toBe('100%');
    });
});

describe('SensorHealthDashboard — zero is not the same as missing', () => {
    it('shows a dead sensor as 0% uptime, not 98.5%', async () => {
        fetchHealthMetrics.mockResolvedValue(
            healthPayload({ healthScore: { healthScore: 0, uptimePercentage: 0 } })
        );

        await renderLoaded();

        expect(screen.getByTestId('uptime')).toHaveTextContent('0%');
        expect(screen.getByTestId('uptime')).not.toHaveTextContent('98.5');
        expect(screen.getByTestId('health-score')).toHaveTextContent('0');
    });

    it('colours a zero health score red', async () => {
        fetchHealthMetrics.mockResolvedValue(
            healthPayload({ healthScore: { healthScore: 0, uptimePercentage: 0 } })
        );

        await renderLoaded();

        expect(screen.getByTestId('health-score').className).toContain('text-red-600');
    });

    it('says "No data" rather than inventing an uptime figure', async () => {
        fetchHealthMetrics.mockResolvedValue(
            healthPayload({ healthScore: { healthScore: 72, uptimePercentage: null } })
        );

        await renderLoaded();

        expect(screen.getByTestId('uptime')).toHaveTextContent('No data');
    });

    it('renders a real score and uptime when both are present', async () => {
        await renderLoaded();

        expect(screen.getByTestId('health-score')).toHaveTextContent('85');
        expect(screen.getByTestId('uptime')).toHaveTextContent('99.2%');
        expect(screen.getByTestId('health-score').className).toContain('text-green-600');
    });
});

describe('SensorHealthDashboard — background refresh', () => {
    it('does not unmount the page on a poll', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<SensorHealthDashboard />);
        await waitFor(() => expect(screen.queryByTestId('health-loading')).not.toBeInTheDocument());

        await act(async () => {
            vi.advanceTimersByTime(POLL_MS);
        });

        // The old hook set `loading` on every poll, and the component early-returns on
        // it — so this is the assertion that the dashboard survives its own refresh.
        expect(screen.queryByTestId('health-loading')).not.toBeInTheDocument();
        expect(screen.getByTestId('health-score')).toBeInTheDocument();
        expect(fetchHealthMetrics).toHaveBeenCalledTimes(2);
    });

    it('keeps the acknowledgment notes being typed when a poll lands', async () => {
        fetchHealthMetrics.mockResolvedValue(healthPayload({ alerts: [alert()] }));
        vi.useFakeTimers({ shouldAdvanceTime: true });

        render(<SensorHealthDashboard />);
        await waitFor(() => expect(screen.queryByTestId('health-loading')).not.toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
        fireEvent.change(screen.getByLabelText(/resolution notes/i), {
            target: { value: 'Cleaned PM2.5 sensor lens, recalibrated against reference monitor' },
        });

        await act(async () => {
            vi.advanceTimersByTime(POLL_MS);
        });

        expect(screen.getByTestId('acknowledge-modal')).toBeInTheDocument();
        expect(screen.getByLabelText(/resolution notes/i)).toHaveValue(
            'Cleaned PM2.5 sensor lens, recalibrated against reference monitor'
        );
    });
});

describe('SensorHealthDashboard — error handling', () => {
    it('offers a retry when the first load fails', async () => {
        fetchHealthMetrics.mockRejectedValueOnce(new Error('network down'));

        render(<SensorHealthDashboard />);

        const errorScreen = await screen.findByTestId('health-error');
        expect(errorScreen).toHaveTextContent('Failed to load sensor health data');
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('recovers when the retry succeeds', async () => {
        fetchHealthMetrics.mockRejectedValueOnce(new Error('network down'));
        render(<SensorHealthDashboard />);
        await screen.findByTestId('health-error');

        fireEvent.click(screen.getByRole('button', { name: /try again/i }));

        await waitFor(() => expect(screen.getByTestId('health-score')).toHaveTextContent('85'));
        expect(screen.queryByTestId('health-error')).not.toBeInTheDocument();
    });

    it('keeps the data on screen when a later poll fails, and clears the banner when it recovers', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<SensorHealthDashboard />);
        await waitFor(() => expect(screen.queryByTestId('health-loading')).not.toBeInTheDocument());

        fetchHealthMetrics.mockRejectedValueOnce(new Error('flaky proxy'));
        await act(async () => {
            vi.advanceTimersByTime(POLL_MS);
        });

        // Data stays; the failure is a banner, not a full-page replacement.
        expect(screen.getByTestId('health-error-banner')).toBeInTheDocument();
        expect(screen.getByTestId('health-score')).toHaveTextContent('85');

        await act(async () => {
            vi.advanceTimersByTime(POLL_MS);
        });

        // The old hook latched `error` forever, so this is the regression that matters.
        await waitFor(() => expect(screen.queryByTestId('health-error-banner')).not.toBeInTheDocument());
    });
});

describe('SensorHealthDashboard — acknowledging an alert', () => {
    it('does not invent a health-score improvement', async () => {
        fetchHealthMetrics.mockResolvedValue(healthPayload({ alerts: [alert()] }));
        await renderLoaded();

        fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
        fireEvent.change(screen.getByLabelText(/resolution notes/i), { target: { value: 'Lens cleaned' } });
        fireEvent.click(screen.getByRole('button', { name: /confirm acknowledgment/i }));

        await waitFor(() => expect(screen.queryByTestId('acknowledge-modal')).not.toBeInTheDocument());

        expect(acknowledgeAlert).toHaveBeenCalledWith('alert-1', 'Lens cleaned');
        // Acknowledging records that a human saw the alert; it does not repair the
        // sensor. The old optimistic `+10` claimed a recovery the server never agreed to.
        expect(screen.getByTestId('health-score')).toHaveTextContent('85');
    });

    it('keeps the modal and the typed notes open when the acknowledgment fails', async () => {
        fetchHealthMetrics.mockResolvedValue(healthPayload({ alerts: [alert()] }));
        acknowledgeAlert.mockRejectedValue(new Error('403'));
        await renderLoaded();

        fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
        fireEvent.change(screen.getByLabelText(/resolution notes/i), { target: { value: 'Replaced fan' } });
        fireEvent.click(screen.getByRole('button', { name: /confirm acknowledgment/i }));

        await waitFor(() => expect(screen.getByTestId('health-error-banner')).toBeInTheDocument());
        expect(screen.getByTestId('acknowledge-modal')).toBeInTheDocument();
        expect(screen.getByLabelText(/resolution notes/i)).toHaveValue('Replaced fan');
    });

    it('reports the failure in the page rather than through window.alert', async () => {
        fetchHealthMetrics.mockResolvedValue(healthPayload({ alerts: [alert()] }));
        acknowledgeAlert.mockRejectedValue(new Error('403'));
        const windowAlert = vi.spyOn(window, 'alert').mockImplementation(() => { });
        await renderLoaded();

        fireEvent.click(screen.getByRole('button', { name: /acknowledge/i }));
        fireEvent.click(screen.getByRole('button', { name: /confirm acknowledgment/i }));

        await waitFor(() => expect(screen.getByTestId('health-error-banner')).toBeInTheDocument());
        expect(windowAlert).not.toHaveBeenCalled();
    });
});

describe('SensorHealthDashboard — switching sensor', () => {
    it('re-reads health for the newly selected sensor', async () => {
        await renderLoaded();

        fireEvent.change(screen.getByLabelText(/^sensor$/i), { target: { value: 'sensor_002' } });

        await waitFor(() => expect(fetchHealthMetrics).toHaveBeenLastCalledWith('sensor_002'));
    });

    it('does not show the previous sensor\'s score while the new one loads', async () => {
        await renderLoaded();
        expect(screen.getByTestId('health-score')).toHaveTextContent('85');

        let resolveSecond;
        fetchHealthMetrics.mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));
        fireEvent.change(screen.getByLabelText(/^sensor$/i), { target: { value: 'sensor_002' } });

        // Sensor 001's 85 must not sit under a heading that now says sensor 002.
        await waitFor(() => expect(screen.getByTestId('health-loading')).toBeInTheDocument());

        await act(async () => {
            resolveSecond(healthPayload({ healthScore: { healthScore: 41, uptimePercentage: 62.5 } }));
        });
        await waitFor(() => expect(screen.getByTestId('health-score')).toHaveTextContent('41'));
    });
});
