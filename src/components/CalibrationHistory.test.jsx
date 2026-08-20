import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CalibrationHistory from './CalibrationHistory';

/**
 * #898. The load effect had no cancellation, so switching sensors while a read was in
 * flight let whichever IndexedDB request finished last win — the panel could show sensor
 * A's revisions under sensor B's heading. And because a blocked `openDB()` never
 * settled, `finally` never ran and the spinner had no way out; now that the service
 * rejects, the panel has an error to show.
 */

const getCalibrationHistory = vi.hoisted(() => vi.fn());
const getCalibrationVersion = vi.hoisted(() => vi.fn());
const saveCalibrationVersion = vi.hoisted(() => vi.fn());

vi.mock('../services/calibrationVersionService', () => ({
    getCalibrationHistory,
    getCalibrationVersion,
    saveCalibrationVersion,
}));

function revision(sensorId, version) {
    return {
        id: `${sensorId}-v${version}`,
        sensorId,
        version,
        calibrationParameters: { sensor: sensorId },
        createdAt: '2026-08-20T10:00:00.000Z',
    };
}

beforeEach(() => {
    getCalibrationHistory.mockReset();
    getCalibrationVersion.mockReset();
    saveCalibrationVersion.mockReset();
});

describe('CalibrationHistory', () => {
    it('renders nothing without a sensor', () => {
        const { container } = render(<CalibrationHistory />);

        expect(container).toBeEmptyDOMElement();
        expect(getCalibrationHistory).not.toHaveBeenCalled();
    });

    it('lists the revisions it was given', async () => {
        getCalibrationHistory.mockResolvedValue([revision('s1', 2), revision('s1', 1)]);

        render(<CalibrationHistory sensorId="s1" />);

        expect(await screen.findByText('Version 2')).toBeInTheDocument();
        expect(screen.getByText('Version 1')).toBeInTheDocument();
    });

    it('leaves the spinner when the read fails, rather than sitting on it', async () => {
        // A blocked open used to never settle, so `finally` never ran.
        getCalibrationHistory.mockRejectedValue(
            new Error('Another tab has the calibration database open. Close it and reload to continue.')
        );

        render(<CalibrationHistory sensorId="s1" />);

        expect(await screen.findByRole('alert')).toHaveTextContent(/another tab/i);
        expect(screen.queryByText(/Loading calibration history/i)).not.toBeInTheDocument();
    });

    it('does not leave the previous sensor revisions on screen next to the error', async () => {
        getCalibrationHistory.mockResolvedValueOnce([revision('s1', 1)]);
        const { rerender } = render(<CalibrationHistory sensorId="s1" />);
        await screen.findByText('Version 1');

        getCalibrationHistory.mockRejectedValueOnce(new Error('nope'));
        rerender(<CalibrationHistory sensorId="s2" />);

        await screen.findByRole('alert');
        expect(screen.queryByText('Version 1')).not.toBeInTheDocument();
    });

    it('ignores a read that lands after the sensor changed', async () => {
        let resolveFirst;
        getCalibrationHistory
            .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
            .mockResolvedValueOnce([revision('s2', 5)]);

        const { rerender } = render(<CalibrationHistory sensorId="s1" />);
        rerender(<CalibrationHistory sensorId="s2" />);

        await screen.findByText('Version 5');
        resolveFirst([revision('s1', 1)]);

        // Sensor 1's revision must not appear under sensor 2's heading just because its
        // read finished last.
        await waitFor(() => expect(screen.queryByText('Version 1')).not.toBeInTheDocument());
        expect(screen.getByText('Version 5')).toBeInTheDocument();
    });

    it('says so when a sensor has no revisions yet', async () => {
        getCalibrationHistory.mockResolvedValue([]);

        render(<CalibrationHistory sensorId="s1" />);

        expect(
            await screen.findByText(/No calibration versions have been recorded yet/i)
        ).toBeInTheDocument();
    });
});
