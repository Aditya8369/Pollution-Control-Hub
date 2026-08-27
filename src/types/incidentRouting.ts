/**
 * @fileoverview Type definitions for Automated Pollution Incident Verification and Routing
 */

export type IncidentCategory = 'INDUSTRIAL_EMISSION' | 'VEHICULAR_CONGESTION' | 'WASTE_BURNING' | 'CONSTRUCTION_DUST' | 'OTHER';
export type IncidentStatus = 'PENDING' | 'ROUTED' | 'VERIFIED' | 'DISPATCHED' | 'RESOLVED';
export type IncidentSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface IncidentReport {
    id: string;
    reportedBy: string;
    description: string;
    location: {
        lat: number;
        lng: number;
        address?: string;
    };
    imageUrl?: string;
    reportedAt: string;
}

export interface RoutedIncident extends IncidentReport {
    category: IncidentCategory;
    status: IncidentStatus;
    severity: IncidentSeverity;
    routingConfidence: number;
    assignedDepartment?: string;
    verificationNotes?: string;
    verifiedBy?: string;
    verifiedAt?: string;
}

export interface RoutingRule {
    keywords: string[];
    category: IncidentCategory;
    defaultSeverity: IncidentSeverity;
}
