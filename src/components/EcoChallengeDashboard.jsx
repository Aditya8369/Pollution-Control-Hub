import React, { useState, useEffect } from 'react';
import { useTenant } from '../context/TenantContext';
import { createTenantChallenge, deleteTenantChallenge } from '../services/tenantService';
import { fetchActiveChallenges, joinChallenge, claimChallengeReward } from '../services/challengeService';

/**
 * @component EcoChallengeDashboard
 * @description Interactive UI displaying active challenges, progress bars, and join/claim actions.
 */
const EcoChallengeDashboard = () => {
    const { tenantId, tenantName, currentTenant } = useTenant();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [showCreateChallenge, setShowCreateChallenge] = useState(false);
    const [challengeForm, setChallengeForm] = useState({
        title: '',
        description: '',
        category: 'REPORTING',
        targetValue: 10,
        unit: 'actions',
        rewardValue: 50,
        verificationType: 'manual',
        isGlobal: false,
    });

    useEffect(() => {
        loadData();
    }, [tenantId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await fetchActiveChallenges();
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleJoin = async (challengeId) => {
        setActionLoading(challengeId);
        try {
            await joinChallenge(challengeId);
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
            const result = await claimChallengeReward(challengeId);
            alert(`🎉 Congratulations! You earned ${result.pointsAwarded} points!`);
            await loadData();
        } catch (err) {
            alert(err.message);
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateChallenge = async (event) => {
        event.preventDefault();
        if (!currentTenant && tenantId === 'default') {
            alert('Select an organization before creating an organization-exclusive challenge.');
            return;
        }

        const tenantKey = currentTenant?.id || tenantId;
        if (!tenantKey || tenantKey === 'default') {
            alert('Tenant ID is required to create an organization challenge.');
            return;
        }

        try {
            await createTenantChallenge(tenantKey, challengeForm);
            setShowCreateChallenge(false);
            setChallengeForm({
                title: '',
                description: '',
                category: 'REPORTING',
                targetValue: 10,
                unit: 'actions',
                rewardValue: 50,
                verificationType: 'manual',
                isGlobal: false,
            });
            await loadData();
        } catch (err) {
            alert(err.message || 'Failed to create custom challenge');
        }
    };

    const handleDeleteChallenge = async (challengeId) => {
        if (!currentTenant && tenantId === 'default') {
            return;
        }
        try {
            const tenantKey = currentTenant?.id || tenantId;
            await deleteTenantChallenge(tenantKey, challengeId);
            await loadData();
        } catch (err) {
            alert(err.message || 'Failed to delete custom challenge');
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

            {tenantId && tenantId !== 'default' && (
                <div className="flex justify-between items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
                    <span>{tenantName} — Organization view</span>
                    <button
                        type="button"
                        onClick={() => setShowCreateChallenge(true)}
                        className="rounded-lg bg-emerald-600 px-3 py-2 font-semibold text-white hover:bg-emerald-700"
                    >
                        Create Organization Challenge
                    </button>
                </div>
            )}

            {showCreateChallenge && (
                <form onSubmit={handleCreateChallenge} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                    <h3 className="mb-4 text-lg font-bold text-gray-900 dark:text-white">Create Organization Challenge</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            <span className="mb-1 block">Challenge title</span>
                            <input value={challengeForm.title} onChange={(e) => setChallengeForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Challenge title" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700" required />
                        </label>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            <span className="mb-1 block">Category</span>
                            <input value={challengeForm.category} onChange={(e) => setChallengeForm((prev) => ({ ...prev, category: e.target.value }))} placeholder="Category" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700" required />
                        </label>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            <span className="mb-1 block">Target value</span>
                            <input value={challengeForm.targetValue} type="number" onChange={(e) => setChallengeForm((prev) => ({ ...prev, targetValue: Number(e.target.value) || 0 }))} placeholder="Target value" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700" required />
                        </label>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            <span className="mb-1 block">Unit</span>
                            <input value={challengeForm.unit} onChange={(e) => setChallengeForm((prev) => ({ ...prev, unit: e.target.value }))} placeholder="Unit" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700" />
                        </label>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            <span className="mb-1 block">Reward points</span>
                            <input value={challengeForm.rewardValue} type="number" onChange={(e) => setChallengeForm((prev) => ({ ...prev, rewardValue: Number(e.target.value) || 0 }))} placeholder="Reward points" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700" required />
                        </label>
                        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            <span className="mb-1 block">Verification type</span>
                            <input value={challengeForm.verificationType} onChange={(e) => setChallengeForm((prev) => ({ ...prev, verificationType: e.target.value }))} placeholder="Verification type" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700" />
                        </label>
                    </div>
                    <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-200">
                        <span className="mb-1 block">Challenge description</span>
                        <textarea value={challengeForm.description} onChange={(e) => setChallengeForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Challenge description" className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-700" required rows="3" />
                    </label>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                            <input type="checkbox" checked={challengeForm.isGlobal} onChange={(e) => setChallengeForm((prev) => ({ ...prev, isGlobal: e.target.checked }))} aria-label="Mark this as a global challenge" />
                            Global challenge
                        </label>
                        <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">Save Challenge</button>
                        <button type="button" onClick={() => setShowCreateChallenge(false)} className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100">Cancel</button>
                    </div>
                </form>
            )}

            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Active Challenges</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data?.challenges.map((challenge) => {
                        const progress = data.userProgress[challenge.id];
                        const isJoined = !!progress;
                        const isCompleted = progress?.isCompleted;
                        const isClaimed = progress?.rewardClaimed;
                        const isOrganizationExclusive = challenge.isOrganizationExclusive || challenge.tenant_id || challenge.is_global === false;
                        const progressPercent = isJoined ? Math.min((progress.progress / challenge.targetValue) * 100, 100) : 0;

                        return (
                            <div key={challenge.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
                                <div className="p-6 flex-1">
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-3xl">{getCategoryIcon(challenge.category)}</span>
                                        <div className="flex flex-col gap-2 items-end">
                                            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-bold rounded-full uppercase">
                                                {challenge.frequency}
                                            </span>
                                            {isOrganizationExclusive && (
                                                <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase rounded-full">
                                                    Organization Exclusive
                                                </span>
                                            )}
                                        </div>
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
                                                </p>
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
                                    {isOrganizationExclusive && tenantId && tenantId !== 'default' && (
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteChallenge(challenge.id)}
                                            className="mt-3 w-full rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-950/30 dark:text-red-200"
                                        >
                                            Delete custom challenge
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
