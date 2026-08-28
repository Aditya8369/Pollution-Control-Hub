import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import EcoChallengeDashboard, { progressPercent, progressCount, readChallengeData } from './EcoChallengeDashboard';
import { fetchActiveChallenges, joinChallenge, claimChallengeReward } from '../services/challengeService';

vi.mock('../services/challengeService', () => ({
    fetchActiveChallenges: vi.fn(),
    joinChallenge: vi.fn(),
    claimChallengeReward: vi.fn(),
}));

function challenge(overrides = {}) {
    return {
        id: 'ch-1',
        title: 'Report five hotspots',
        description: 'Submit five verified pollution reports this week.',
        category: 'REPORTING',
        frequency: 'WEEKLY',
        targetValue: 5,
        unit: 'reports',
        rewardValue: 250,
        badgeName: 'Hotspot Scout',
        ...overrides,
    };
}

function payload(overrides = {}) {
    return {
        challenges: [challenge()],
        userProgress: {},
        totalPointsEarned: 1200,
        ...overrides,
    };
}

async function renderLoaded(data = payload()) {
    fetchActiveChallenges.mockResolvedValue(data);
    render(<EcoChallengeDashboard />);
    await waitFor(() => expect(screen.queryByTestId('challenges-loading')).not.toBeInTheDocument());
}

beforeEach(() => {
    joinChallenge.mockResolvedValue({ ok: true });
    claimChallengeReward.mockResolvedValue({ pointsAwarded: 250 });
});

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

describe('progressPercent', () => {
    it('scales progress against the target', () => {
        expect(progressPercent(2, 5)).toBe(40);
        expect(progressPercent(5, 5)).toBe(100);
    });

    it('caps at 100 when progress overshoots', () => {
        expect(progressPercent(9, 5)).toBe(100);
    });

    it('returns 0 for a zero target instead of Infinity', () => {
        // `(3 / 0) * 100` is Infinity and `(0 / 0) * 100` is NaN. `width: "NaN%"` is
        // dropped by the browser, so the bar vanished rather than looking wrong.
        expect(progressPercent(3, 0)).toBe(0);
        expect(progressPercent(0, 0)).toBe(0);
    });

    it('returns 0 rather than a negative width', () => {
        expect(progressPercent(-4, 5)).toBe(0);
    });

    it('returns 0 for missing or non-numeric values', () => {
        expect(progressPercent(undefined, 5)).toBe(0);
        expect(progressPercent(null, 5)).toBe(0);
        expect(progressPercent('two', 5)).toBe(0);
        expect(progressPercent(2, undefined)).toBe(0);
        expect(progressPercent(2, -5)).toBe(0);
    });

    it('is always a usable CSS percentage', () => {
        const inputs = [[3, 0], [0, 0], [-4, 5], [undefined, 5], [2, 'x'], [9, 5], [Infinity, 5]];
        for (const [done, target] of inputs) {
            const percent = progressPercent(done, target);
            expect(Number.isFinite(percent)).toBe(true);
            expect(percent).toBeGreaterThanOrEqual(0);
            expect(percent).toBeLessThanOrEqual(100);
        }
    });
});

describe('progressCount', () => {
    it('passes a real count through', () => {
        expect(progressCount(3)).toBe(3);
    });

    it('never renders undefined next to the target', () => {
        expect(progressCount(undefined)).toBe(0);
        expect(progressCount(null)).toBe(0);
        expect(progressCount('many')).toBe(0);
        expect(progressCount(-2)).toBe(0);
    });
});

describe('readChallengeData', () => {
    it('reads a well-formed payload', () => {
        expect(readChallengeData(payload())).toEqual({
            challenges: [challenge()],
            userProgress: {},
            totalPointsEarned: 1200,
        });
    });

    it('survives a payload with no challenges array', () => {
        // `data?.challenges.map(...)` stopped its optional chain at `data`, so this
        // threw during render.
        expect(readChallengeData({}).challenges).toEqual([]);
        expect(readChallengeData({ userProgress: {} }).challenges).toEqual([]);
        expect(readChallengeData(null).challenges).toEqual([]);
        expect(readChallengeData({ challenges: 'nope' }).challenges).toEqual([]);
    });

    it('survives a payload with no userProgress', () => {
        expect(readChallengeData({ challenges: [] }).userProgress).toEqual({});
        expect(readChallengeData({ userProgress: null }).userProgress).toEqual({});
    });

    it('defaults the points total to 0', () => {
        expect(readChallengeData({}).totalPointsEarned) .toBe(0);
        expect(readChallengeData({ totalPointsEarned: 'lots' }).totalPointsEarned).toBe(0);
    });
});

describe('EcoChallengeDashboard — the error screen is recoverable', () => {
    it('offers a retry instead of a dead red box', async () => {
        fetchActiveChallenges.mockRejectedValueOnce(new Error('Failed to fetch'));

        render(<EcoChallengeDashboard />);

        const errorScreen = await screen.findByTestId('challenges-error');
        expect(errorScreen).toHaveTextContent('Failed to fetch');
        expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('clears the error when the retry succeeds', async () => {
        fetchActiveChallenges.mockRejectedValueOnce(new Error('Failed to fetch'));
        render(<EcoChallengeDashboard />);
        await screen.findByTestId('challenges-error');

        fetchActiveChallenges.mockResolvedValue(payload());
        fireEvent.click(screen.getByRole('button', { name: /try again/i }));

        await waitFor(() => expect(screen.getByText('Report five hotspots')).toBeInTheDocument());
        expect(screen.queryByTestId('challenges-error')).not.toBeInTheDocument();
    });

    it('does not leave loaded challenges hidden behind a stale error', async () => {
        await renderLoaded();

        // A refresh fails, then recovers. The old code latched `error` on the first
        // failure and never cleared it, so everything after this point was invisible.
        fetchActiveChallenges.mockRejectedValueOnce(new Error('flaky'));
        fireEvent.click(screen.getByRole('button', { name: /join challenge/i }));
        await waitFor(() => expect(screen.getByTestId('challenges-error-banner')).toBeInTheDocument());
        expect(screen.getByText('Report five hotspots')).toBeInTheDocument();

        fetchActiveChallenges.mockResolvedValue(payload());
        fireEvent.click(screen.getByRole('button', { name: /retry/i }));

        await waitFor(() => expect(screen.queryByTestId('challenges-error-banner')).not.toBeInTheDocument());
    });
});

describe('EcoChallengeDashboard — malformed payloads', () => {
    it('renders the empty state instead of throwing on a payload with no challenges', async () => {
        await renderLoaded({});

        expect(screen.getByTestId('challenges-empty')).toBeInTheDocument();
        expect(screen.getByTestId('total-points')).toHaveTextContent('0');
    });

    it('distinguishes an empty result from a failure', async () => {
        await renderLoaded(payload({ challenges: [] }));

        expect(screen.getByTestId('challenges-empty')).toHaveTextContent(/no challenges are running/i);
        expect(screen.queryByTestId('challenges-error')).not.toBeInTheDocument();
    });

    it('renders a joined challenge whose progress record is missing fields', async () => {
        await renderLoaded(payload({ userProgress: { 'ch-1': {} } }));

        expect(screen.getByTestId('progress-label-ch-1')).toHaveTextContent('0 / 5 reports');
        expect(screen.getByTestId('progress-label-ch-1')).not.toHaveTextContent('undefined');
    });
});

describe('EcoChallengeDashboard — the progress bar', () => {
    it('renders a usable width for a zero target', async () => {
        await renderLoaded(payload({
            challenges: [challenge({ targetValue: 0 })],
            userProgress: { 'ch-1': { progress: 3 } },
        }));

        expect(screen.getByTestId('progress-bar-ch-1')).toHaveStyle({ width: '0%' });
    });

    it('does not overflow its track', async () => {
        await renderLoaded(payload({ userProgress: { 'ch-1': { progress: 12 } } }));

        expect(screen.getByTestId('progress-bar-ch-1')).toHaveStyle({ width: '100%' });
    });

    it('scales a partial completion', async () => {
        await renderLoaded(payload({ userProgress: { 'ch-1': { progress: 2 } } }));

        expect(screen.getByTestId('progress-bar-ch-1')).toHaveStyle({ width: '40%' });
    });
});

describe('EcoChallengeDashboard — completed challenges', () => {
    it('does not render the stray full stop after the completion message', async () => {
        await renderLoaded(payload({
            userProgress: { 'ch-1': { progress: 5, isCompleted: true, rewardClaimed: false } },
        }));

        const message = screen.getByText(/challenge completed/i);
        expect(message.textContent.trim()).toBe('✅ Challenge Completed! Claim your reward.');
    });

    it('reports a claim in the page rather than through window.alert', async () => {
        const windowAlert = vi.spyOn(window, 'alert').mockImplementation(() => { });
        await renderLoaded(payload({
            userProgress: { 'ch-1': { progress: 5, isCompleted: true, rewardClaimed: false } },
        }));

        fireEvent.click(screen.getByRole('button', { name: /claim reward/i }));

        await waitFor(() => expect(screen.getByTestId('challenges-notice')).toHaveTextContent('250 points'));
        expect(windowAlert).not.toHaveBeenCalled();
    });

    it('reports a failed claim in the page and leaves the button usable', async () => {
        claimChallengeReward.mockRejectedValue(new Error('Reward already claimed.'));
        const windowAlert = vi.spyOn(window, 'alert').mockImplementation(() => { });
        await renderLoaded(payload({
            userProgress: { 'ch-1': { progress: 5, isCompleted: true, rewardClaimed: false } },
        }));

        fireEvent.click(screen.getByRole('button', { name: /claim reward/i }));

        await waitFor(() => expect(screen.getByTestId('challenges-action-error')).toHaveTextContent('Reward already claimed.'));
        expect(windowAlert).not.toHaveBeenCalled();
        expect(screen.getByRole('button', { name: /claim reward/i })).toBeEnabled();
    });
});

describe('EcoChallengeDashboard — joining', () => {
    it('joins and refreshes without blanking the page', async () => {
        await renderLoaded();

        fireEvent.click(screen.getByRole('button', { name: /join challenge/i }));

        await waitFor(() => expect(joinChallenge).toHaveBeenCalledWith('ch-1'));
        // A background refresh must not drop the grid back to the spinner.
        expect(screen.queryByTestId('challenges-loading')).not.toBeInTheDocument();
        expect(screen.getByText('Report five hotspots')).toBeInTheDocument();
    });

    it('reports a join failure in the page', async () => {
        joinChallenge.mockRejectedValue(new Error('Already enrolled.'));
        const windowAlert = vi.spyOn(window, 'alert').mockImplementation(() => { });
        await renderLoaded();

        fireEvent.click(screen.getByRole('button', { name: /join challenge/i }));

        await waitFor(() => expect(screen.getByTestId('challenges-action-error')).toHaveTextContent('Already enrolled.'));
        expect(windowAlert).not.toHaveBeenCalled();
    });
});
