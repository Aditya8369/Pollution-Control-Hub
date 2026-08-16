import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AlertsPanel from './AlertsPanel';
import NotificationSettings from './NotificationSettings';
import {
    DEFAULT_NOTIFICATION_SETTINGS,
    parseThreshold,
    sanitiseSettings,
} from '../hooks/useNotificationSettings';

/**
 * #805: the settings panel offered four controls that changed nothing. The AQI field was
 * only read by the browser push (the on-screen warning was hardcoded to 120), the CO field
 * was read by nothing at all, the de-duplication ref was written but never compared, and
 * clearing any field stored a 0 that alerts on everything.
 */

const NOTIFICATION_SETTINGS_KEY = 'notification-settings';

const CLEAN_AIR = {
    pm2_5: 5,
    pm10: 20,
    nitrogen_dioxide: 10,
    ozone: 40,
    carbon_monoxide: 500,
    us_aqi: 30,
};

function stubNotification(permission) {
    const instances = [];
    class FakeNotification {
        constructor(title, options) {
            instances.push({ title, options });
        }
        static permission = permission;
        static requestPermission = vi.fn().mockResolvedValue(permission);
    }
    // @ts-ignore
    window.Notification = FakeNotification;
    return instances;
}

const originalNotification = window.Notification;

/**
 * The warnings list and the Alert History log render the same sentences, so assertions
 * scope to the live warnings (`alert-item`) rather than matching text anywhere on screen.
 */
function warningTexts() {
    return screen.queryAllByTestId('alert-item').map((el) => el.textContent);
}

function storeSettings(partial) {
    localStorage.setItem(
        NOTIFICATION_SETTINGS_KEY,
        JSON.stringify({ ...DEFAULT_NOTIFICATION_SETTINGS, ...partial })
    );
}

beforeEach(() => {
    localStorage.clear();
    stubNotification('default');
});

afterEach(() => {
    cleanup();
    // @ts-ignore
    window.Notification = originalNotification;
    vi.restoreAllMocks();
    localStorage.clear();
});

describe('parseThreshold', () => {
    it('accepts a finite non-negative number', () => {
        expect(parseThreshold(0)).toBe(0);
        expect(parseThreshold(200)).toBe(200);
        expect(parseThreshold('45')).toBe(45);
        expect(parseThreshold(' 45 ')).toBe(45);
        expect(parseThreshold('12.5')).toBe(12.5);
    });

    it('rejects the empty string rather than reading it as 0', () => {
        // Number('') is 0, which is what turned a cleared field into "alert on everything".
        expect(parseThreshold('')).toBeNull();
        expect(parseThreshold('   ')).toBeNull();
    });

    it('rejects values that are not finite numbers', () => {
        expect(parseThreshold('abc')).toBeNull();
        expect(parseThreshold('1e')).toBeNull();
        expect(parseThreshold(NaN)).toBeNull();
        expect(parseThreshold(Infinity)).toBeNull();
        expect(parseThreshold('1e999')).toBeNull();
    });

    it('rejects negatives', () => {
        expect(parseThreshold(-1)).toBeNull();
        expect(parseThreshold('-20')).toBeNull();
    });

    it('rejects types that are not numbers or strings', () => {
        expect(parseThreshold(null)).toBeNull();
        expect(parseThreshold(undefined)).toBeNull();
        expect(parseThreshold({})).toBeNull();
        expect(parseThreshold([])).toBeNull();
        expect(parseThreshold(true)).toBeNull();
    });
});

describe('sanitiseSettings', () => {
    it('falls back to the defaults for a poisoned threshold', () => {
        const result = sanitiseSettings({
            aqiThreshold: 'nonsense',
            pollutantThresholds: { pm2_5: null, pm10: 60 },
        });

        expect(result.aqiThreshold).toBe(DEFAULT_NOTIFICATION_SETTINGS.aqiThreshold);
        expect(result.pollutantThresholds.pm2_5).toBe(
            DEFAULT_NOTIFICATION_SETTINGS.pollutantThresholds.pm2_5
        );
        expect(result.pollutantThresholds.pm10).toBe(60);
    });

    it('keeps every default key even when storage holds a partial object', () => {
        const result = sanitiseSettings({ pollutantThresholds: { pm2_5: 5 } });

        expect(Object.keys(result.pollutantThresholds).sort()).toEqual(
            Object.keys(DEFAULT_NOTIFICATION_SETTINGS.pollutantThresholds).sort()
        );
    });

    it('rejects a malformed quiet-hours window', () => {
        const result = sanitiseSettings({ quietHours: { enabled: 'yes', start: '25:00', end: 'x' } });

        expect(result.quietHours.enabled).toBe(false);
        expect(result.quietHours.start).toBe(DEFAULT_NOTIFICATION_SETTINGS.quietHours.start);
        expect(result.quietHours.end).toBe(DEFAULT_NOTIFICATION_SETTINGS.quietHours.end);
    });

    it('returns the defaults for a non-object', () => {
        expect(sanitiseSettings(null)).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
        expect(sanitiseSettings('nope')).toEqual(DEFAULT_NOTIFICATION_SETTINGS);
    });
});

describe('NotificationSettings - validation', () => {
    const renderForm = () => {
        const onUpdate = vi.fn();
        const onClose = vi.fn();
        render(
            <NotificationSettings
                settings={DEFAULT_NOTIFICATION_SETTINGS}
                onUpdate={onUpdate}
                onClose={onClose}
            />
        );
        return { onUpdate, onClose };
    };

    it('saves valid thresholds as numbers', () => {
        const { onUpdate, onClose } = renderForm();

        fireEvent.change(screen.getByTestId('aqi-threshold-input'), { target: { value: '250' } });
        fireEvent.click(screen.getByTestId('save-notification-settings'));

        expect(onUpdate).toHaveBeenCalledTimes(1);
        expect(onUpdate.mock.calls[0][0].aqiThreshold).toBe(250);
        expect(onClose).toHaveBeenCalled();
    });

    it('refuses to save a cleared AQI field instead of storing 0', () => {
        const { onUpdate, onClose } = renderForm();

        fireEvent.change(screen.getByTestId('aqi-threshold-input'), { target: { value: '' } });
        fireEvent.click(screen.getByTestId('save-notification-settings'));

        expect(onUpdate).not.toHaveBeenCalled();
        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByTestId('aqi-threshold-error')).toBeInTheDocument();
        expect(screen.getByTestId('aqi-threshold-input')).toHaveAttribute('aria-invalid', 'true');
    });

    it('refuses a negative pollutant threshold', () => {
        const { onUpdate } = renderForm();

        fireEvent.change(screen.getByTestId('pollutant-threshold-pm2_5'), { target: { value: '-5' } });
        fireEvent.click(screen.getByTestId('save-notification-settings'));

        expect(onUpdate).not.toHaveBeenCalled();
        expect(screen.getByTestId('pollutant-threshold-pm2_5-error')).toBeInTheDocument();
    });

    it('flags every bad field at once', () => {
        renderForm();

        fireEvent.change(screen.getByTestId('aqi-threshold-input'), { target: { value: '' } });
        fireEvent.change(screen.getByTestId('pollutant-threshold-ozone'), { target: { value: 'abc' } });
        fireEvent.click(screen.getByTestId('save-notification-settings'));

        expect(screen.getByTestId('aqi-threshold-error')).toBeInTheDocument();
        expect(screen.getByTestId('pollutant-threshold-ozone-error')).toBeInTheDocument();
    });

    it('clears the message as soon as the field is corrected', () => {
        renderForm();

        fireEvent.change(screen.getByTestId('aqi-threshold-input'), { target: { value: '' } });
        fireEvent.click(screen.getByTestId('save-notification-settings'));
        expect(screen.getByTestId('aqi-threshold-error')).toBeInTheDocument();

        fireEvent.change(screen.getByTestId('aqi-threshold-input'), { target: { value: '180' } });
        expect(screen.queryByTestId('aqi-threshold-error')).not.toBeInTheDocument();
    });

    it('keeps the panel open so the bad value is still on screen', () => {
        const { onClose } = renderForm();

        fireEvent.change(screen.getByTestId('pollutant-threshold-pm10'), { target: { value: '' } });
        fireEvent.click(screen.getByTestId('save-notification-settings'));

        expect(onClose).not.toHaveBeenCalled();
        expect(screen.getByTestId('notification-settings-panel')).toBeInTheDocument();
    });
});

describe('AlertsPanel - the AQI threshold drives the on-screen warning', () => {
    const AQI_WARNING = /AQI suggests unhealthy conditions/i;

    it('does not warn below the configured threshold', () => {
        storeSettings({ aqiThreshold: 300 });

        render(
            <AlertsPanel cityName="Delhi" current={{ ...CLEAN_AIR, us_aqi: 150 }} confidenceScore="High" />
        );

        // 150 cleared the old hardcoded 120 and warned regardless of the setting.
        expect(warningTexts()).not.toContainEqual(expect.stringMatching(AQI_WARNING));
    });

    it('warns above the configured threshold', () => {
        storeSettings({ aqiThreshold: 100 });

        render(
            <AlertsPanel cityName="Delhi" current={{ ...CLEAN_AIR, us_aqi: 150 }} confidenceScore="High" />
        );

        expect(warningTexts()).toContainEqual(expect.stringMatching(AQI_WARNING));
    });

    it('keeps the AQI warning out of the history log when it is below threshold', () => {
        storeSettings({ aqiThreshold: 300 });

        render(
            <AlertsPanel cityName="Delhi" current={{ ...CLEAN_AIR, us_aqi: 150 }} confidenceScore="High" />
        );

        expect(screen.getByText(/no alert history yet/i)).toBeInTheDocument();
    });
});

describe('AlertsPanel - the CO threshold does something', () => {
    const CO_WARNING = /CO levels are unsafe/i;

    it('warns when carbon monoxide is over the threshold', () => {
        storeSettings({
            pollutantThresholds: { ...DEFAULT_NOTIFICATION_SETTINGS.pollutantThresholds, carbon_monoxide: 1000 },
        });

        render(
            <AlertsPanel cityName="Delhi" current={{ ...CLEAN_AIR, carbon_monoxide: 5000 }} confidenceScore="High" />
        );

        expect(warningTexts()).toContainEqual(expect.stringMatching(CO_WARNING));
    });

    it('stays quiet under the threshold', () => {
        render(<AlertsPanel cityName="Delhi" current={CLEAN_AIR} confidenceScore="High" />);

        expect(warningTexts()).not.toContainEqual(expect.stringMatching(CO_WARNING));
    });

    it('does not warn on a reading the API did not return', () => {
        const { carbon_monoxide: _omitted, ...noCo } = CLEAN_AIR;

        render(<AlertsPanel cityName="Delhi" current={noCo} confidenceScore="High" />);

        expect(warningTexts()).not.toContainEqual(expect.stringMatching(CO_WARNING));
    });
});

describe('AlertsPanel - notification de-duplication', () => {
    it('sends one notification for an unchanged alert set across refreshes', () => {
        const sent = stubNotification('granted');
        localStorage.setItem('push-alerts-enabled', JSON.stringify(['enabled']));

        const hazardous = { ...CLEAN_AIR, pm2_5: 90, us_aqi: 260 };
        const { rerender } = render(
            <AlertsPanel cityName="Delhi" current={hazardous} confidenceScore="High" />
        );
        expect(sent).toHaveLength(1);

        // A dashboard refresh that returns the same reading re-runs the effect. The
        // signature is unchanged, so nothing new should be pushed.
        rerender(<AlertsPanel cityName="Delhi" current={{ ...hazardous }} confidenceScore="High" />);
        rerender(<AlertsPanel cityName="Delhi" current={{ ...hazardous }} confidenceScore="High" />);

        expect(sent).toHaveLength(1);
    });

    it('sends again once the alert set genuinely changes', () => {
        const sent = stubNotification('granted');
        localStorage.setItem('push-alerts-enabled', JSON.stringify(['enabled']));

        const { rerender } = render(
            <AlertsPanel cityName="Delhi" current={{ ...CLEAN_AIR, pm2_5: 90, us_aqi: 260 }} confidenceScore="High" />
        );
        expect(sent).toHaveLength(1);

        rerender(
            <AlertsPanel
                cityName="Delhi"
                current={{ ...CLEAN_AIR, pm2_5: 90, pm10: 200, us_aqi: 260 }}
                confidenceScore="High"
            />
        );

        expect(sent).toHaveLength(2);
    });
});
