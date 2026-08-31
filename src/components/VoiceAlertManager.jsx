import React, { useState, useEffect } from 'react';
import { useVoiceSynthesis } from '../hooks/useVoiceSynthesis';

/**
 * @component VoiceAlertManager
 * @description UI for configuring voice alert thresholds, language selection, voice preference, and testing speech synthesis.
 */
const VoiceAlertManager = () => {
    const defaultConfig = {
        isEnabled: true,
        language: 'en-US',
        voiceUri: null,
        rate: 1,
        pitch: 1,
        volume: 1,
    };

    const {
        isSupported,
        voices,
        config,
        isSpeaking,
        queueLength,
        queue = [],
        addToQueue,
        clearQueue,
        updateConfig,
    } = useVoiceSynthesis(defaultConfig);

    const [aqiThreshold, setAqiThreshold] = useState(100);
    const [testMessage, setTestMessage] = useState('Air quality alert: PM2.5 levels are currently moderate.');

    useEffect(() => {
        // In a real app, fetch user preferences from backend here
        // and update config/aqiThreshold accordingly
    }, []);

    const handleTestVoice = () => {
        addToQueue({
            id: `test_${Date.now()}`,
            message: testMessage,
            priority: 'MODERATE',
            timestamp: new Date().toISOString(),
        });
    };

    const handleSimulateAlert = () => {
        addToQueue({
            id: `alert_${Date.now()}`,
            message: `Critical pollution alert. AQI has exceeded ${aqiThreshold} in your area. Please limit outdoor activities.`,
            priority: 'CRITICAL',
            aqiValue: aqiThreshold + 20,
            timestamp: new Date().toISOString(),
        });
    };

    if (!isSupported) {
        return (
            <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-800 dark:text-yellow-200">
                <p className="font-semibold">Voice Features Unavailable</p>
                <p className="text-sm mt-1">Your browser does not support the Web Speech API. Please use a modern browser like Chrome, Edge, or Safari.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Voice-Guided Accessibility Suite</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Configure real-time, voice-guided pollution alerts to enhance hands-free awareness and accessibility.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Configuration Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                        Voice Configuration
                    </h3>

                    <div className="flex items-center justify-between">
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Enable Voice Alerts</span>
                        <button
                            onClick={() => updateConfig({ isEnabled: !config.isEnabled })}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.isEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${config.isEnabled ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Voice</label>
                        <select
                            value={config.voiceUri || ''}
                            onChange={(e) => updateConfig({ voiceUri: e.target.value || null })}
                            disabled={!config.isEnabled}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white disabled:opacity-50"
                        >
                            <option value="">Default System Voice</option>
                            {voices.map((voice) => (
                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                    {voice.name} ({voice.lang})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Speed: {config.rate}x
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={config.rate}
                                onChange={(e) => updateConfig({ rate: parseFloat(e.target.value) })}
                                disabled={!config.isEnabled}
                                className="w-full accent-blue-600 disabled:opacity-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Pitch: {config.pitch}
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={config.pitch}
                                onChange={(e) => updateConfig({ pitch: parseFloat(e.target.value) })}
                                disabled={!config.isEnabled}
                                className="w-full accent-blue-600 disabled:opacity-50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            AQI Alert Threshold: {aqiThreshold}
                        </label>
                        <input
                            type="range"
                            min="50"
                            max="300"
                            step="10"
                            value={aqiThreshold}
                            onChange={(e) => setAqiThreshold(parseInt(e.target.value))}
                            className="w-full accent-red-600"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Alerts will trigger when local AQI exceeds this value.
                        </p>
                    </div>
                </div>

                {/* Testing & Queue Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                        Testing & Queue
                    </h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Test Message</label>
                        <textarea
                            value={testMessage}
                            onChange={(e) => setTestMessage(e.target.value)}
                            rows="3"
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleTestVoice}
                            disabled={!config.isEnabled || isSpeaking}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSpeaking ? 'Speaking...' : 'Test Voice'}
                        </button>
                        <button
                            onClick={clearQueue}
                            disabled={queueLength === 0}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Clear Queue
                        </button>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Alert Queue</span>
                            <span className="text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full">
                                {queueLength} pending
                            </span>
                        </div>

                        {queueLength === 0 ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Queue is empty.</p>
                        ) : (
                            <ul className="space-y-2 max-h-40 overflow-y-auto">
                                {queue.map((item, idx) => (
                                    <li key={item.id} className="text-sm p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                        <div className="flex justify-between">
                                            <span className="font-medium text-gray-900 dark:text-white truncate">{item.message}</span>
                                            {idx === 0 && isSpeaking && (
                                                <span className="text-xs text-blue-600 dark:text-blue-400 font-bold animate-pulse">PLAYING</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Priority: {item.priority}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={handleSimulateAlert}
                            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                        >
                            Simulate Critical AQI Alert
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoiceAlertManager;
