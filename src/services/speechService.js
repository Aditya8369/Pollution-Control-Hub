/**
 * @fileoverview Service layer wrapping the Web Speech API for text-to-speech alert generation.
 */

/**
 * How long to wait for the voice list before giving up and answering with whatever the
 * engine has.
 *
 * `getVoices()` returning `[]` on the first call is the normal case in Chrome and Edge —
 * the list is populated asynchronously — so the wait is the usual path, not the edge case.
 * Two seconds is well past how long a local engine takes and short enough that a device
 * with no voices at all doesn't leave the picker looking merely slow.
 */
const VOICES_TIMEOUT_MS = 2000;

/**
 * `voiceschanged` is not guaranteed to fire: not in Firefox when the list is already
 * final, not in headless Chrome with no speech engine, not in jsdom. Some engines fire it
 * more than once as lists load in, and the first fire can still hand back an empty list.
 * Polling alongside the event covers both, and is cheap over a two-second window.
 */
const VOICES_POLL_MS = 100;

/** @see {@link https://developer.mozilla.org/docs/Web/API/SpeechSynthesisUtterance} */
const RATE_RANGE = { min: 0.1, max: 10, fallback: 1 };
const PITCH_RANGE = { min: 0, max: 2, fallback: 1 };
const VOLUME_RANGE = { min: 0, max: 1, fallback: 1 };

/**
 * Checks if the browser supports the Web Speech API.
 * @returns {boolean}
 */
export const isSpeechSupported = () => {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
};

/**
 * Keeps a configured value inside the range the Web Speech API accepts.
 *
 * `config.rate || 1` was wrong twice over. `0` is a value the API accepts and the value the
 * settings slider's minimum produces, and `||` rewrote it to `1` — so dragging rate to the
 * bottom silently gave normal speed. It also let an out-of-range value straight through,
 * and `speak()` throws a `SyntaxError` on those, which surfaced as an unhandled rejection.
 *
 * Exported so the settings UI can apply the same bounds it will be held to.
 *
 * @param {unknown} value
 * @param {{min: number, max: number, fallback: number}} range
 * @returns {number}
 */
export function clampToRange(value, range) {
    let numeric;
    if (typeof value === 'number') {
        numeric = value;
    } else if (typeof value === 'string' && value.trim() !== '') {
        // A range input hands back a string, and it is the settings form's own value.
        numeric = Number(value);
    } else {
        // `Number(null)` and `Number('')` are both 0, which is inside two of these three
        // ranges. Absent is not zero, so neither reaches the clamp.
        return range.fallback;
    }

    if (!Number.isFinite(numeric)) return range.fallback;
    return Math.min(range.max, Math.max(range.min, numeric));
}

/** The bounds `speakText` applies, for callers that want to show them. */
export const SPEECH_RANGES = { rate: RATE_RANGE, pitch: PITCH_RANGE, volume: VOLUME_RANGE };

/**
 * Fetches available voices from the browser.
 *
 * Always settles. The previous implementation assigned `speechSynthesis.onvoiceschanged`
 * and resolved from it, which meant: the promise never settled at all where that event
 * does not fire, leaving `useVoiceSynthesis`'s `.then(setVoices)` hanging and the voice
 * picker permanently and inexplicably empty; a second concurrent caller overwrote the
 * first one's handler, so the first never resolved; and the global handler slot was
 * clobbered and never restored. See #1139.
 *
 * @param {number} [timeoutMs] - How long to wait before answering with what is available.
 * @returns {Promise<SpeechSynthesisVoice[]>} Never rejects; resolves `[]` if there are none.
 */
export const getAvailableVoices = (timeoutMs = VOICES_TIMEOUT_MS) => {
    return new Promise((resolve) => {
        if (!isSpeechSupported()) {
            resolve([]);
            return;
        }

        const synth = window.speechSynthesis;

        /** @returns {SpeechSynthesisVoice[]} */
        const read = () => {
            try {
                const voices = synth.getVoices();
                return Array.isArray(voices) ? voices : [];
            } catch {
                return [];
            }
        };

        const immediate = read();
        if (immediate.length > 0) {
            resolve(immediate);
            return;
        }

        let settled = false;
        let pollId;
        let timeoutId;

        const finish = (voices) => {
            if (settled) return;
            settled = true;
            clearInterval(pollId);
            clearTimeout(timeoutId);
            // addEventListener rather than the onvoiceschanged slot, so concurrent callers
            // do not overwrite each other and the page's own handler is left alone.
            synth.removeEventListener?.('voiceschanged', onVoicesChanged);
            resolve(voices);
        };

        function onVoicesChanged() {
            const voices = read();
            // Some engines fire this before the list is populated; wait for the next one
            // (or the poll, or the timeout) rather than resolving empty on the first.
            if (voices.length > 0) finish(voices);
        }

        synth.addEventListener?.('voiceschanged', onVoicesChanged);

        pollId = setInterval(() => {
            const voices = read();
            if (voices.length > 0) finish(voices);
        }, VOICES_POLL_MS);

        // The backstop that makes "always settles" true. Answering with an empty list is
        // a usable answer; never answering is not.
        timeoutId = setTimeout(() => finish(read()), timeoutMs);
    });
};

/**
 * Speaks the provided text using the Web Speech API.
 * @param {string} text - The text to speak.
 * @param {import('../types/speech').VoiceConfiguration} config - Voice configuration.
 * @returns {Promise<void>}
 */
export const speakText = (text, config) => {
    return new Promise((resolve, reject) => {
        if (!isSpeechSupported()) {
            reject(new Error('Speech synthesis not supported'));
            return;
        }

        if (typeof text !== 'string' || text.trim() === '') {
            // An empty utterance never fires `end` in some engines, which would wedge the
            // caller's queue on an item that can never finish.
            reject(new Error('Nothing to speak'));
            return;
        }

        const settings = config || {};

        // Cancel any ongoing speech to prevent queue buildup
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        if (settings.voiceUri) {
            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = Array.isArray(voices)
                ? voices.find(v => v.voiceURI === settings.voiceUri)
                : undefined;
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        utterance.lang = settings.language || 'en-US';
        utterance.rate = clampToRange(settings.rate, RATE_RANGE);
        utterance.pitch = clampToRange(settings.pitch, PITCH_RANGE);
        utterance.volume = clampToRange(settings.volume, VOLUME_RANGE);

        utterance.onend = () => resolve();
        utterance.onerror = (event) => reject(new Error(`Speech error: ${event.error}`));

        window.speechSynthesis.speak(utterance);
    });
};

/**
 * Stops any ongoing speech synthesis.
 */
export const stopSpeech = () => {
    if (isSpeechSupported()) {
        window.speechSynthesis.cancel();
    }
};
