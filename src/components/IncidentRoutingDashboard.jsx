import React, { useState, useEffect } from 'react';
import { fetchRoutedIncidents, updateIncidentStatus } from '../services/incidentRoutingService';

/**
 * @component IncidentRoutingDashboard
 * @description Administrative UI for viewing routed incidents, updating verification status, and adding official notes.
 */
const IncidentRoutingDashboard = () => {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [noteModal, setNoteModal] = useState({ open: false, incidentId: null, status: '', notes: '' });
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        loadIncidents();
    }, [filterStatus]);

    const loadIncidents = async () => {
        setLoading(true);
        try {
            const data = await fetchRoutedIncidents(filterStatus === 'ALL' ? undefined : filterStatus);
            setIncidents(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async () => {
        if (!noteModal.incidentId || !noteModal.status) return;

        setActionLoading(true);
        try {
            await updateIncidentStatus(noteModal.incidentId, noteModal.status, noteModal.notes);
            setNoteModal({ open: false, incidentId: null, status: '', notes: '' });
            await loadIncidents();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(false);
        }
    };

    const getStatusColor = (status) => {
        const colors = {
            PENDING: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
            ROUTED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
            VERIFIED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            DISPATCHED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
            RESOLVED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        };
        return colors[status] || colors.PENDING;
    };

    const getSeverityColor = (severity) => {
        const colors = {
            LOW: 'text-green-600 dark:text-green-400',
            MODERATE: 'text-yellow-600 dark:text-yellow-400',
            HIGH: 'text-orange-600 dark:text-orange-400',
            CRITICAL: 'text-red-600 dark:text-red-400',
        };
        return colors[severity] || 'text-gray-600';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                {error}
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Incident Verification & Routing</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Review, verify, and update the lifecycle status of community-reported pollution incidents.
                    </p>
                </div>

                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                >
                    <option value="ALL">All Statuses</option>
                    <option value="ROUTED">Routed</option>
                    <option value="VERIFIED">Verified</option>
                    <option value="DISPATCHED">Dispatched</option>
                    <option value="RESOLVED">Resolved</option>
                </select>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Severity</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Department</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {incidents.length > 0 ? (
                                incidents.map((incident) => (
                                    <tr key={incident.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                            {new Date(incident.reportedAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {incident.category.replace('_', ' ')}
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 font-normal">
                                                {incident.routingConfidence}% confidence
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold {getSeverityColor(incident.severity)}">
                                            {incident.severity}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={incident.description}>
                                            {incident.description}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                            {incident.assignedDepartment || 'Unassigned'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(incident.status)}`}>
                                                {incident.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {incident.status !== 'RESOLVED' && (
                                                <button
                                                    onClick={() => setNoteModal({
                                                        open: true,
                                                        incidentId: incident.id,
                                                        status: incident.status === 'ROUTED' ? 'VERIFIED' :
                                                            incident.status === 'VERIFIED' ? 'DISPATCHED' : 'RESOLVED',
                                                        notes: incident.verificationNotes || ''
                                                    })}
                                                    className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                                                >
                                                    Update
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No incidents found matching the current filter.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Update Status Modal */}
            {noteModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 border border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Update Incident Status</h3>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Status</label>
                            <select
                                value={noteModal.status}
                                onChange={(e) => setNoteModal({ ...noteModal, status: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            >
                                <option value="VERIFIED">Verified</option>
                                <option value="DISPATCHED">Dispatched</option>
                                <option value="RESOLVED">Resolved</option>
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verification Notes</label>
                            <textarea
                                value={noteModal.notes}
                                onChange={(e) => setNoteModal({ ...noteModal, notes: e.target.value })}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                rows="4"
                                placeholder="Add details about verification, actions taken, or resolution..."
                            />
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setNoteModal({ open: false, incidentId: null, status: '', notes: '' })}
                                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                disabled={actionLoading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleStatusUpdate}
                                disabled={actionLoading}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors disabled:opacity-50"
                            >
                                {actionLoading ? 'Saving...' : 'Save Update'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default IncidentRoutingDashboard;
