import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import SymptomReportButton, {
    SYMPTOM_REPORTS_STORAGE_KEY,
    MAX_STORED_REPORTS,
    readSymptomReports,
    saveSymptomReports,
} from './SymptomReportButton';
import { eventBus } from '../core/events';

/**
 * Covers the dialog behaviour `aria-modal="true"` promises and the component had none
 * of (#693): focus in, focus trapped, focus back out, Escape to close. Plus the timer
 * that outlived the component, the submit that could fire more than once, and the
 * failed write that still said "thanks".
 */

/** Opens the dialog and returns the trigger. */
function openDialog() {
    const trigger = screen.getByRole('button', { name: /feeling unwell/i });
    fireEvent.click(trigger);
    return trigger;
}

/** Installs a geolocation stub that resolves immediately with the given coords. */
function stubGeolocation(coords = { latitude: 28.61391, longitude: 77.20903 }) {
    const getCurrentPosition = vi.fn((onSuccess) => onSuccess({ coords }));
    vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });
    return getCurrentPosition;
}

beforeEach(() => {
    localStorage.clear();
    vi.useRealTimers();
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
});

describe('SymptomReportButton - opening and closing', () => {
    it('renders the trigger and no dialog until it is clicked', () => {
        render(<SymptomReportButton />);

        expect(screen.getByRole('button', { name: /feeling unwell/i })).toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens a labelled modal dialog', () => {
        render(<SymptomReportButton />);
        openDialog();

        const dialog = screen.getByRole('dialog');
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveAccessibleName(/report how you're feeling/i);
    });

    it('closes on Escape', () => {
        render(<SymptomReportButton />);
        openDialog();

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes on a backdrop click but not on a click inside the dialog', () => {
        const { container } = render(<SymptomReportButton />);
        openDialog();

        fireEvent.click(screen.getByRole('dialog'));
        expect(screen.getByRole('dialog')).toBeInTheDocument();

        fireEvent.click(container.querySelector('.symptom-report-modal-backdrop'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes on Cancel and on the close button', () => {
        render(<SymptomReportButton />);

        openDialog();
        fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

        openDialog();
        fireEvent.click(screen.getByRole('button', { name: /close symptom report dialog/i }));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('forgets the selection made in a dismissed dialog', () => {
        render(<SymptomReportButton />);

        openDialog();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Headache' }));
        fireEvent.keyDown(window, { key: 'Escape' });

        openDialog();
        expect(screen.getByRole('checkbox', { name: 'Headache' })).not.toBeChecked();
    });
});

describe('SymptomReportButton - focus management', () => {
    it('moves focus into the dialog when it opens', () => {
        render(<SymptomReportButton />);
        openDialog();

        expect(screen.getByRole('button', { name: /close symptom report dialog/i })).toHaveFocus();
    });

    it('returns focus to the trigger when the dialog closes', () => {
        render(<SymptomReportButton />);
        const trigger = openDialog();

        fireEvent.keyDown(window, { key: 'Escape' });

        expect(trigger).toHaveFocus();
    });

    it('wraps Tab from the last focusable element back to the first', () => {
        render(<SymptomReportButton />);
        openDialog();

        const dialog = screen.getByRole('dialog');
        const focusable = /** @type {NodeListOf<HTMLElement>} */ (
            dialog.querySelectorAll('button:not([disabled]), input:not([disabled])')
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        last.focus();
        fireEvent.keyDown(window, { key: 'Tab' });

        expect(first).toHaveFocus();
    });

    it('wraps Shift+Tab from the first focusable element to the last', () => {
        render(<SymptomReportButton />);
        openDialog();

        const dialog = screen.getByRole('dialog');
        const focusable = /** @type {NodeListOf<HTMLElement>} */ (
            dialog.querySelectorAll('button:not([disabled]), input:not([disabled])')
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        first.focus();
        fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });

        expect(last).toHaveFocus();
    });
});

describe('SymptomReportButton - submitting', () => {
    it('disables Submit until a symptom is selected', () => {
        render(<SymptomReportButton />);
        openDialog();

        const submit = screen.getByRole('button', { name: /^submit$/i });
        expect(submit).toBeDisabled();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Coughing' }));
        expect(submit).toBeEnabled();
    });

    it('stores the selected symptoms with an approximate location', () => {
        stubGeolocation();
        render(<SymptomReportButton />);
        openDialog();

        fireEvent.click(screen.getByRole('checkbox', { name: 'Headache' }));
        fireEvent.click(screen.getByRole('checkbox', { name: 'Fatigue' }));
        fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

        const [report] = readSymptomReports();
        expect(report.symptoms).toEqual(['Headache', 'Fatigue']);
        // Rounded to 2dp so the stored point is an area, not a doorstep.
        expect(report.latitude).toBe(28.61);
        expect(report.longitude).toBe(77.21);
        expect(() => new Date(report.timestamp).toISOString()).not.toThrow();
    });

    it('falls back to the supplied position when geolocation is refused', () => {
        vi.stubGlobal('navigator', {
            ...navigator,
            geolocation: { getCurrentPosition: vi.fn((_ok, onError) => onError(new Error('denied'))) },
        });

        render(<SymptomReportButton fallbackPosition={{ lat: 19.076, lon: 72.8777 }} />);
        openDialog();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Dizziness' }));
        fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

        const [report] = readSymptomReports();
        expect(report.latitude).toBe(19.08);
        expect(report.longitude).toBe(72.88);
    });

    it('stores a report with no coordinates when there is no geolocation and no fallback', () => {
        vi.stubGlobal('navigator', { ...navigator, geolocation: undefined });

        render(<SymptomReportButton />);
        openDialog();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Sore throat' }));
        fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

        const [report] = readSymptomReports();
        expect(report.latitude).toBeNull();
        expect(report.longitude).toBeNull();
    });

    it('announces the report and confirms it', () => {
        stubGeolocation();
        const listener = vi.fn();
        eventBus.on('SYMPTOM_REPORT_SUBMITTED', listener);

        render(<SymptomReportButton />);
        openDialog();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Headache' }));
        fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

        expect(listener).toHaveBeenCalledTimes(1);
        expect(screen.getByText(/thanks — your report was added/i)).toBeInTheDocument();

        eventBus.off('SYMPTOM_REPORT_SUBMITTED', listener);
    });

    it('files one report however many times Submit is clicked while the location lookup runs', () => {
        // The lookup is held open, as it is in the browser while the permission prompt
        // is up. Nothing used to guard against a second click during those seconds.
        let resolvePosition;
        const getCurrentPosition = vi.fn((onSuccess) => {
            resolvePosition = () => onSuccess({ coords: { latitude: 1, longitude: 2 } });
        });
        vi.stubGlobal('navigator', { ...navigator, geolocation: { getCurrentPosition } });

        render(<SymptomReportButton />);
        openDialog();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Headache' }));

        const submit = screen.getByRole('button', { name: /submit/i });
        fireEvent.click(submit);
        fireEvent.click(submit);
        fireEvent.click(submit);

        expect(getCurrentPosition).toHaveBeenCalledTimes(1);
        expect(submit).toBeDisabled();

        act(() => resolvePosition());

        expect(readSymptomReports()).toHaveLength(1);
    });

    it('cancels the pending auto-close when the dialog is closed by hand', () => {
        vi.useFakeTimers();
        stubGeolocation();

        render(<SymptomReportButton />);
        openDialog();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Headache' }));
        fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

        // Dismiss the confirmation immediately, then reopen inside the 1.2s window. The
        // old timer was never cleared, so it fired and closed the freshly opened dialog.
        fireEvent.click(screen.getByRole('button', { name: /close symptom report dialog/i }));
        openDialog();
        act(() => vi.advanceTimersByTime(3000));

        expect(screen.getByRole('dialog')).toBeInTheDocument();

        vi.useRealTimers();
    });

    it('closes on its own once the confirmation has been shown', async () => {
        stubGeolocation();
        render(<SymptomReportButton />);
        openDialog();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Headache' }));
        fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(), {
            timeout: 3000,
        });
    });
});

describe('SymptomReportButton - persistence failures', () => {
    it('says the report was not saved instead of thanking the visitor', () => {
        stubGeolocation();
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('quota', 'QuotaExceededError');
        });

        render(<SymptomReportButton />);
        openDialog();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Headache' }));
        fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

        expect(screen.getByRole('alert')).toHaveTextContent(/could not be saved/i);
        expect(screen.queryByText(/thanks — your report was added/i)).not.toBeInTheDocument();
    });

    it('leaves the dialog usable so the visitor can retry', () => {
        stubGeolocation();
        const setItem = vi
            .spyOn(Storage.prototype, 'setItem')
            .mockImplementation(() => {
                throw new DOMException('quota', 'QuotaExceededError');
            });

        render(<SymptomReportButton />);
        openDialog();
        fireEvent.click(screen.getByRole('checkbox', { name: 'Headache' }));
        fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

        setItem.mockRestore();
        fireEvent.click(screen.getByRole('button', { name: /^submit$/i }));

        expect(readSymptomReports()).toHaveLength(1);
        expect(screen.getByText(/thanks — your report was added/i)).toBeInTheDocument();
    });
});

describe('readSymptomReports / saveSymptomReports', () => {
    it('returns an empty list for missing, corrupt or non-array storage', () => {
        expect(readSymptomReports()).toEqual([]);

        localStorage.setItem(SYMPTOM_REPORTS_STORAGE_KEY, 'not json');
        expect(readSymptomReports()).toEqual([]);

        localStorage.setItem(SYMPTOM_REPORTS_STORAGE_KEY, '{"a":1}');
        expect(readSymptomReports()).toEqual([]);
    });

    it('keeps the newest reports and drops the oldest past the cap', () => {
        const reports = Array.from({ length: MAX_STORED_REPORTS + 25 }, (_, i) => ({ id: i }));

        expect(saveSymptomReports(reports)).toBe(true);

        const stored = readSymptomReports();
        expect(stored).toHaveLength(MAX_STORED_REPORTS);
        expect(stored[stored.length - 1].id).toBe(MAX_STORED_REPORTS + 24);
        expect(stored[0].id).toBe(25);
    });

    it('reports failure when storage refuses the write outright', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('quota', 'QuotaExceededError');
        });

        expect(saveSymptomReports([{ id: 1 }])).toBe(false);
    });

    it('retries with a much shorter list when the first write is refused', () => {
        const written = [];
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation((_key, value) => {
            if (written.length === 0) {
                written.push(null);
                throw new DOMException('quota', 'QuotaExceededError');
            }
            written.push(value);
        });

        expect(saveSymptomReports(Array.from({ length: 300 }, (_, i) => ({ id: i })))).toBe(true);
        expect(JSON.parse(written[1])).toHaveLength(Math.floor(MAX_STORED_REPORTS / 4));
    });
});
