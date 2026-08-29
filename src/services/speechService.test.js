import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
    SPEECH_RANGES,
    clampToRange,
    getAvailableVoices,
    isSpeechSupported,
    speakText,
    stopSpeech,
} from './speechService';

/**
 * jsdom implements neither `speechSynthesis` nor `SpeechSynthesisUtterance`, so both are
 * stood up here. The fake mirrors the parts of the real API these tests depend on,
 * including the one that caused #1139: `getVoices()` returning `[]` until the engine has
 * loaded its list, with `voiceschanged` that may or may not ever fire.
 */
function makeSynth({ voices = [], supportsListeners = true } = {}) {
    const listeners = new Set();
    const synth = {
        spoken: [],
        cancelled: 0,
        getVoices: vi.fn(() => voices),
        cancel: vi.fn(function cancel() { this.cancelled += 1; }),
        speak: vi.fn(function speak(utterance) { this.spoken.push(utterance); }),
        onvoiceschanged: null,
        /** Fires the event, the way an engine does once its list is ready. */
        emitVoicesChanged() {
            for (const listener of [...listeners]) listener();
            if (typeof this.onvoiceschanged === 'function') this.onvoiceschanged();
        },
        /** Replaces the list the engine reports. */
        setVoices(next) { voices = next; synth.getVoices.mockImplementation(() => next); },
        listenerCount: () => listeners.size,
    };

    if (supportsListeners) {
        synth.addEventListener = vi.fn((type, listener) => {
            if (type === 'voiceschanged') listeners.add(listener);
        });
        synth.removeEventListener = vi.fn((type, listener) => {
            if (type === 'voiceschanged') listeners.delete(listener);
        });
    }

    return synth;
}

class FakeUtterance {
    constructor(text) {
        this.text = text;
        this.voice = null;
        this.lang = '';
        this.rate = 1;
        this.pitch = 1;
        this.volume = 1;
        this.onend = null;
        this.onerror = null;
    }
}

const VOICES = [
    { voiceURI: 'uri-a', name: 'Aditi', lang: 'en-IN' },
    { voiceURI: 'uri-b', name: 'Brian', lang: 'en-GB' },
];

let synth;

function install(options) {
    synth = makeSynth(options);
    vi.stubGlobal('speechSynthesis', synth);
    vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance);
    // `isSpeechSupported` checks `'speechSynthesis' in window`, and stubGlobal in jsdom
    // assigns onto the same object window aliases.
    window.speechSynthesis = synth;
    window.SpeechSynthesisUtterance = FakeUtterance;
    return synth;
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    delete window.speechSynthesis;
    delete window.SpeechSynthesisUtterance;
    vi.restoreAllMocks();
});

describe('clampToRange', () => {
    it('keeps a value already inside the range', () => {
        expect(clampToRange(1.5, SPEECH_RANGES.rate)).toBe(1.5);
        expect(clampToRange(0.5, SPEECH_RANGES.volume)).toBe(0.5);
    });

    it('keeps zero where zero is legal, instead of rewriting it to 1 (#1139)', () => {
        // `config.pitch || 1` turned the slider's minimum into normal pitch.
        expect(clampToRange(0, SPEECH_RANGES.pitch)).toBe(0);
        expect(clampToRange(0, SPEECH_RANGES.volume)).toBe(0);
    });

    it('clamps to the documented bounds rather than letting speak() throw', () => {
        expect(clampToRange(0, SPEECH_RANGES.rate)).toBe(0.1);
        expect(clampToRange(99, SPEECH_RANGES.rate)).toBe(10);
        expect(clampToRange(-3, SPEECH_RANGES.pitch)).toBe(0);
        expect(clampToRange(5, SPEECH_RANGES.pitch)).toBe(2);
        expect(clampToRange(2, SPEECH_RANGES.volume)).toBe(1);
    });

    it('falls back for a value that is not a number at all', () => {
        expect(clampToRange(undefined, SPEECH_RANGES.rate)).toBe(1);
        expect(clampToRange(null, SPEECH_RANGES.rate)).toBe(1);
        expect(clampToRange(NaN, SPEECH_RANGES.rate)).toBe(1);
        expect(clampToRange('fast', SPEECH_RANGES.rate)).toBe(1);
    });

    it('accepts a numeric string, which is what a range input produces', () => {
        expect(clampToRange('0.5', SPEECH_RANGES.rate)).toBe(0.5);
    });
});

describe('isSpeechSupported', () => {
    it('is true when the browser has speechSynthesis', () => {
        install();
        expect(isSpeechSupported()).toBe(true);
    });

    it('is false when it does not', () => {
        expect(isSpeechSupported()).toBe(false);
    });
});

describe('getAvailableVoices', () => {
    it('resolves immediately when the list is already populated', async () => {
        install({ voices: VOICES });
        await expect(getAvailableVoices()).resolves.toEqual(VOICES);
        expect(synth.addEventListener).not.toHaveBeenCalled();
    });

    it('resolves when voiceschanged arrives with a populated list', async () => {
        install({ voices: [] });
        const pending = getAvailableVoices();

        synth.setVoices(VOICES);
        synth.emitVoicesChanged();

        await expect(pending).resolves.toEqual(VOICES);
    });

    it('settles even when voiceschanged never fires (#1139)', async () => {
        // The old implementation waited on that event alone, so this promise stayed
        // pending forever and the voice picker sat empty with nothing to retry.
        install({ voices: [] });
        const pending = getAvailableVoices(2000);

        await vi.advanceTimersByTimeAsync(2000);

        await expect(pending).resolves.toEqual([]);
    });

    it('picks the list up by polling when the event never fires', async () => {
        install({ voices: [] });
        const pending = getAvailableVoices(2000);

        synth.setVoices(VOICES);
        await vi.advanceTimersByTimeAsync(200);

        await expect(pending).resolves.toEqual(VOICES);
    });

    it('ignores a voiceschanged that arrives before the list is ready', async () => {
        install({ voices: [] });
        const pending = getAvailableVoices(2000);

        // Some engines fire this more than once; the first can still report nothing.
        synth.emitVoicesChanged();
        synth.setVoices(VOICES);
        synth.emitVoicesChanged();

        await expect(pending).resolves.toEqual(VOICES);
    });

    it('answers every concurrent caller (#1139)', async () => {
        // The old code assigned `onvoiceschanged`, a single slot: a second caller
        // overwrote the first one's resolve and the first never settled.
        install({ voices: [] });
        const first = getAvailableVoices();
        const second = getAvailableVoices();
        const third = getAvailableVoices();

        synth.setVoices(VOICES);
        synth.emitVoicesChanged();

        await expect(Promise.all([first, second, third])).resolves.toEqual([VOICES, VOICES, VOICES]);
    });

    it('leaves the page\'s own onvoiceschanged handler alone (#1139)', async () => {
        install({ voices: [] });
        const pageHandler = vi.fn();
        synth.onvoiceschanged = pageHandler;

        const pending = getAvailableVoices();
        synth.setVoices(VOICES);
        synth.emitVoicesChanged();
        await pending;

        expect(synth.onvoiceschanged).toBe(pageHandler);
        expect(pageHandler).toHaveBeenCalled();
    });

    it('removes its listener and timers once it has an answer', async () => {
        install({ voices: [] });
        const pending = getAvailableVoices();

        synth.setVoices(VOICES);
        synth.emitVoicesChanged();
        await pending;

        expect(synth.listenerCount()).toBe(0);
        // Nothing left to fire: advancing past the timeout must not throw or re-resolve.
        await vi.advanceTimersByTimeAsync(5000);
        expect(synth.removeEventListener).toHaveBeenCalled();
    });

    it('resolves empty rather than throwing where there is no speech support', async () => {
        await expect(getAvailableVoices()).resolves.toEqual([]);
    });

    it('survives a getVoices() that throws', async () => {
        install({ voices: [] });
        synth.getVoices.mockImplementation(() => { throw new Error('engine unavailable'); });

        const pending = getAvailableVoices(2000);
        await vi.advanceTimersByTimeAsync(2000);

        await expect(pending).resolves.toEqual([]);
    });

    it('still settles on an engine with no addEventListener', async () => {
        install({ voices: [], supportsListeners: false });
        const pending = getAvailableVoices(2000);

        synth.setVoices(VOICES);
        await vi.advanceTimersByTimeAsync(200);

        await expect(pending).resolves.toEqual(VOICES);
    });
});

describe('speakText', () => {
    it('speaks the text and resolves when the utterance ends', async () => {
        install({ voices: VOICES });
        const pending = speakText('hello', { language: 'en-GB', rate: 1, pitch: 1, volume: 1 });

        expect(synth.speak).toHaveBeenCalledTimes(1);
        const [utterance] = synth.spoken;
        expect(utterance.text).toBe('hello');
        expect(utterance.lang).toBe('en-GB');

        utterance.onend();
        await expect(pending).resolves.toBeUndefined();
    });

    it('honours rate 0 and pitch 0 as deliberate values (#1139)', async () => {
        install({ voices: VOICES });
        const pending = speakText('hello', { rate: 0, pitch: 0, volume: 0 });

        const [utterance] = synth.spoken;
        expect(utterance.rate).toBe(0.1);   // clamped to the API minimum, not reset to 1
        expect(utterance.pitch).toBe(0);    // 0 is legal for pitch
        expect(utterance.volume).toBe(0);   // and for volume

        utterance.onend();
        await pending;
    });

    it('clamps an out-of-range value instead of letting speak() throw', async () => {
        install({ voices: VOICES });
        const pending = speakText('hello', { rate: 50, pitch: -1, volume: 9 });

        const [utterance] = synth.spoken;
        expect(utterance.rate).toBe(10);
        expect(utterance.pitch).toBe(0);
        expect(utterance.volume).toBe(1);

        utterance.onend();
        await pending;
    });

    it('selects the configured voice when it exists', async () => {
        install({ voices: VOICES });
        const pending = speakText('hello', { voiceUri: 'uri-b' });

        expect(synth.spoken[0].voice).toEqual(VOICES[1]);
        synth.spoken[0].onend();
        await pending;
    });

    it('falls back to the default voice when the configured one is gone', async () => {
        install({ voices: VOICES });
        const pending = speakText('hello', { voiceUri: 'uri-that-was-uninstalled' });

        expect(synth.spoken[0].voice).toBeNull();
        synth.spoken[0].onend();
        await pending;
    });

    it('cancels whatever is speaking before starting', async () => {
        install({ voices: VOICES });
        const pending = speakText('hello', {});

        expect(synth.cancel).toHaveBeenCalled();
        synth.spoken[0].onend();
        await pending;
    });

    it('rejects rather than queueing an utterance that can never end', async () => {
        install({ voices: VOICES });
        await expect(speakText('', {})).rejects.toThrow('Nothing to speak');
        await expect(speakText('   ', {})).rejects.toThrow('Nothing to speak');
        await expect(speakText(null, {})).rejects.toThrow('Nothing to speak');
        expect(synth.speak).not.toHaveBeenCalled();
    });

    it('rejects with the engine error', async () => {
        install({ voices: VOICES });
        const pending = speakText('hello', {});

        synth.spoken[0].onerror({ error: 'synthesis-failed' });
        await expect(pending).rejects.toThrow('Speech error: synthesis-failed');
    });

    it('rejects where the browser has no speech synthesis', async () => {
        await expect(speakText('hello', {})).rejects.toThrow('Speech synthesis not supported');
    });

    it('tolerates a missing config', async () => {
        install({ voices: VOICES });
        const pending = speakText('hello');

        const [utterance] = synth.spoken;
        expect(utterance.lang).toBe('en-US');
        expect(utterance.rate).toBe(1);

        utterance.onend();
        await pending;
    });
});

describe('stopSpeech', () => {
    it('cancels the engine', () => {
        install({ voices: VOICES });
        stopSpeech();
        expect(synth.cancel).toHaveBeenCalled();
    });

    it('is a no-op where there is no speech synthesis', () => {
        expect(() => stopSpeech()).not.toThrow();
    });
});
