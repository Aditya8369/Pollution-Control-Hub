import { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";
import { BADGES, getEarnedBadges } from "../utils/achievementsStore";
import { eventBus } from "../core/events";
import { useTenant } from "../context/TenantContext";

export default function Achievements() {
    const { tenantId, tenantName } = useTenant();
    const [earned, setEarned] = useState(() => getEarnedBadges());
    const [isSharing, setIsSharing] = useState(false);
    const shareCardRef = useRef(null);

    useEffect(() => {
        const refresh = () => setEarned(getEarnedBadges());
        eventBus.on("BADGE_EARNED", refresh);
        return () => eventBus.off("BADGE_EARNED", refresh);
    }, []);

    const earnedBadgesList = BADGES.filter((badge) => earned[badge.id]);
    const earnedCount = earnedBadgesList.length;

    const shareAchievementsCard = async () => {
        if (!shareCardRef.current || isSharing) return;
        try {
            setIsSharing(true);
            const canvas = await html2canvas(shareCardRef.current, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0f172a',
                logging: false,
            });
            const fileName = 'my-achievements.png';

            if (navigator.share && navigator.canShare) {
                canvas.toBlob(async (blob) => {
                    if (!blob) {
                        triggerDownload(canvas, fileName);
                        return;
                    }
                    const file = new File([blob], fileName, { type: 'image/png' });
                    if (navigator.canShare({ files: [file] })) {
                        try {
                            await navigator.share({
                                files: [file],
                                title: 'My Achievements',
                                text: `Check out my achievements on Pollution Control Hub! ${earnedCount} of ${BADGES.length} badges earned.`,
                            });
                            return;
                        } catch (err) {
                            if (err?.name !== 'AbortError') {
                                triggerDownload(canvas, fileName);
                            }
                            return;
                        }
                    }
                    triggerDownload(canvas, fileName);
                });
            } else {
                triggerDownload(canvas, fileName);
            }
        } catch (error) {
            console.error('Achievements share card export failed:', error);
        } finally {
            setIsSharing(false);
        }
    };

    function triggerDownload(canvas, fileName) {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    const organizationBanner = tenantId && tenantId !== 'default'
        ? `Organization view: ${tenantName}`
        : 'Global achievement view';

    return (
        <section className="panel achievements-panel">
            <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                    <h2>Achievements</h2>
                    <p>{earnedCount} of {BADGES.length} badges earned</p>
                    <p style={{ marginTop: '0.25rem', fontSize: '0.8rem', color: 'var(--muted, #94a3b8)' }}>{organizationBanner}</p>
                </div>
                <button
                    type="button"
                    className="btn-secondary text-sm share-achievements-btn"
                    onClick={shareAchievementsCard}
                    disabled={isSharing}
                    aria-label={isSharing ? "Generating share card..." : "Share achievements"}
                >
                    {isSharing ? "Generating Card..." : "Share Achievements"}
                </button>
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

            {/* Hidden share card template for html2canvas */}
            <div
                ref={shareCardRef}
                data-testid="achievements-share-card"
                style={{
                    position: 'absolute',
                    left: '-9999px',
                    top: '-9999px',
                    width: '600px',
                    padding: '24px',
                    backgroundColor: '#0f172a',
                    color: '#f8fafc',
                    fontFamily: 'sans-serif',
                    borderRadius: '12px',
                    boxSizing: 'border-box',
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px', marginBottom: '16px' }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '20px', color: '#2dd4bf' }}>Pollution Control Hub</h2>
                        <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#94a3b8' }}>My Badges & Accomplishments</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '22px', fontWeight: 'bold', color: '#38bdf8' }}>{earnedCount} / {BADGES.length}</span>
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>Badges Earned</div>
                    </div>
                </div>

                {earnedCount === 0 ? (
                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                        No badges earned yet. Start completing activities on Pollution Control Hub to unlock badges!
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        {earnedBadgesList.map((badge) => {
                            const earnedAt = earned[badge.id];
                            return (
                                <div
                                    key={badge.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px',
                                        backgroundColor: '#1e293b',
                                        borderRadius: '8px',
                                        border: '1px solid #334155',
                                    }}
                                >
                                    <span style={{ fontSize: '24px' }}>{badge.icon}</span>
                                    <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#f8fafc' }}>{badge.name}</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                            {earnedAt ? `Earned ${new Date(earnedAt).toLocaleDateString()}` : 'Earned'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}