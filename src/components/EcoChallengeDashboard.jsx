import React, { useState, useEffect, useCallback } from 'react';
import { fetchActiveChallenges, joinChallenge, claimChallengeReward } from '../services/challengeService';

/**
 * How far along a challenge is, as a percentage of its bar.
 *
 * `Math.min(x, 100)` capped the top and nothing guarded the bottom or the divisor. A
 * `targetValue` of 0 gives Infinity — or NaN when progress is 0 too — and `width:
 * "NaN%"` is dropped by the browser, so the bar silently disappeared rather than
 * showing an obviously wrong value. A missing or negative `progress` did the same.
 *
 * @param {unknown} progress - Units completed.
 * @param {unknown} targetValue - Units required.
 * @returns {number} A percentage in [0, 100].
 */
export function progressPercent(progress, targetValue) {
    const done = Number(progress);
    const target = Number(targetValue);
    if (!Number.isFinite(done) || !Number.isFinite(target) || target <= 0) return 0;
    if (done <= 0) return 0;
    return Math.min((done / target) * 100, 100);
}

/**
 * A progress count for display, without printing `undefined` next to the target.
 *
 * @param {unknown} value
 * @returns {number}
 */
export function progressCount(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 0;
}

/**
 * Pulls the challenge list out of a response without assuming its shape.
 *
 * `data?.challenges.map(...)` stopped its optional chain at `data`, so a response of
 * `{}` — a shape nothing in `fetchActiveChallenges` rules out, since it returns
 * `response.json()` unchecked — was `undefined.map` and threw during render.
 *
 * @param {unknown} data
 * @returns {{challenges: any[], userProgress: Record<string, any>, totalPointsEarned: number}}
 */
export function readChallengeData(data) {
    return {
        challenges: Array.isArray(data?.challenges) ? data.challenges : [],
        userProgress: (data?.userProgress && typeof data.userProgress === 'object') ? data.userProgress : {},
        totalPointsEarned: Number.isFinite(Number(data?.totalPointsEarned)) ? Number(data.totalPointsEarned) : 0,
    };
}

/**
 * @component EcoChallengeDashboard
 * @description Interactive UI displaying active challenges, progress bars, and join/claim actions.
 */
const EcoChallengeDashboard = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [actionError, setActionError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);

    const loadData = useCallback(async ({ showSpinner = true } = {}) => {
        if (showSpinner) setLoading(true);
        try {
            const result = await fetchActiveChallenges();
            setData(result);
            // Without this the flag latched: handleJoin and handleClaim both re-fetch on
            // success, but a successful load behind an uncleared error just populated
            // `data` under an error screen nobody could dismiss.
            setError(null);
        } catch (err) {
            setError(err?.message || 'Could not load challenges.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleJoin = async (challengeId) => {
        setActionLoading(challengeId);
        setActionError(null);
        try {
            await joinChallenge(challengeId);
            await loadData({ showSpinner: false });
        } catch (err) {
            setActionError(err?.message || 'Could not join that challenge.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleClaim = async (challengeId) => {
        setActionLoading(challengeId);
        setActionError(null);
        try {
            const result = await claimChallengeReward(challengeId);
            const points = progressCount(result?.pointsAwarded);
            setNotice(`🎉 Reward claimed — you earned ${points} points.`);
            await loadData({ showSpinner: false });
        } catch (err) {
            setActionError(err?.message || 'Could not claim that reward.');
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
            <div className="flex items-center justify-center min-h-[400px]" data-testid="challenges-loading">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    // A failure with nothing behind it is the page; a failure with challenges already
    // on screen is a banner over them. Either way there is a way back, which the
    // latched error state did not offer.
    if (error && !data) {
        return (
            <div
                className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300"
                data-testid="challenges-error"
            >
                <p className="mb-4">{error}</p>
                <button
                    onClick={() => loadData()}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors"
                >
                    Try again
                </button>
            </div>
        );
    }

    const { challenges, userProgress, totalPointsEarned } = readChallengeData(data);

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            {/* Header Stats */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-8 text-white shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Eco-Challenges</h2>
                        <p className="text-green-100 text-lg">Complete challenges to earn points and unlock community badges.</p>
                    </div>
                    <div className="bg-white/20 backdrop-blur-sm rounded-xl p-6 text-center min-w-[200px]">
                        <div className="text-sm text-green-100 uppercase tracking-wide font-semibold">Total Points</div>
                        <div className="text-4xl font-bold mt-1" data-testid="total-points">{totalPointsEarned}</div>
                    </div>
                </div>
            </div>

            {error && (
                <div
                    role="alert"
                    data-testid="challenges-error-banner"
                    className="flex items-center justify-between gap-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm"
                >
                    <span>{error} Showing the challenges from the last successful load.</span>
                    <button onClick={() => loadData()} className="font-semibold underline whitespace-nowrap">Retry</button>
                </div>
            )}

            {actionError && (
                <div
                    role="alert"
                    data-testid="challenges-action-error"
                    className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-300 text-sm"
                >
                    {actionError}
                </div>
            )}

            {notice && (
                <div
                    role="status"
                    data-testid="challenges-notice"
                    className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-green-800 dark:text-green-300 text-sm"
                >
                    {notice}
                </div>
            )}

            {/* Challenges Grid */}
            <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Active Challenges</h3>
                {challenges.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400" data-testid="challenges-empty">
                        No challenges are running right now. Check back soon.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {challenges.map((challenge) => {
                            const progress = userProgress[challenge.id];
                            const isJoined = !!progress;
                            const isCompleted = progress?.isCompleted;
                            const isClaimed = progress?.rewardClaimed;
                            const percent = isJoined ? progressPercent(progress.progress, challenge.targetValue) : 0;

                            return (
                                <div key={challenge.id} data-testid={`challenge-${challenge.id}`} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
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
                                                    <span className="font-bold text-gray-900 dark:text-white" data-testid={`progress-label-${challenge.id}`}>
                                                        {progressCount(progress.progress)} / {challenge.targetValue} {challenge.unit}
                                                    </span>
                                                </div>
                                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        data-testid={`progress-bar-${challenge.id}`}
                                                        className={`h-3 rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-blue-500'
                                                            }`}
                                                        style={{ width: `${percent}%` }}
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
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default EcoChallengeDashboard;
