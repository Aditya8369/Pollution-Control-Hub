/**
 * @fileoverview Type definitions for Multi-Channel Real-Time Pollution Alert Broadcasting
 */

export type BroadcastChannel = 'SMS' | 'EMAIL' | 'PUSH_NOTIFICATION';
export type DeliveryStatus = 'PENDING' | 'SENT' | 'FAILED' | 'DELIVERED';

export interface BroadcastCampaign {
    id: string;
    title: string;
    message: string;
    channels: BroadcastChannel[];
    targetDemographic: string;
    status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'COMPLETED';
    createdAt: string;
    sentAt?: string;
}

export interface SubscriberPreference {
    userId: string;
    email: string;
    phone?: string;
    optedInChannels: BroadcastChannel[];
    aqiThreshold: number;
}

export interface DeliveryLog {
    id: string;
    campaignId: string;
    userId: string;
    channel: BroadcastChannel;
    status: DeliveryStatus;
    attemptCount: number;
    lastAttemptAt: string;
    errorMessage?: string;
}
