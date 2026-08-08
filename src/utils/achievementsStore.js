import { eventBus } from "../core/events";

export const ACHIEVEMENTS_STORAGE_KEY = "pollution-hub-achievements";
const PERFECT_QUIZZES_KEY = "pollution-hub-perfect-quizzes";
const ROUTES_PLANNED_KEY = "pollution-hub-routes-planned";

export const BADGES = [
    {
        id: "first-report",
        name: "First Report",
        description: "Submit your first community pollution report.",
        icon: "📝",
    },
    {
        id: "streak-master",
        name: "Streak Master",
        description: "Reach a 7-day morning briefing streak.",
        icon: "🔥",
    },
    {
        id: "aqi-expert",
        name: "AQI Expert",
        description: "Score 100% on every quiz in the Quiz Center.",
        icon: "🎓",
    },
    {
        id: "route-explorer",
        name: "Route Explorer",
        description: "Plan 10 clean commute routes.",
        icon: "🗺️",
    },
    {
        id: "mission-commander",
        name: "Mission Commander",
        description: "Complete your first AQI Mission successfully.",
        icon: "🚀",
    },
    {
        id: "smog-slayer",
        name: "Smog Slayer",
        description: "Successfully complete the Hard difficulty AQI Mission (Industrial Zone Crisis).",
        icon: "⚔️",
    },
    {
        id: "hotspot-hunter",
        name: "Hotspot Hunter",
        description: "Complete a Hotspot Scout game with a score of 3 or more.",
        icon: "🔍",
    },
    {
        id: "perfect-scout",
        name: "Perfect Scout",
        description: "Complete a Hotspot Scout game with a perfect score (5/5).",
        icon: "🎯",
    },
    {
        id: "river-explorer",
        name: "River Explorer",
        description: "Complete the River Origin Challenge with 3 or fewer mistakes.",
        icon: "🧭",
    },
    {
        id: "river-master",
        name: "River Master",
        description: "Complete the River Origin Challenge with zero mistakes.",
        icon: "👑",
    },
];

function readJson(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

export function getEarnedBadges() {
    return readJson(ACHIEVEMENTS_STORAGE_KEY, {});
}

export function isBadgeEarned(badgeId) {
    return Boolean(getEarnedBadges()[badgeId]);
}

function awardBadge(badgeId) {
    const earned = getEarnedBadges();
    if (earned[badgeId]) return;

    const badge = BADGES.find((b) => b.id === badgeId);
    if (!badge) return;

    earned[badgeId] = new Date().toISOString();
    try {
        localStorage.setItem(ACHIEVEMENTS_STORAGE_KEY, JSON.stringify(earned));
    } catch {
        // localStorage unavailable/full - badge still announced for this session
    }
    eventBus.emit("BADGE_EARNED", badge);
}

function handleReportSubmitted() {
    awardBadge("first-report");
}

function handleStreakUpdated(payload) {
    if (payload && payload.streak >= 7) {
        awardBadge("streak-master");
    }
}

function handleQuizCompleted(payload) {
    if (!payload || payload.percent !== 100 || !payload.quizId) return;

    const perfectQuizzes = new Set(readJson(PERFECT_QUIZZES_KEY, []));
    perfectQuizzes.add(payload.quizId);
    try {
        localStorage.setItem(PERFECT_QUIZZES_KEY, JSON.stringify([...perfectQuizzes]));
    } catch {
        // ignore persistence failure
    }

    if (payload.totalQuizzes && perfectQuizzes.size >= payload.totalQuizzes) {
        awardBadge("aqi-expert");
    }
}

function handleRoutePlanned() {
    const count = (Number(localStorage.getItem(ROUTES_PLANNED_KEY)) || 0) + 1;
    try {
        localStorage.setItem(ROUTES_PLANNED_KEY, String(count));
    } catch {
        // ignore persistence failure
    }

    if (count >= 10) {
        awardBadge("route-explorer");
    }
}

function handleAqiMissionCompleted(payload) {
    if (!payload) return;
    const { success, missionId } = payload;
    if (success) {
        awardBadge("mission-commander");
        if (missionId === "hard_crisis") {
            awardBadge("smog-slayer");
        }
    }
}

function handleHotspotScoutCompleted(payload) {
    if (!payload) return;
    const { score } = payload;
    if (score >= 3) {
        awardBadge("hotspot-hunter");
    }
    if (score === 5) {
        awardBadge("perfect-scout");
    }
}

function handleRiverOriginCompleted(payload) {
    if (!payload) return;
    const { mistakes } = payload;
    if (mistakes <= 3) {
        awardBadge("river-explorer");
    }
    if (mistakes === 0) {
        awardBadge("river-master");
    }
}

let engineStarted = false;
export function initAchievementsEngine() {
    if (engineStarted) return;
    engineStarted = true;

    eventBus.on("COMMUNITY_REPORT_SUBMITTED", handleReportSubmitted);
    eventBus.on("STREAK_UPDATED", handleStreakUpdated);
    eventBus.on("QUIZ_COMPLETED", handleQuizCompleted);
    eventBus.on("ROUTE_PLANNED", handleRoutePlanned);
    eventBus.on("AQI_MISSION_COMPLETED", handleAqiMissionCompleted);
    eventBus.on("HOTSPOT_SCOUT_COMPLETED", handleHotspotScoutCompleted);
    eventBus.on("RIVER_ORIGIN_COMPLETED", handleRiverOriginCompleted);
}

// Self-register on first import so no extra wiring is needed anywhere.
initAchievementsEngine();