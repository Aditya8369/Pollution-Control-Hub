import React, { useState, useEffect } from 'react';
import { triggerBroadcast, fetchRecentCampaigns, fetchCampaignAnalytics } from '../services/broadcastService';

/**
 * @component AlertBroadcastManager
 * @description Administrative UI for composing broadcast messages, selecting target demographics, and viewing delivery analytics.
 */
const AlertBroadcastManager = () => {
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [newCampaign, setNewCampaign] = useState({
        title: '',
        message: '',
        channels: ['EMAIL'],
        targetDemographic: 'ALL_USERS',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [analytics, setAnalytics] = useState(null);

    useEffect(() => {
        loadCampaigns();
        const interval = setInterval(loadCampaigns, 15000); // Poll every 15s
        return () => clearInterval(interval);
    }, []);

    const loadCampaigns = async () => {
        try {
            const data = await fetchRecentCampaigns();
            setCampaigns(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCampaign = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await triggerBroadcast(newCampaign);
            setNewCampaign({ title: '', message: '', channels: ['EMAIL'], targetDemographic: 'ALL_USERS' });
            await loadCampaigns();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleViewAnalytics = async (campaignId) => {
        try {
            const data = await fetchCampaignAnalytics(campaignId);
            setAnalytics(data);
            setSelectedCampaign(campaignId);
        } catch (err) {
            setError(err.message);
        }
    };

    const handleChannelToggle = (channel) => {
        setNewCampaign(prev => ({
            ...prev,
            channels: prev.channels.includes(channel)
                ? prev.channels.filter(c => c !== channel)
                : [...prev.channels, channel],
        }));
    };

    const getStatusColor = (status) => {
        const colors = {
            DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            SENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            COMPLETED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        };
        return colors[status] || colors.DRAFT;
    };

    if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Multi-Channel Alert Broadcast Manager</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Disseminate critical pollution exceedance warnings via SMS, email, and push notifications.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Campaign Creation Form */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Compose New Broadcast</h3>
                    <form onSubmit={handleCreateCampaign} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                            <input
                                type="text"
                                value={newCampaign.title}
                                onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
                            <textarea
                                value={newCampaign.message}
                                onChange={(e) => setNewCampaign({ ...newCampaign, message: e.target.value })}
                                rows="4"
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Channels</label>
                            <div className="flex gap-4">
                                {['SMS', 'EMAIL', 'PUSH_NOTIFICATION'].map(channel => (
                                    <label key={channel} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newCampaign.channels.includes(channel)}
                                            onChange={() => handleChannelToggle(channel)}
                                            className="rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">{channel.replace('_', ' ')}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Target Demographic</label>
                            <select
                                value={newCampaign.targetDemographic}
                                onChange={(e) => setNewCampaign({ ...newCampaign, targetDemographic: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            >
                                <option value="ALL_USERS">All Registered Users</option>
                                <option value="SENSITIVE_GROUPS">Sensitive Groups (Asthma, Elderly)</option>
                                <option value="HIGH_RISK_ZONES">Users in High-Risk Zones</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting || newCampaign.channels.length === 0}
                            className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? 'Dispatching...' : 'Trigger Broadcast'}
                        </button>
                    </form>
                </div>

                {/* Recent Campaigns & Analytics */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Campaigns</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Title</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Channels</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {campaigns.map((campaign) => (
                                        <tr key={campaign.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{campaign.title}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                                {campaign.channels.map(c => c.replace('_', ' ')).join(', ')}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${getStatusColor(campaign.status)}`}>
                                                    {campaign.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => handleViewAnalytics(campaign.id)}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                                                >
                                                    View Analytics
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Analytics Dashboard */}
                    {analytics && selectedCampaign && (
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Delivery Analytics</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.totalTargets}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Total Targets</div>
                                </div>
                                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-600">{analytics.delivered}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Delivered</div>
                                </div>
                                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-red-600">{analytics.failed}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Failed</div>
                                </div>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-600">{analytics.pending}</div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Pending</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Delivery Breakdown by Channel</h4>
                                {analytics.channelBreakdown.map((channel, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
                                        <span className="font-medium text-gray-900 dark:text-white">{channel.name}</span>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">
                                            {channel.delivered} / {channel.total} ({((channel.delivered / channel.total) * 100).toFixed(1)}%)
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AlertBroadcastManager;
