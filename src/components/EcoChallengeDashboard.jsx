import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { buildChallengeScopeQuery } from '../services/tenantService';

/**
 * @component EcoChallengeDashboard
 * @description Interactive UI displaying active challenges, progress bars, and join/claim actions.
 */
const EcoChallengeDashboard = () => {
    const { tenantId, teamId, setTeam, clearTeam } = useTenant();
    const [scope, setScope] = useState('global');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    useEffect(() => {
        if (scope === 'tenant' && (!tenantId || tenantId === 'default')) {
            setScope('global');
        }
        if (scope === 'team' && (!tenantId || tenantId === 'default' || !teamId)) {
            setScope('tenant');
        }
    }, [scope, tenantId, teamId]);

    useEffect(() => {
        loadData();
    }, [scope, tenantId, teamId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const query = buildChallengeScopeQuery(scope, tenantId, teamId);
            const response = await fetch(`/api/challenges/active?${query}`);
            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                throw new Error(errorPayload.message || 'Failed to fetch active challenges.');
            }
            const result = await response.json();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const activeTenantId = scope === 'global' ? null : tenantId && tenantId !== 'default' ? tenantId : null;
    const activeTeamId = scope === 'team' ? teamId : null;

    const handleJoin = async (challengeId) => {
        setActionLoading(challengeId);
        try {
            const response = await fetch(`/api/challenges/${encodeURIComponent(challengeId)}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: activeTenantId, team_id: activeTeamId }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.message || 'Failed to join challenge.');
            }
            await loadData();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleClaim = async (challengeId) => {
        setActionLoading(challengeId);
        try {
            const response = await fetch(`/api/challenges/${encodeURIComponent(challengeId)}/claim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: activeTenantId, team_id: activeTeamId }),
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(payload.message || 'Failed to claim reward.');
            }
            alert(`🎉 Congratulations! You earned ${payload.pointsAwarded || 0} points!`);
            await loadData();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const getCategoryIcon = (category) => {
        const icons = {
            REPORTING: '📝',
            TRANSIT: '🚌',
            CONSERVATION: '💧',
            EDUCATION: '📚',
        };
        return icons[category] || '🌍';
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
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
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Eco-Challenges</h2>
                        <p className="text-green-100 text-lg">Complete challenges to earn points and unlock community badges.</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center min-w-[200px]">
                        <div className="text-sm text-green-100 uppercase tracking-wide font-semibold">Total Points</div>
                        <div className="text-4xl font-bold mt-1">{data?.totalPointsEarned || 0}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                    {['global', 'tenant', 'team'].map((option) => {
                        const isActive = scope === option;
                        const label = option === 'global' ? 'Global' : option === 'tenant' ? 'Organization' : 'Team';
                        const disabled = option === 'tenant' && (!tenantId || tenantId === 'default');
                        const teamDisabled = option === 'team' && (!tenantId || tenantId === 'default' || !teamId);

                        return (
                            <button
                                key={option}
                                type="button"
                                onClick={() => {
                                    if (option === 'team') {
                                        if (!teamId) {
                                            setTeam('team_operations');
                                        }
                                    }
                                    setScope(option);
                                }}
                                disabled={disabled || teamDisabled}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                                    isActive
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                                } ${disabled || teamDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {label}
                            </button>
                        );
                    })}
                    {scope === 'team' && teamId && (
                        <button
                            type="button"
                            onClick={() => clearTeam()}
                            className="px-3 py-2 rounded-lg text-xs bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200"
                        >
                            Reset team
                        </button>
                    )}
                </div>
                <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
                    {scope === 'global' && 'Individual impact across all communities.'}
                    {scope === 'tenant' && `Organization view for ${tenantId || 'default'}.`}
                    {scope === 'team' && `Team view for team ${teamId || 'operations'}.`}
                </div>
            </div>

            {/* Challenges Grid */}
            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Active Challenges</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data?.challenges.map((challenge) => {
                        const progress = data.userProgress[challenge.id];
                        const isJoined = !!progress;
                        const isCompleted = progress?.isCompleted;
                        const isClaimed = progress?.rewardClaimed;
                        const progressPercent = isJoined ? Math.min((progress.progress / challenge.targetValue) * 100, 100) : 0;

                        return (
                            <div key={challenge.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-3xl">{getCategoryIcon(challenge.category)}</span>
                                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-bold rounded-full uppercase">
                                            {challenge.frequency}
                                        </span>
                                    </div>

                                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{challenge.title}</h4>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 line-clamp-2">{challenge.description}</p>

                                    {isJoined ? (
                                        <div className="space-y-3">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600 dark:text-gray-400">Progress</span>
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {progress.progress} / {challenge.targetValue} {challenge.unit}
                                                </span>
                                            </div>
                                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                                <div
                                                    className={`h-3 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                                        }`}
                                                    style={{ width: `${progressPercent}%` }}
                                                ></div>
                                            </div>
                                            {isCompleted && !isClaimed && (
                                                <p className="text-xs text-green-600 dark:text-green-400 font-medium flex items-center gap-1">
                                                    ✅ Challenge Completed! Claim your reward.
                                                    . </p>
                                            )}
                                            {isClaimed && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1">
                                                    🏆 Reward Claimed
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Target: <span className="font-semibold text-gray-900 dark:text-white">{challenge.targetValue} {challenge.unit}</span>
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                Reward: <span className="font-semibold text-yellow-600 dark:text-yellow-400">+{challenge.rewardValue} Points</span>
                                                {challenge.badgeName && ` & "${challenge.badgeName}" Badge`}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                                    {!isJoined ? (
                                        <button
                                            onClick={() => handleJoin(challenge.id)}
                                            disabled={actionLoading === challenge.id}
                                            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {actionLoading === challenge.id ? 'Joining...' : 'Join Challenge'}
                                        </button>
                                    ) : isCompleted && !isClaimed ? (
                                        <button
                                            onClick={() => handleClaim(challenge.id)}
                                            disabled={actionLoading === challenge.id}
                                            className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        >
                                            {actionLoading === challenge.id ? 'Claiming...' : '🎁 Claim Reward'}
                                        </button>
                                    ) : (
                                        <button
                                            disabled
                                            className="w-full py-2.5 bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold rounded-lg cursor-not-allowed"
                                        >
                                            {isClaimed ? 'Completed' : 'In Progress'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default EcoChallengeDashboard;
