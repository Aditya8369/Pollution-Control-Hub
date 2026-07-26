import { useState, useEffect } from 'react';
import { BADGES, getAchievementsState } from '../services/achievementsService';

export default function AchievementsSection() {
  const [unlockedIds, setUnlockedIds] = useState([]);

  useEffect(() => {
    const state = getAchievementsState();
    setUnlockedIds(state.unlocked);
  }, []);

  return (
    <section data-testid="achievements-section" className="panel">
      <div className="panel-head">
        <h2>🏆 Badges & Achievements</h2>
        <p>Complete activities across the platform to unlock achievements</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '1.5rem',
        marginTop: '1.5rem'
      }}>
        {BADGES.map((badge) => {
          const isUnlocked = unlockedIds.includes(badge.id);

          return (
            <div
              key={badge.id}
              style={{
                padding: '1.5rem',
                borderRadius: '12px',
                background: isUnlocked ? 'var(--bg-card-alt, rgba(13, 148, 136, 0.05))' : 'var(--bg-card, rgba(0,0,0,0.01))',
                border: isUnlocked ? '2px solid var(--brand)' : '1px dashed var(--line)',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                opacity: isUnlocked ? 1 : 0.6,
                transition: 'transform 0.2s, box-shadow 0.2s',
                boxShadow: isUnlocked ? 'var(--shadow-sm)' : 'none'
              }}
            >
              <span
                style={{
                  fontSize: '2.5rem',
                  filter: isUnlocked ? 'none' : 'grayscale(100%)',
                  transform: isUnlocked ? 'scale(1.1)' : 'scale(0.95)'
                }}
              >
                {badge.icon}
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <span
                  style={{
                    fontWeight: '700',
                    fontSize: '1.1rem',
                    color: isUnlocked ? 'var(--ink)' : 'var(--muted)'
                  }}
                >
                  {badge.name}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                  {badge.description}
                </span>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    color: isUnlocked ? 'var(--brand)' : 'var(--muted)',
                    marginTop: '0.25rem'
                  }}
                >
                  {isUnlocked ? '✅ Unlocked' : '🔒 Locked'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
