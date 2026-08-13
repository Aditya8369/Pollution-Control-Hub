import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import AlertsPanel from './AlertsPanel';
import { ALERT_HISTORY_KEY, readAlertHistory } from '../utils/alertHistory';

/**
 * Alert History behaviour (#694): a reload no longer duplicates the log, and the log is
 * kept whether or not the browser has the Notification API.
 */

const BAD_AIR = {
    pm2_5: 90,
    pm10: 150,
    nitrogen_dioxide: 60,
    ozone: 140,
    us_aqi: 212,
};

const CLEAN_AIR = {
    pm2_5: 5,
    pm10: 20,
    nitrogen_dioxide: 10,
    ozone: 40,
    us_aqi: 30,
};

/** Replaces window.Notification, or removes it entirely when `permission` is null. */
function stubNotification(permission) {
    if (permission === null) {
        // iOS Safari and most in-app webviews: the constructor simply is not there.
        // @ts-ignore
        delete window.Notification;
        return null;
    }

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

describe('AlertsPanel - warnings', () => {
    it('lists a warning per breached threshold', () => {
        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);

        expect(screen.getAllByTestId('alert-item')).toHaveLength(5);
    });

    it('says the air is within limits when nothing is breached', () => {
        render(<AlertsPanel cityName="Delhi" current={CLEAN_AIR} confidenceScore="High" />);

        expect(screen.queryAllByTestId('alert-item')).toHaveLength(0);
        expect(screen.getByText(/within safer limits/i)).toBeInTheDocument();
    });

    it('renders nothing at all without a reading', () => {
        const { container } = render(<AlertsPanel cityName="Delhi" current={null} confidenceScore="High" />);

        expect(container).toBeEmptyDOMElement();
    });

    it('flags warnings built on low-confidence data', () => {
        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="Low" />);

        expect(screen.getByText(/low-confidence data/i)).toBeInTheDocument();
    });
});

describe('AlertsPanel - alert history', () => {
    it('records the current warnings once', () => {
        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);

        expect(readAlertHistory()).toHaveLength(5);
        expect(screen.getAllByRole('listitem').length).toBeGreaterThanOrEqual(5);
    });

    it('does not append the same warnings again on the next page load', () => {
        // Mounting a second time is what a reload does: the ref that held the
        // de-duplication key started empty again, so the same five rows were appended.
        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);
        cleanup();
        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);
        cleanup();
        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);

        expect(readAlertHistory()).toHaveLength(5);
    });

    it('records a genuinely different warning set', () => {
        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);
        cleanup();
        render(
            <AlertsPanel
                cityName="Delhi"
                current={{ ...CLEAN_AIR, pm2_5: 90 }}
                confidenceScore="High"
            />
        );

        const history = readAlertHistory();
        expect(history).toHaveLength(6);
        expect(history[0].warning).toMatch(/PM2\.5/);
    });

    it('records nothing when the air is clean', () => {
        render(<AlertsPanel cityName="Delhi" current={CLEAN_AIR} confidenceScore="High" />);

        expect(readAlertHistory()).toEqual([]);
        expect(screen.getByText(/no alert history yet/i)).toBeInTheDocument();
    });

    it('keeps a log in a browser with no Notification API', () => {
        // The old effect returned early on `!("Notification" in window)`, and the history
        // recording sat behind that same guard.
        stubNotification(null);

        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);

        expect(readAlertHistory()).toHaveLength(5);
        expect(screen.queryByText(/no alert history yet/i)).not.toBeInTheDocument();
    });

    it('clears the log on request, in storage as well as on screen', () => {
        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);

        fireEvent.click(screen.getByRole('button', { name: /clear history/i }));

        expect(readAlertHistory()).toEqual([]);
        expect(screen.getByText(/no alert history yet/i)).toBeInTheDocument();
    });

    it('renders entries written by the previous version', () => {
        localStorage.setItem(
            ALERT_HISTORY_KEY,
            JSON.stringify([
                { timestamp: '12/08/2026, 21:04:11', city: 'Delhi', aqi: 212, warning: 'PM2.5 is high.' },
            ])
        );

        render(<AlertsPanel cityName="Delhi" current={CLEAN_AIR} confidenceScore="High" />);

        expect(screen.getByText(/12\/08\/2026, 21:04:11/)).toBeInTheDocument();
        expect(screen.getByText('PM2.5 is high.')).toBeInTheDocument();
    });

    it('survives a corrupt log instead of failing to render', () => {
        localStorage.setItem(ALERT_HISTORY_KEY, 'not json');

        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);

        expect(screen.getAllByTestId('alert-item')).toHaveLength(5);
    });
});

describe('AlertsPanel - notifications', () => {
    it('offers to enable notifications when permission has not been asked for', () => {
        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);

        expect(screen.getByRole('button', { name: /enable desktop notifications/i })).toBeInTheDocument();
    });

    it('explains the situation when notifications are blocked', () => {
        stubNotification('denied');

        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);

        expect(screen.getByText(/notifications are blocked/i)).toBeInTheDocument();
    });

    it('does not send a notification until the visitor opts in', () => {
        const sent = stubNotification('granted');

        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);

        expect(sent).toHaveLength(0);
        expect(screen.getByRole('button', { name: /toggle hazardous pollution alerts/i })).toBeInTheDocument();
    });

    it('sends one notification once alerts are switched on', () => {
        const sent = stubNotification('granted');

        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);
        fireEvent.click(screen.getByRole('button', { name: /toggle hazardous pollution alerts/i }));

        expect(sent).toHaveLength(1);
        expect(sent[0].options.body).toContain('AQI 212');
    });

    it('sends nothing below the hazardous threshold', () => {
        const sent = stubNotification('granted');

        // Warnings fire above AQI 120; notifications only above 200.
        render(
            <AlertsPanel cityName="Delhi" current={{ ...BAD_AIR, us_aqi: 150 }} confidenceScore="High" />
        );
        fireEvent.click(screen.getByRole('button', { name: /toggle hazardous pollution alerts/i }));

        expect(screen.getAllByTestId('alert-item').length).toBeGreaterThan(0);
        expect(sent).toHaveLength(0);
    });

    it('renders without a Notification API at all', () => {
        stubNotification(null);

        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);

        expect(screen.getAllByTestId('alert-item')).toHaveLength(5);
        expect(screen.queryByRole('button', { name: /enable desktop notifications/i })).not.toBeInTheDocument();
    });

    it('does not tell a browser without the API that notifications are blocked', () => {
        // The state started as "denied" when the constructor was missing, so these
        // visitors were shown unblocking instructions for a setting they do not have.
        stubNotification(null);

        render(<AlertsPanel cityName="Delhi" current={BAD_AIR} confidenceScore="High" />);

        expect(screen.queryByText(/notifications are blocked/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/you've blocked notifications/i)).not.toBeInTheDocument();
    });
});
