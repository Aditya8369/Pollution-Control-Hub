import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import IoTSensorLiveFeed, { resolveSelection, SENSOR_POLL_MS } from './IoTSensorLiveFeed';
import { fetchRecentTelemetry, fetchSensorStatuses } from '../services/iotDashboardService';

vi.mock('../services/iotDashboardService', () => ({
    fetchSensorStatuses: vi.fn(),
    fetchRecentTelemetry: vi.fn(),
}));

const SENSORS = [
    { id: 'sensor-a', name: 'Downtown Roadside', lastSeen: '2026-08-27T10:00:00.000Z' },
    { id: 'sensor-b', name: 'Industrial Zone', lastSeen: '2026-08-27T10:00:00.000Z' },
    { id: 'sensor-c', name: 'Riverbank', lastSeen: null },
];

function reading(overrides = {}) {
    return { timestamp: '2026-08-27T10:00:00.000Z', pm25: 41, pm10: 66, temperature: 29, humidity: 55, ...overrides };
}

async function renderLoaded() {
    render(<IoTSensorLiveFeed />);
    await waitFor(() => expect(screen.queryByTestId('iot-loading')).not.toBeInTheDocument());
}

beforeEach(() => {
    fetchSensorStatuses.mockResolvedValue(SENSORS);
    fetchRecentTelemetry.mockResolvedValue([reading()]);
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.useRealTimers();
});

describe('resolveSelection', () => {
    it('leaves a valid selection alone', () => {
        // The bug in one line: the refresh must not have an opinion about a sensor the
        // user has already chosen.
        expect(resolveSelection('sensor-b', SENSORS)).toBe('sensor-b');
    });

    it('picks the first sensor when nothing is selected yet', () => {
        expect(resolveSelection(null, SENSORS)).toBe('sensor-a');
    });

    it('moves on when the selected sensor has left the list', () => {
        expect(resolveSelection('sensor-b', [SENSORS[0]])).toBe('sensor-a');
    });

    it('selects nothing when there are no sensors', () => {
        expect(resolveSelection('sensor-b', [])).toBeNull();
        expect(resolveSelection(null, [])).toBeNull();
    });

    it('tolerates a non-array payload', () => {
        expect(resolveSelection('sensor-b', undefined)).toBeNull();
        expect(resolveSelection(null, null)).toBeNull();
    });
});

describe('IoTSensorLiveFeed — the selection survives the poll', () => {
    it('keeps the chosen sensor across a refresh', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<IoTSensorLiveFeed />);
        await waitFor(() => expect(screen.queryByTestId('iot-loading')).not.toBeInTheDocument());

        fireEvent.click(screen.getByTestId('sensor-option-sensor-b'));
        await waitFor(() => expect(screen.getByTestId('active-sensor-name')).toHaveTextContent('Industrial Zone'));

        await act(async () => {
            vi.advanceTimersByTime(SENSOR_POLL_MS);
        });

        // Before the fix the interval ran a callback that had captured `selectedSensor`
        // as null on the first render, so every tick reset this to Downtown Roadside.
        expect(screen.getByTestId('active-sensor-name')).toHaveTextContent('Industrial Zone');
        expect(screen.getByTestId('sensor-option-sensor-b')).toHaveAttribute('aria-pressed', 'true');
    });

    it('survives several consecutive polls', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<IoTSensorLiveFeed />);
        await waitFor(() => expect(screen.queryByTestId('iot-loading')).not.toBeInTheDocument());

        fireEvent.click(screen.getByTestId('sensor-option-sensor-c'));

        for (let tick = 0; tick < 4; tick++) {
            await act(async () => {
                vi.advanceTimersByTime(SENSOR_POLL_MS);
            });
        }

        expect(screen.getByTestId('active-sensor-name')).toHaveTextContent('Riverbank');
        expect(fetchSensorStatuses).toHaveBeenCalledTimes(5);
    });

    it('does not restart the telemetry poll on an unchanged selection', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<IoTSensorLiveFeed />);
        await waitFor(() => expect(screen.queryByTestId('iot-loading')).not.toBeInTheDocument());

        fireEvent.click(screen.getByTestId('sensor-option-sensor-b'));
        await waitFor(() => expect(fetchRecentTelemetry).toHaveBeenLastCalledWith('sensor-b', 10));
        const callsAfterSwitch = fetchRecentTelemetry.mock.calls.length;

        await act(async () => {
            vi.advanceTimersByTime(SENSOR_POLL_MS);
        });

        // Every call since the switch must still be for sensor-b: a reset selection used
        // to tear the telemetry effect down and re-point it at the first sensor.
        const sensorsQueried = fetchRecentTelemetry.mock.calls.slice(callsAfterSwitch).map(([id]) => id);
        expect(sensorsQueried.every((id) => id === 'sensor-b')).toBe(true);
    });

    it('moves the selection on when the chosen sensor drops off the list', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<IoTSensorLiveFeed />);
        await waitFor(() => expect(screen.queryByTestId('iot-loading')).not.toBeInTheDocument());

        fireEvent.click(screen.getByTestId('sensor-option-sensor-b'));
        await waitFor(() => expect(screen.getByTestId('active-sensor-name')).toHaveTextContent('Industrial Zone'));

        fetchSensorStatuses.mockResolvedValue([SENSORS[0], SENSORS[2]]);
        await act(async () => {
            vi.advanceTimersByTime(SENSOR_POLL_MS);
        });

        await waitFor(() => expect(screen.getByTestId('active-sensor-name')).toHaveTextContent('Downtown Roadside'));
    });

    it('applies the default selection once, on the first load', async () => {
        await renderLoaded();
        expect(screen.getByTestId('active-sensor-name')).toHaveTextContent('Downtown Roadside');
        expect(screen.getByTestId('sensor-option-sensor-a')).toHaveAttribute('aria-pressed', 'true');
    });
});

describe('IoTSensorLiveFeed — the error screen clears', () => {
    it('offers a retry when the first load fails', async () => {
        fetchSensorStatuses.mockRejectedValueOnce(new Error('gateway down'));

        render(<IoTSensorLiveFeed />);

        expect(await screen.findByTestId('iot-error')).toHaveTextContent('Failed to connect to IoT gateway.');
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('recovers when the retry succeeds', async () => {
        fetchSensorStatuses.mockRejectedValueOnce(new Error('gateway down'));
        render(<IoTSensorLiveFeed />);
        await screen.findByTestId('iot-error');

        fireEvent.click(screen.getByRole('button', { name: /try again/i }));

        await waitFor(() => expect(screen.getByTestId('active-sensor-name')).toBeInTheDocument());
        expect(screen.queryByTestId('iot-error')).not.toBeInTheDocument();
        expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
    });

    it('clears itself when a later poll succeeds', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        fetchSensorStatuses.mockRejectedValueOnce(new Error('gateway down'));
        render(<IoTSensorLiveFeed />);
        await screen.findByTestId('iot-error');

        await act(async () => {
            vi.advanceTimersByTime(SENSOR_POLL_MS);
        });

        // The old code never called setError(null), so the dashboard stayed on this
        // screen for the life of the page while the interval succeeded behind it.
        await waitFor(() => expect(screen.queryByTestId('iot-error')).not.toBeInTheDocument());
        expect(screen.getByTestId('connection-status')).toHaveTextContent('connected');
    });

    it('keeps the feed on screen when a poll fails after data has loaded', async () => {
        vi.useFakeTimers({ shouldAdvanceTime: true });
        render(<IoTSensorLiveFeed />);
        await waitFor(() => expect(screen.queryByTestId('iot-loading')).not.toBeInTheDocument());

        fetchSensorStatuses.mockRejectedValueOnce(new Error('lid closed'));
        await act(async () => {
            vi.advanceTimersByTime(SENSOR_POLL_MS);
        });

        expect(screen.getByTestId('iot-error-banner')).toBeInTheDocument();
        expect(screen.getByTestId('active-sensor-name')).toBeInTheDocument();
        expect(screen.getByTestId('connection-status')).toHaveTextContent('disconnected');

        await act(async () => {
            vi.advanceTimersByTime(SENSOR_POLL_MS);
        });
        await waitFor(() => expect(screen.queryByTestId('iot-error-banner')).not.toBeInTheDocument());
    });
});

describe('IoTSensorLiveFeed — telemetry', () => {
    it('shows the latest reading for the selected sensor', async () => {
        fetchRecentTelemetry.mockResolvedValue([reading({ pm25: 118 })]);
        await renderLoaded();

        await waitFor(() => expect(screen.getByText('118')).toBeInTheDocument());
    });

    it('marks the connection degraded, not dead, when telemetry alone fails', async () => {
        fetchRecentTelemetry.mockRejectedValue(new Error('timeout'));
        await renderLoaded();

        await waitFor(() => expect(screen.getByTestId('connection-status')).toHaveTextContent('degraded'));
        // A telemetry gap must not take down the sensor list beside it.
        expect(screen.getByTestId('active-sensor-name')).toBeInTheDocument();
    });

    it('ignores a telemetry response for a sensor the user has already left', async () => {
        // The first sensor's telemetry hangs; the user gives up and switches.
        let resolveSlow;
        fetchRecentTelemetry.mockReturnValueOnce(new Promise((resolve) => { resolveSlow = resolve; }));
        fetchRecentTelemetry.mockResolvedValue([reading({ pm25: 22 })]);

        await renderLoaded();
        fireEvent.click(screen.getByTestId('sensor-option-sensor-b'));
        await waitFor(() => expect(screen.getByText('22')).toBeInTheDocument());

        // sensor-a's response finally arrives, long after the user left it.
        await act(async () => {
            resolveSlow([reading({ pm25: 999 })]);
        });

        expect(screen.queryByText('999')).not.toBeInTheDocument();
        expect(screen.getByText('22')).toBeInTheDocument();
    });

    it('shows the empty state when there are no sensors at all', async () => {
        fetchSensorStatuses.mockResolvedValue([]);
        await renderLoaded();

        expect(screen.getByText(/select a sensor to view live data/i)).toBeInTheDocument();
        expect(fetchRecentTelemetry).not.toHaveBeenCalled();
    });
});
