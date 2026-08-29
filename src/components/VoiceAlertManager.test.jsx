import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import VoiceAlertManager from './VoiceAlertManager';

/**
 * jsdom has no Web Speech API, so the service is stubbed. Everything below is about what
 * the panel renders, not about speech synthesis.
 */
vi.mock('../services/speechService', () => ({
    isSpeechSupported: vi.fn(() => true),
    getAvailableVoices: vi.fn(() => Promise.resolve([])),
    speakText: vi.fn(() => Promise.resolve()),
    stopSpeech: vi.fn(),
}));

import { getAvailableVoices, isSpeechSupported, speakText } from '../services/speechService';

/** Holds `speakText` open so the panel can be inspected mid-utterance. */
function deferredSpeak() {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    speakText.mockImplementationOnce(() => gate);
    return () => { release(); return gate; };
}

async function renderPanel() {
    const view = render(<VoiceAlertManager />);
    await act(async () => { });
    return view;
}

const queueRegion = () => screen.getByText('Alert Queue').closest('div').parentElement;

beforeEach(() => {
    vi.clearAllMocks();
    isSpeechSupported.mockReturnValue(true);
    getAvailableVoices.mockResolvedValue([]);
    speakText.mockResolvedValue(undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('VoiceAlertManager', () => {
    it('renders the empty queue state on load', async () => {
        await renderPanel();

        expect(screen.getByText('Voice-Guided Accessibility Suite')).toBeInTheDocument();
        expect(screen.getByText('0 pending')).toBeInTheDocument();
        expect(screen.getByText('Queue is empty.')).toBeInTheDocument();
    });

    it('renders the pending alert instead of throwing "queue is not defined" (#1136)', async () => {
        const release = deferredSpeak();
        await renderPanel();

        // Before the fix this render threw ReferenceError: queue is not defined, because
        // the hook only ever returned queueLength and the else-branch reads `queue`.
        fireEvent.click(screen.getByRole('button', { name: /test voice/i }));

        await waitFor(() => expect(screen.getByText('1 pending')).toBeInTheDocument());
        expect(screen.queryByText('Queue is empty.')).not.toBeInTheDocument();

        const items = within(queueRegion()).getAllByRole('listitem');
        expect(items).toHaveLength(1);
        expect(items[0]).toHaveTextContent('Air quality alert: PM2.5 levels are currently moderate.');
        expect(items[0]).toHaveTextContent('Priority: MODERATE');

        await act(async () => { await release(); });
    });

    it('marks the alert being spoken as PLAYING', async () => {
        const release = deferredSpeak();
        await renderPanel();

        fireEvent.click(screen.getByRole('button', { name: /test voice/i }));

        await waitFor(() => expect(screen.getByText('PLAYING')).toBeInTheDocument());

        await act(async () => { await release(); });
        await waitFor(() => expect(screen.getByText('Queue is empty.')).toBeInTheDocument());
    });

    it('renders a simulated critical alert with its priority and threshold', async () => {
        const release = deferredSpeak();
        await renderPanel();

        fireEvent.click(screen.getByRole('button', { name: /simulate critical aqi alert/i }));

        await waitFor(() => expect(screen.getByText('1 pending')).toBeInTheDocument());
        const [row] = within(queueRegion()).getAllByRole('listitem');
        expect(row).toHaveTextContent('Critical pollution alert. AQI has exceeded 100 in your area.');
        expect(row).toHaveTextContent('Priority: CRITICAL');

        await act(async () => { await release(); });
    });

    it('queues a second critical alert behind the one being spoken', async () => {
        const release = deferredSpeak();
        await renderPanel();

        fireEvent.click(screen.getByRole('button', { name: /simulate critical aqi alert/i }));
        await waitFor(() => expect(screen.getByText('1 pending')).toBeInTheDocument());

        // Test Voice is correctly disabled mid-utterance, so the critical button is the
        // only way to add another alert here. Same priority keeps arrival order.
        expect(screen.getByRole('button', { name: /speaking/i })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: /simulate critical aqi alert/i }));

        await waitFor(() => expect(screen.getByText('2 pending')).toBeInTheDocument());
        const rows = within(queueRegion()).getAllByRole('listitem');
        expect(rows).toHaveLength(2);
        expect(rows[0]).toHaveTextContent('PLAYING');
        expect(rows[1]).not.toHaveTextContent('PLAYING');

        await act(async () => { await release(); });
    });

    it('clears a queued alert when Clear Queue is pressed', async () => {
        const release = deferredSpeak();
        await renderPanel();

        fireEvent.click(screen.getByRole('button', { name: /test voice/i }));
        await waitFor(() => expect(screen.getByText('1 pending')).toBeInTheDocument());

        fireEvent.click(screen.getByRole('button', { name: /clear queue/i }));

        await waitFor(() => expect(screen.getByText('0 pending')).toBeInTheDocument());
        expect(screen.getByText('Queue is empty.')).toBeInTheDocument();

        await act(async () => { await release(); });
    });

    it('disables Clear Queue while there is nothing to clear', async () => {
        await renderPanel();
        expect(screen.getByRole('button', { name: /clear queue/i })).toBeDisabled();
    });

    it('tells the visitor when the browser has no speech synthesis', async () => {
        isSpeechSupported.mockReturnValue(false);
        await renderPanel();

        expect(screen.getByText('Voice Features Unavailable')).toBeInTheDocument();
        expect(screen.queryByText('Alert Queue')).not.toBeInTheDocument();
    });

    it('lists the voices the service reports', async () => {
        getAvailableVoices.mockResolvedValue([
            { voiceURI: 'uri-a', name: 'Aditi', lang: 'en-IN' },
            { voiceURI: 'uri-b', name: 'Brian', lang: 'en-GB' },
        ]);
        await renderPanel();

        const select = screen.getByRole('combobox');
        expect(within(select).getByRole('option', { name: 'Aditi (en-IN)' })).toBeInTheDocument();
        expect(within(select).getByRole('option', { name: 'Brian (en-GB)' })).toBeInTheDocument();
    });
});
