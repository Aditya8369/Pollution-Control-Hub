/**
 * @fileoverview Type definitions for Multi-Modal Voice-Guided Pollution Alerts and Accessibility Suite
 */

export interface VoiceAlertPayload {
    id: string;
    message: string;
    priority: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
    location?: string;
    aqiValue?: number;
    timestamp: string;
}

export interface VoiceConfiguration {
    isEnabled: boolean;
    language: string;
    voiceUri: string | null;
    rate: number; // 0.1 to 10
    pitch: number; // 0 to 2
    volume: number; // 0 to 1
}

export interface UserAccessibilityPreferences {
    userId: string;
    voiceConfig: VoiceConfiguration;
    aqiAlertThreshold: number;
    customThresholdOverrides?: Record<string, number>; // e.g., { 'PM25': 50 }
    updatedAt: string;
}
