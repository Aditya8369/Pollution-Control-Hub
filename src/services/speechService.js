/**
 * @fileoverview Service layer wrapping the Web Speech API for text-to-speech alert generation.
 */

/**
 * Checks if the browser supports the Web Speech API.
 * @returns {boolean}
 */
export const isSpeechSupported = () => {
    return 'speechSynthesis' in window;
};

/**
 * Fetches available voices from the browser.
 * @returns {Promise<SpeechSynthesisVoice[]>}
 */
export const getAvailableVoices = () => {
    return new Promise((resolve) => {
        if (!isSpeechSupported()) {
            resolve([]);
            return;
        }

        let voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            resolve(voices);
        } else {
            // Wait for voices to be loaded
            window.speechSynthesis.onvoiceschanged = () => {
                voices = window.speechSynthesis.getVoices();
                resolve(voices);
            };
        }
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

        // Cancel any ongoing speech to prevent queue buildup
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        if (config.voiceUri) {
            const voices = window.speechSynthesis.getVoices();
            const selectedVoice = voices.find(v => v.voiceURI === config.voiceUri);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        utterance.lang = config.language || 'en-US';
        utterance.rate = config.rate || 1;
        utterance.pitch = config.pitch || 1;
        utterance.volume = config.volume !== undefined ? config.volume : 1;

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
