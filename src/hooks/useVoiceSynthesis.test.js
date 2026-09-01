import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import {
    ALERT_PRIORITIES,
    insertByPriority,
    priorityRank,
    useVoiceSynthesis,
} from './useVoiceSynthesis';

/**
 * The service is the boundary with the Web Speech API, which jsdom does not implement.
 * Mocking it keeps these tests about queue behaviour rather than about speech synthesis.
 */
vi.mock('../services/speechService', () => ({
    isSpeechSupported: vi.fn(() => true),
    getAvailableVoices: vi.fn(() => Promise.resolve([])),
    speakText: vi.fn(() => Promise.resolve()),
    stopSpeech: vi.fn(),
}));

import { getAvailableVoices, isSpeechSupported, speakText, stopSpeech } from '../services/speechService';

const CONFIG = { isEnabled: true, language: 'en-US', voiceUri: null, rate: 1, pitch: 1, volume: 1 };

/** An alert shaped the way VoiceAlertManager builds them. */
function alert(id, priority, message = `message ${id}`) {
    return { id, message, priority, timestamp: '2026-01-01T00:00:00.000Z' };
}

/**
 * Settles the mount effect's `getAvailableVoices()` promise.
 *
 * Without this, a test whose body is entirely synchronous finishes before the voice list
 * resolves and React reports the resulting `setVoices` as an update outside `act`.
 */
async function flushMount() {
    await act(async () => { });
}

/** Lets a `speakText` call be resolved by the test rather than immediately. */
function deferredSpeak() {
    let release;
    const gate = new Promise((resolve) => { release = resolve; });
    speakText.mockImplementationOnce(() => gate);
    return () => { release(); return gate; };
}

beforeEach(() => {
    vi.clearAllMocks();
    isSpeechSupported.mockReturnValue(true);
    getAvailableVoices.mockResolvedValue([]);
    speakText.mockResolvedValue(undefined);
});

afterEach(() => {
    vi.restoreAllMocks();
});

describe('priorityRank', () => {
    it('ranks the known levels in the documented order', () => {
        expect(priorityRank('CRITICAL')).toBe(0);
        expect(priorityRank('HIGH')).toBe(1);
        expect(priorityRank('MODERATE')).toBe(2);
        expect(priorityRank('LOW')).toBe(3);
    });

    it('is case insensitive, because call sites are hand-written strings', () => {
        expect(priorityRank('critical')).toBe(priorityRank('CRITICAL'));
        expect(priorityRank('Moderate')).toBe(priorityRank('MODERATE'));
    });

    it('sorts anything unrecognised after every known level rather than first', () => {
        const worst = ALERT_PRIORITIES.length - 1;
        expect(priorityRank('URGENT-ISH')).toBeGreaterThan(worst);
        expect(priorityRank(undefined)).toBeGreaterThan(worst);
        expect(priorityRank(null)).toBeGreaterThan(worst);
        expect(priorityRank(7)).toBeGreaterThan(worst);
    });
});

describe('insertByPriority', () => {
    it('appends when the queue is empty', () => {
        expect(insertByPriority([], alert('a', 'MODERATE')).map((x) => x.id)).toEqual(['a']);
    });

    it('puts a CRITICAL alert ahead of queued MODERATE ones', () => {
        const queue = [alert('m1', 'MODERATE'), alert('m2', 'MODERATE')];
        const next = insertByPriority(queue, alert('c1', 'CRITICAL'));
        expect(next.map((x) => x.id)).toEqual(['c1', 'm1', 'm2']);
    });

    it('keeps arrival order within one priority', () => {
        let queue = [];
        queue = insertByPriority(queue, alert('c1', 'CRITICAL'));
        queue = insertByPriority(queue, alert('c2', 'CRITICAL'));
        queue = insertByPriority(queue, alert('c3', 'CRITICAL'));
        expect(queue.map((x) => x.id)).toEqual(['c1', 'c2', 'c3']);
    });

    it('places a LOW alert behind everything already queued', () => {
        const queue = [alert('c1', 'CRITICAL'), alert('m1', 'MODERATE')];
        const next = insertByPriority(queue, alert('l1', 'LOW'));
        expect(next.map((x) => x.id)).toEqual(['c1', 'm1', 'l1']);
    });

    it('does not displace the head while it is being spoken', () => {
        const queue = [alert('m1', 'MODERATE'), alert('m2', 'MODERATE')];
        const next = insertByPriority(queue, alert('c1', 'CRITICAL'), true);
        // m1 is mid-utterance, so the critical alert takes the next slot instead.
        expect(next.map((x) => x.id)).toEqual(['m1', 'c1', 'm2']);
    });

    it('does displace the head when nothing is being spoken', () => {
        const queue = [alert('m1', 'MODERATE')];
        const next = insertByPriority(queue, alert('c1', 'CRITICAL'), false);
        expect(next.map((x) => x.id)).toEqual(['c1', 'm1']);
    });

    it('returns a new array rather than mutating the one passed in', () => {
        const queue = [alert('m1', 'MODERATE')];
        const next = insertByPriority(queue, alert('c1', 'CRITICAL'));
        expect(queue.map((x) => x.id)).toEqual(['m1']);
        expect(next).not.toBe(queue);
    });
});

describe('useVoiceSynthesis', () => {
    it('exposes the queue itself, not only its length (#1136)', async () => {
        const { result } = renderHook(() => useVoiceSynthesis(CONFIG));
        await flushMount();

        expect(Array.isArray(result.current.queue)).toBe(true);
        expect(result.current.queue).toEqual([]);
        expect(result.current.queueLength).toBe(0);
    });

    it('holds a queued alert in `queue` while it is being spoken', async () => {
        const release = deferredSpeak();
        const { result } = renderHook(() => useVoiceSynthesis(CONFIG));

        act(() => { result.current.addToQueue(alert('a', 'MODERATE', 'hello')); });

        await waitFor(() => expect(result.current.isSpeaking).toBe(true));
        expect(result.current.queue).toHaveLength(1);
        expect(result.current.queue[0].message).toBe('hello');
        expect(result.current.queueLength).toBe(1);

        await act(async () => { await release(); });
        await waitFor(() => expect(result.current.queue).toHaveLength(0));
    });

    it('speaks a CRITICAL alert before MODERATE ones queued ahead of it', async () => {
        const release = deferredSpeak();
        const { result } = renderHook(() => useVoiceSynthesis(CONFIG));

        // First alert starts speaking immediately and is pinned to the head.
        act(() => { result.current.addToQueue(alert('m1', 'MODERATE', 'routine one')); });
        await waitFor(() => expect(result.current.isSpeaking).toBe(true));

        act(() => {
            result.current.addToQueue(alert('m2', 'MODERATE', 'routine two'));
            result.current.addToQueue(alert('c1', 'CRITICAL', 'critical'));
        });

        expect(result.current.queue.map((x) => x.id)).toEqual(['m1', 'c1', 'm2']);

        await act(async () => { await release(); });
        await waitFor(() => expect(result.current.queue).toHaveLength(0));

        expect(speakText.mock.calls.map(([message]) => message)).toEqual([
            'routine one',
            'critical',
            'routine two',
        ]);
    });

    it('drains the queue in order and reports the messages it spoke', async () => {
        const { result } = renderHook(() => useVoiceSynthesis(CONFIG));

        act(() => {
            result.current.addToQueue(alert('a', 'MODERATE', 'first'));
            result.current.addToQueue(alert('b', 'MODERATE', 'second'));
        });

        await waitFor(() => expect(result.current.queue).toHaveLength(0));
        expect(speakText.mock.calls.map(([message]) => message)).toEqual(['first', 'second']);
    });

    it('ignores an alert with no usable message instead of queueing a silent row', async () => {
        const { result } = renderHook(() => useVoiceSynthesis(CONFIG));
        await flushMount();

        act(() => {
            result.current.addToQueue(null);
            result.current.addToQueue({ id: 'x', priority: 'CRITICAL' });
            result.current.addToQueue({ id: 'y', message: '   ', priority: 'CRITICAL' });
        });

        expect(result.current.queue).toEqual([]);
        expect(speakText).not.toHaveBeenCalled();
    });

    it('does not speak while alerts are disabled, and keeps the alert queued', async () => {
        const { result } = renderHook(() => useVoiceSynthesis({ ...CONFIG, isEnabled: false }));

        act(() => { result.current.addToQueue(alert('a', 'CRITICAL', 'held')); });

        expect(result.current.queue).toHaveLength(1);
        expect(speakText).not.toHaveBeenCalled();

        act(() => { result.current.updateConfig({ isEnabled: true }); });
        await waitFor(() => expect(speakText).toHaveBeenCalledWith('held', expect.objectContaining({ isEnabled: true })));
    });

    it('stops the utterance in flight when alerts are switched off', async () => {
        const release = deferredSpeak();
        const { result } = renderHook(() => useVoiceSynthesis(CONFIG));

        act(() => { result.current.addToQueue(alert('a', 'CRITICAL', 'speaking')); });
        await waitFor(() => expect(result.current.isSpeaking).toBe(true));

        act(() => { result.current.updateConfig({ isEnabled: false }); });
        expect(stopSpeech).toHaveBeenCalled();

        await act(async () => { await release(); });
    });

    it('clearQueue empties the queue and stops speech', async () => {
        const release = deferredSpeak();
        const { result } = renderHook(() => useVoiceSynthesis(CONFIG));

        act(() => { result.current.addToQueue(alert('a', 'MODERATE')); });
        await waitFor(() => expect(result.current.isSpeaking).toBe(true));

        act(() => { result.current.clearQueue(); });

        expect(stopSpeech).toHaveBeenCalled();
        expect(result.current.queue).toEqual([]);
        expect(result.current.isSpeaking).toBe(false);

        await act(async () => { await release(); });
    });

    it('keeps draining after a failed utterance rather than wedging the queue', async () => {
        speakText.mockRejectedValueOnce(new Error('synthesis-failed'));
        vi.spyOn(console, 'error').mockImplementation(() => { });

        const { result } = renderHook(() => useVoiceSynthesis(CONFIG));

        act(() => {
            result.current.addToQueue(alert('a', 'MODERATE', 'boom'));
            result.current.addToQueue(alert('b', 'MODERATE', 'after'));
        });

        await waitFor(() => expect(result.current.queue).toHaveLength(0));
        expect(speakText.mock.calls.map(([message]) => message)).toEqual(['boom', 'after']);
    });

    it('reports the browser as unsupported without asking for voices', async () => {
        isSpeechSupported.mockReturnValue(false);
        const { result } = renderHook(() => useVoiceSynthesis(CONFIG));

        await waitFor(() => expect(result.current.isSupported).toBe(false));
        expect(getAvailableVoices).not.toHaveBeenCalled();
    });

    it('does not set voices after unmount', async () => {
        let resolveVoices;
        getAvailableVoices.mockReturnValueOnce(new Promise((resolve) => { resolveVoices = resolve; }));
        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

        const { unmount } = renderHook(() => useVoiceSynthesis(CONFIG));
        unmount();

        await act(async () => { resolveVoices([{ voiceURI: 'x', name: 'X', lang: 'en-US' }]); });
        expect(errorSpy).not.toHaveBeenCalled();
    });
});
