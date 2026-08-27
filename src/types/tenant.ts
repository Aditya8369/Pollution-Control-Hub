/**
 * @fileoverview Type definitions for Multi-Tenant Workspace Management
 */

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    description?: string;
    settings: TenantSettings;
    createdAt: string;
    updatedAt: string;
}

export interface TenantSettings {
    theme?: 'light' | 'dark';
    defaultView?: 'dashboard' | 'map';
    notificationPreferences?: {
        email: boolean;
        push: boolean;
    };
}

export interface TenantMember {
    id: string;
    tenantId: string;
    userId: string;
    userName: string;
    userEmail: string;
    role: 'ADMIN' | 'MANAGER' | 'MEMBER';
    joinedAt: string;
}

export interface TenantContextType {
    currentTenant: Tenant | null;
    tenants: Tenant[];
    isLoading: boolean;
    error: string | null;
    switchTenant: (tenantId: string) => Promise<void>;
    fetchTenants: () => Promise<void>;
    updateTenantSettings: (settings: Partial<TenantSettings>) => Promise<void>;
}
