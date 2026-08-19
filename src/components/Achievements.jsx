import { useEffect, useState } from "react";
import { BADGES, getEarnedBadges } from "../utils/achievementsStore";
import { eventBus } from "../core/events";

export default function Achievements() {
    const [earned, setEarned] = useState(() => getEarnedBadges());

    useEffect(() => {
        const refresh = () => setEarned(getEarnedBadges());
        eventBus.on("BADGE_EARNED", refresh);
        return () => eventBus.off("BADGE_EARNED", refresh);
    }, []);

    const earnedCount = BADGES.filter((badge) => earned[badge.id]).length;

    return (
        <section className="panel achievements-panel">
            <div className="panel-head">
                <h2>Achievements</h2>
                <p>{earnedCount} of {BADGES.length} badges earned</p>
            </div>
            <div className="achievements-grid">
                {BADGES.map((badge) => {
                    const earnedAt = earned[badge.id];
                    return (
                        <div
                            key={badge.id}
                            className={`achievement-card ${earnedAt ? "earned" : "locked"}`}
                        >
                            <span className="achievement-icon" aria-hidden="true">{badge.icon}</span>
                            <h3>{badge.name}</h3>
                            <p>{badge.description}</p>
                            <span className="achievement-status">
                                {earnedAt ? `Earned ${new Date(earnedAt).toLocaleDateString()}` : "Locked"}
                            </span>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}