import { useEffect, useState } from "react";
import { eventBus } from "../core/events";

export default function BadgeNotification() {
    const [queue, setQueue] = useState([]);

    useEffect(() => {
        const handleBadgeEarned = (badge) => {
            setQueue((prev) => [...prev, { ...badge, notifId: `${badge.id}-${Date.now()}` }]);
        };
        eventBus.on("BADGE_EARNED", handleBadgeEarned);
        return () => eventBus.off("BADGE_EARNED", handleBadgeEarned);
    }, []);

    useEffect(() => {
        if (queue.length === 0) return;
        const timer = setTimeout(() => setQueue((prev) => prev.slice(1)), 5000);
        return () => clearTimeout(timer);
    }, [queue]);

    if (queue.length === 0) return null;
    const current = queue[0];

    return (
        <div className="badge-toast" role="status" aria-live="polite">
            <span className="achievement-icon" aria-hidden="true">{current.icon}</span>
            <div>
                <strong>Badge earned: {current.name}</strong>
                <p>{current.description}</p>
            </div>
        </div>
    );
}