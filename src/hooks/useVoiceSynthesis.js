import { useState, useEffect, useCallback, useRef } from 'react';
import { isSpeechSupported, getAvailableVoices, speakText, stopSpeech } from '../services/speechService';

/**
 * @hook useVoiceSynthesis
 * @description Custom React hook managing the speech queue, language voice selection, and playback state.
 */
export const useVoiceSynthesis = (initialConfig) => {
    const [isSupported, setIsSupported] = useState(false);
    const [voices, setVoices] = useState([]);
    const [config, setConfig] = useState(initialConfig);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [queue, setQueue] = useState([]);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        const supported = isSpeechSupported();
        setIsSupported(supported);
        if (supported) {
            getAvailableVoices().then(setVoices);
        }
    }, []);

    useEffect(() => {
        if (queue.length > 0 && !isProcessingRef.current && config.isEnabled) {
            processQueue();
        }
    }, [queue, config.isEnabled]);

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

    const addToQueue = useCallback((alert) => {
        setQueue(prev => [...prev, alert]);
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
        queueLength: queue.length,
        addToQueue,
        clearQueue,
        updateConfig,
    };
};
