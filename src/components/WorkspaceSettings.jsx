import React, { useState } from 'react';
import { useTenant } from '../context/TenantContext';
import { inviteTenantMember, removeTenantMember } from '../services/tenantService';

/**
 * @component WorkspaceSettings
 * @description UI for administrators to configure workspace preferences and invite members.
 */
const WorkspaceSettings = () => {
    const { currentTenant, updateTenantSettings, fetchTenants } = useTenant();
    const [activeTab, setActiveTab] = useState('general');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('MEMBER');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    if (!currentTenant) {
        return <div className="p-6 text-center text-gray-500">No workspace selected.</div>;
    }

    const handleSaveSettings = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await updateTenantSettings({
                defaultView: e.target.defaultView.value,
                notificationPreferences: {
                    email: e.target.emailNotif.checked,
                    push: e.target.pushNotif.checked,
                },
            });
            setMessage({ type: 'success', text: 'Settings saved successfully.' });
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to save settings.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!inviteEmail) return;
        setIsSubmitting(true);
        try {
            await inviteTenantMember(currentTenant.id, inviteEmail, inviteRole);
            setMessage({ type: 'success', text: `Invitation sent to ${inviteEmail}` });
            setInviteEmail('');
            fetchTenants(); // Refresh member list if implemented in backend
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Failed to invite member.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                Workspace Settings: {currentTenant.name}
            </h2>

            {message.text && (
                <div className={`mb-4 p-3 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {message.text}
                </div>
            )}

            <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'general' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('general')}
                >
                    General
                </button>
                <button
                    className={`px-4 py-2 font-medium ${activeTab === 'members' ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
                    onClick={() => setActiveTab('members')}
                >
                    Members & Access
                </button>
            </div>

            {activeTab === 'general' && (
                <form onSubmit={handleSaveSettings} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Default Dashboard View
                        </label>
                        <select
                            name="defaultView"
                            defaultValue={currentTenant.settings?.defaultView || 'dashboard'}
                            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                        >
                            <option value="dashboard">Analytics Dashboard</option>
                            <option value="map">Geospatial Map</option>
                        </select>
                    </div>

                    <div className="space-y-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Notifications</p>
                        <label className="flex items-center space-x-2">
                            <input type="checkbox" name="emailNotif" defaultChecked={currentTenant.settings?.notificationPreferences?.email} className="rounded text-blue-600" />
                            <span className="text-gray-600 dark:text-gray-400">Email alerts for threshold exceedances</span>
                        </label>
                        <label className="flex items-center space-x-2">
                            <input type="checkbox" name="pushNotif" defaultChecked={currentTenant.settings?.notificationPreferences?.push} className="rounded text-blue-600" />
                            <span className="text-gray-600 dark:text-gray-400">Browser push notifications</span>
                        </label>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {isSubmitting ? 'Saving...' : 'Save Settings'}
                    </button>
                </form>
            )}

            {activeTab === 'members' && (
                <div className="space-y-6">
                    <form onSubmit={handleInvite} className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
                            <input
                                type="email"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                placeholder="colleague@organization.com"
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <div className="w-40">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
                            <select
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            >
                                <option value="MEMBER">Member</option>
                                <option value="MANAGER">Manager</option>
                                <option value="ADMIN">Admin</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting || !inviteEmail}
                            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors h-10"
                        >
                            {isSubmitting ? 'Sending...' : 'Invite'}
                        </button>
                    </form>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Current Members</h3>
                        <div className="bg-gray-50 dark:bg-gray-900 rounded-md p-4 text-center text-gray-500">
                            {/* Placeholder for member list mapping */}
                            <p>Member list integration pending backend user directory sync.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkspaceSettings;
