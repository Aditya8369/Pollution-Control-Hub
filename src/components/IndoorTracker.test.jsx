import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import IndoorTracker from './IndoorTracker';

/**
 * #808. The Outdoor gauge was handed `outdoorPm25 ?? 0`, so a missing reading was drawn
 * as a confident 0 µg/m³ — the same class of defect as #645/#546 — and Number() alone let
 * NaN and Infinity into a reading that was displayed once and then silently dropped on
 * the next load.
 */

const INDOOR_READINGS_KEY = 'indoor-air-readings';

const OUTDOOR = { pm2_5: 42, us_aqi: 120 };

const STORED_READING = {
    pm2_5: 12,
    co2: 800,
    voc: 300,
    timestamp: '2026-08-10T09:00:00.000Z',
};

function fillForm({ pm25 = '12', co2 = '800', voc = '300' } = {}) {
    fireEvent.change(screen.getByTestId('indoor-pm25-input'), { target: { value: pm25 } });
    fireEvent.change(screen.getByTestId('indoor-co2-input'), { target: { value: co2 } });
    fireEvent.change(screen.getByTestId('indoor-voc-input'), { target: { value: voc } });
}

/** Saves the way a visitor does — via the button, through native constraint validation. */
function saveReading(values) {
    fillForm(values);
    fireEvent.click(screen.getByTestId('save-indoor-reading'));
}

/**
 * Submits the form directly, bypassing native constraint validation.
 *
 * `required` and `min="0"` do block the button for a blank or negative field, and a
 * number input sanitises "1e999" away to "" before it is ever read — so in a browser the
 * markup catches these first. The JS check is a backstop for the paths the markup does
 * not cover: a form submitted programmatically, an autofilled value, or a later edit that
 * drops one of those attributes. That is the path these cases exercise.
 */
function submitDirectly(values) {
    fillForm(values);
    fireEvent.submit(screen.getByTestId('save-indoor-reading').closest('form'));
}

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.restoreAllMocks();
});

describe('IndoorTracker - the outdoor reading is not invented', () => {
    it('shows the real outdoor PM2.5 when there is one', () => {
        localStorage.setItem(INDOOR_READINGS_KEY, JSON.stringify(STORED_READING));

        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        expect(screen.getByText('42 µg/m³')).toBeInTheDocument();
    });

    it('says "Not available" rather than 0 when the API returned no PM2.5', () => {
        localStorage.setItem(INDOOR_READINGS_KEY, JSON.stringify(STORED_READING));

        render(<IndoorTracker current={{ us_aqi: 120 }} cityName="Delhi" />);

        expect(screen.getByText('Not available')).toBeInTheDocument();
        expect(screen.queryByText('0 µg/m³')).not.toBeInTheDocument();
    });

    it('treats a null PM2.5 the same way', () => {
        localStorage.setItem(INDOOR_READINGS_KEY, JSON.stringify(STORED_READING));

        render(<IndoorTracker current={{ pm2_5: null, us_aqi: 120 }} cityName="Delhi" />);

        expect(screen.getByText('Not available')).toBeInTheDocument();
    });

    it('does not compare against a reading it does not have', () => {
        localStorage.setItem(INDOOR_READINGS_KEY, JSON.stringify(STORED_READING));

        render(<IndoorTracker current={{ us_aqi: 120 }} cityName="Delhi" />);

        // 12 > 0 would have claimed the indoor air was the dirtier of the two.
        expect(screen.queryByText(/worse than outside/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/cleaner than outside/i)).not.toBeInTheDocument();
    });

    it('still compares when the outdoor reading is real', () => {
        localStorage.setItem(INDOOR_READINGS_KEY, JSON.stringify(STORED_READING));

        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        expect(screen.getByText(/cleaner than outside/i)).toBeInTheDocument();
    });

    it('shows a genuine outdoor zero as a reading', () => {
        localStorage.setItem(INDOOR_READINGS_KEY, JSON.stringify(STORED_READING));

        render(<IndoorTracker current={{ pm2_5: 0, us_aqi: 10 }} cityName="Delhi" />);

        expect(screen.getByText('0 µg/m³')).toBeInTheDocument();
        expect(screen.queryByText('Not available')).not.toBeInTheDocument();
    });
});

describe('IndoorTracker - saving a reading', () => {
    it('saves a valid reading and persists it', () => {
        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        saveReading({ pm25: '20', co2: '900', voc: '250' });

        const stored = JSON.parse(localStorage.getItem(INDOOR_READINGS_KEY));
        expect(stored).toMatchObject({ pm2_5: 20, co2: 900, voc: 250 });
        expect(screen.getByText('20 µg/m³')).toBeInTheDocument();
    });

    it('still shows the reading when storage is full', () => {
        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new DOMException('quota', 'QuotaExceededError');
        });

        expect(() => saveReading({ pm25: '20' })).not.toThrow();
        expect(screen.getByText('20 µg/m³')).toBeInTheDocument();
    });

    it('blocks a negative reading at the markup, before the JS check', () => {
        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        // min="0" makes the field rangeUnderflow, so the click never submits at all.
        saveReading({ pm25: '-5' });

        expect(localStorage.getItem(INDOOR_READINGS_KEY)).toBeNull();
        expect(screen.queryByText('-5 µg/m³')).not.toBeInTheDocument();
    });
});

describe('IndoorTracker - validation backstop', () => {
    it('refuses a negative reading when the markup is bypassed', () => {
        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        submitDirectly({ pm25: '-5' });

        expect(localStorage.getItem(INDOOR_READINGS_KEY)).toBeNull();
        expect(screen.getByTestId('indoor-pm25-input-error')).toBeInTheDocument();
    });

    it('refuses a cleared field', () => {
        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        submitDirectly({ voc: '' });

        expect(localStorage.getItem(INDOOR_READINGS_KEY)).toBeNull();
        expect(screen.getByTestId('indoor-voc-input-error')).toBeInTheDocument();
    });

    it('flags every bad field at once, and only those', () => {
        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        submitDirectly({ pm25: '-1', co2: '', voc: '300' });

        expect(screen.getByTestId('indoor-pm25-input-error')).toBeInTheDocument();
        expect(screen.getByTestId('indoor-co2-input-error')).toBeInTheDocument();
        expect(screen.queryByTestId('indoor-voc-input-error')).not.toBeInTheDocument();
    });

    it('marks the offending input aria-invalid', () => {
        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        submitDirectly({ pm25: '-1' });

        expect(screen.getByTestId('indoor-pm25-input')).toHaveAttribute('aria-invalid', 'true');
    });

    it('clears the message once the field is corrected', () => {
        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        submitDirectly({ pm25: '-1' });
        expect(screen.getByTestId('indoor-pm25-input-error')).toBeInTheDocument();

        fireEvent.change(screen.getByTestId('indoor-pm25-input'), { target: { value: '12' } });

        expect(screen.queryByTestId('indoor-pm25-input-error')).not.toBeInTheDocument();
    });

    it('keeps a previously saved reading on screen when a new one is refused', () => {
        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        saveReading({ pm25: '20' });
        expect(screen.getByText('20 µg/m³')).toBeInTheDocument();

        submitDirectly({ pm25: '-3' });

        expect(screen.getByText('20 µg/m³')).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem(INDOOR_READINGS_KEY))).toMatchObject({ pm2_5: 20 });
    });

    it('never renders a NaN or Infinity gauge', () => {
        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        submitDirectly({ co2: 'not a number' });

        expect(screen.queryByText(/NaN/)).not.toBeInTheDocument();
        expect(screen.queryByText(/Infinity/)).not.toBeInTheDocument();
    });
});

describe('IndoorTracker - reading age', () => {
    it('shows when the stored reading was taken', () => {
        localStorage.setItem(INDOOR_READINGS_KEY, JSON.stringify(STORED_READING));

        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        expect(screen.getByTestId('indoor-reading-time')).toHaveTextContent(/^Logged /);
    });

    it('tolerates an unparseable timestamp', () => {
        localStorage.setItem(
            INDOOR_READINGS_KEY,
            JSON.stringify({ ...STORED_READING, timestamp: 'whenever' })
        );

        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        expect(screen.getByTestId('indoor-reading-time')).toHaveTextContent(
            'Logged at an unknown time'
        );
    });

    it('renders nothing at all before the first reading', () => {
        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        expect(screen.queryByTestId('indoor-reading-time')).not.toBeInTheDocument();
        expect(screen.queryByTestId('indoor-tips')).not.toBeInTheDocument();
    });
});

describe('IndoorTracker - stored reading hygiene', () => {
    it('ignores a stored reading with a non-numeric field', () => {
        localStorage.setItem(
            INDOOR_READINGS_KEY,
            JSON.stringify({ ...STORED_READING, co2: null })
        );

        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        expect(screen.queryByTestId('indoor-reading-time')).not.toBeInTheDocument();
    });

    it('ignores unparseable storage', () => {
        localStorage.setItem(INDOOR_READINGS_KEY, 'not json');

        expect(() => render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />)).not.toThrow();
        expect(screen.queryByTestId('indoor-reading-time')).not.toBeInTheDocument();
    });
});

describe('IndoorTracker - sensor API unhandled rejection and toast notification', () => {
    let fetchSpy;

    beforeEach(() => {
        fetchSpy = vi.spyOn(global, 'fetch');
    });

    afterEach(() => {
        fetchSpy.mockRestore();
    });

    it('handles network error (rejected promise) gracefully and displays a toast', async () => {
        fetchSpy.mockRejectedValue(new TypeError('Failed to fetch'));

        render(<IndoorTracker current={OUTDOOR} cityName="Delhi" />);

        // Switch connector to PurpleAir and fill details
        fireEvent.change(screen.getByTestId('device-connector-select'), { target: { value: 'purpleair' } });
        fireEvent.change(screen.getByPlaceholderText('e.g. 12345'), { target: { value: '12345' } });
        fireEvent.change(screen.getByPlaceholderText('PurpleAir read key'), { target: { value: 'test-api-key' } });

        // Connect device
        fireEvent.click(screen.getByTestId('connect-device'));

        // Verify toast message is rendered on screen with the error message
        const toast = await screen.findByTestId('sensor-toast');
        expect(toast).toBeInTheDocument();
        expect(toast).toHaveTextContent(/Sensor API Connection Error/i);
        expect(toast).toHaveTextContent(/Failed to fetch/i);

        // Verify the client did not crash (can still interact or see title)
        expect(screen.getByText('Indoor vs. Outdoor Air Quality')).toBeInTheDocument();

        // Dismiss the toast
        fireEvent.click(screen.getByLabelText('Dismiss toast'));
        expect(screen.queryByTestId('sensor-toast')).not.toBeInTheDocument();
    });
});
