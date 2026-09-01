import { useState, useEffect, useCallback, useRef } from 'react';
import { isSpeechSupported, getAvailableVoices, speakText, stopSpeech } from '../services/speechService';

/**
 * Alert priorities, most urgent first.
 *
 * The order of this array *is* the ordering rule — `priorityRank` is derived from it, so
 * adding a level is a one-line change rather than a second table to keep in sync.
 */
export const ALERT_PRIORITIES = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];

/** Anything unrecognised sorts after every known level rather than jumping the queue. */
const UNKNOWN_PRIORITY_RANK = ALERT_PRIORITIES.length;

/**
 * Where an alert sits in the ordering. Lower is more urgent.
 *
 * @param {unknown} priority
 * @returns {number}
 */
export function priorityRank(priority) {
    if (typeof priority !== 'string') return UNKNOWN_PRIORITY_RANK;
    const index = ALERT_PRIORITIES.indexOf(priority.toUpperCase());
    return index === -1 ? UNKNOWN_PRIORITY_RANK : index;
}

/**
 * Places `alert` in the queue by priority, keeping arrival order within a priority.
 *
 * `addToQueue` used to be a plain `[...prev, alert]` append, so a CRITICAL pollution alert
 * waited behind however many routine messages were already queued — the wrong end of the
 * queue for a feature meant to be listened to rather than watched.
 *
 * The item at index 0 is skipped while `isSpeaking` is true: it is mid-utterance, and
 * moving it would leave the row the panel marks "PLAYING" pointing at the wrong alert.
 * Interrupting speech that is already underway is `clearQueue`'s job, not an insert's.
 *
 * @template {{priority?: string}} T
 * @param {T[]} queue - The current queue.
 * @param {T} alert - The alert to place.
 * @param {boolean} [isSpeaking=false] - Whether the head of the queue is being spoken.
 * @returns {T[]} A new queue.
 */
export function insertByPriority(queue, alert, isSpeaking = false) {
    const rank = priorityRank(alert?.priority);
    const firstMovable = isSpeaking && queue.length > 0 ? 1 : 0;

    let insertAt = queue.length;
    for (let i = firstMovable; i < queue.length; i++) {
        if (priorityRank(queue[i]?.priority) > rank) {
            insertAt = i;
            break;
        }
    }

    return [...queue.slice(0, insertAt), alert, ...queue.slice(insertAt)];
}

/**
 * @hook useVoiceSynthesis
 * @description Custom React hook managing the speech queue, language voice selection, and playback state.
 *
 * Returns the queue itself as well as its length. `VoiceAlertManager` renders the pending
 * list with `queue.map(...)` and the hook only ever exposed `queueLength`, so the panel
 * threw `ReferenceError: queue is not defined` the first time anything was queued — the
 * `no-undef` ESLint has been reporting on that file. See #1136.
 */
export const useVoiceSynthesis = (initialConfig) => {
    const [isSupported, setIsSupported] = useState(false);
    const [voices, setVoices] = useState([]);
    const [config, setConfig] = useState(initialConfig);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [queue, setQueue] = useState([]);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        let cancelled = false;
        const supported = isSpeechSupported();
        setIsSupported(supported);
        if (!supported) return undefined;

        // Guarded because the voice list arrives asynchronously and can outlive the mount.
        getAvailableVoices().then((available) => {
            if (!cancelled) setVoices(available);
        });

        return () => {
            cancelled = true;
        };
    }, []);

    const processQueue = useCallback(async () => {
        if (queue.length === 0 || isProcessingRef.current) return;

        isProcessingRef.current = true;
        const currentAlert = queue[0];

        try {
            setIsSpeaking(true);
            await speakText(currentAlert.message, config);
        } catch (error) {
            console.error('Voice synthesis error:', error);
        } finally {
            setIsSpeaking(false);
            setQueue(prev => prev.slice(1)); // Remove processed item
            isProcessingRef.current = false;
        }
    }, [queue, config]);

    // `processQueue` belongs in the dependency list: it closes over `queue` and `config`,
    // and leaving it out was the exhaustive-deps warning on this file. Including it means
    // a config change mid-queue re-evaluates against the new config instead of the one
    // captured when the queue last changed; `isProcessingRef` stops that re-entering an
    // utterance already in flight.
    useEffect(() => {
        if (queue.length > 0 && !isProcessingRef.current && config.isEnabled) {
            processQueue();
        }
    }, [queue, config.isEnabled, processQueue]);

    // Turning alerts off should stop the one being spoken, not just decline to start the
    // next. Otherwise the toggle appears to do nothing until the current message ends.
    useEffect(() => {
        if (!config.isEnabled && isProcessingRef.current) {
            stopSpeech();
        }
    }, [config.isEnabled]);

    const addToQueue = useCallback((alert) => {
        if (!alert || typeof alert.message !== 'string' || alert.message.trim() === '') return;
        setQueue(prev => insertByPriority(prev, alert, isProcessingRef.current));
    }, []);

    const clearQueue = useCallback(() => {
        stopSpeech();
        setQueue([]);
        isProcessingRef.current = false;
        setIsSpeaking(false);
    }, []);

    const updateConfig = useCallback((newConfig) => {
        setConfig(prev => ({ ...prev, ...newConfig }));
    }, []);

    return {
        isSupported,
        voices,
        config,
        isSpeaking,
        queue,
        queueLength: queue.length,
        addToQueue,
        clearQueue,
        updateConfig,
    };
};
