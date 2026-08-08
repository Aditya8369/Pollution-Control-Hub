import { useState, memo } from 'react';
import { useTranslation } from 'react-i18next';

// -----------------------------------------------------------------------------
// 1. MEMOIZED ICONS (Extracted outside the component to prevent re-renders)
// -----------------------------------------------------------------------------
const LungsIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v20M6 5c-3 0-4 3-4 7s2 7 4 7c3 0 4-4 4-7S9 5 6 5zM18 5c3 0 4 3 4 7s-2 7-4 7c-3 0-4-4-4-7s1-7 4-7z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const HeartIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const SkinIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 16c0-2.2-1.8-4-4-4h-2c-2.2 0-4 1.8-4 4v4h10v-4z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const EyesIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const BrainIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9.5 2a3.5 3.5 0 0 0-3.5 3.5v.55A3.5 3.5 0 0 0 4 9.34v1.32a3.5 3.5 0 0 0-1 2.47V15.5A3.5 3.5 0 0 0 6.5 19h.55A3.5 3.5 0 0 0 10 21.45V22" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.5 2a3.5 3.5 0 0 1 3.5 3.5v.55A3.5 3.5 0 0 1 20 9.34v1.32a3.5 3.5 0 0 1 1 2.47V15.5A3.5 3.5 0 0 1 17.5 19h-.55A3.5 3.5 0 0 1 14 21.45V22" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const ImmuneIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2 3 6v6c0 5 4 9.5 9 10 5-.5 9-5 9-10V6l-9-4Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const MaskIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M12 2a5 5 0 0 0-5 5v4h10V7a5 5 0 0 0-5-5z" />
  </svg>
));

const VentilationIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12h18M12 3v18M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
  </svg>
));

const ExerciseIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v8H2Z" />
    <path d="M6 2v6M14 2v6" />
  </svg>
));

const InhalerIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 9h16v11H4zM4 5h6v4H4zM14 5h6v4h-6z" />
  </svg>
));

const PurifierIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" />
  </svg>
));

const LimitIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4l3 3" />
  </svg>
));

const WalksIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
));

const DietIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6Z" />
  </svg>
));

const PlayIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 22h20L12 2Z" />
  </svg>
));

// -----------------------------------------------------------------------------
// 2. MAIN COMPONENT
// -----------------------------------------------------------------------------
export default function HealthAdvisory() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');

  // Now using the memoized icon components instead of inline SVGs
  const organImpacts = [
    { title: t('healthAdvisory.organs.lungs.title'), impact: t('healthAdvisory.organs.lungs.impact'), icon: <LungsIcon /> },
    { title: t('healthAdvisory.organs.heart.title'), impact: t('healthAdvisory.organs.heart.impact'), icon: <HeartIcon /> },
    { title: t('healthAdvisory.organs.skin.title'), impact: t('healthAdvisory.organs.skin.impact'), icon: <SkinIcon /> },
    { title: t('healthAdvisory.organs.eyes.title'), impact: t('healthAdvisory.organs.eyes.impact'), icon: <EyesIcon /> },
    { title: t('healthAdvisory.organs.brain.title'), impact: t('healthAdvisory.organs.brain.impact'), icon: <BrainIcon /> },
    { title: t('healthAdvisory.organs.immune.title'), impact: t('healthAdvisory.organs.immune.impact'), icon: <ImmuneIcon /> }
  ];

  const audiences = {
    general: {
      label: t('healthAdvisory.audiences.general.label'),
      desc: t('healthAdvisory.audiences.desc_general', { defaultValue: 'Advisories and tips for healthy adults with no pre-existing conditions.' }),
      tips: [
        { title: t('healthAdvisory.tips.general.mask.title'), detail: t('healthAdvisory.tips.general.mask.detail'), priority: t('healthAdvisory.priorities.medium', { defaultValue: 'Medium' }), badgeClass: 'badge-warning', icon: <MaskIcon /> },
        { title: t('healthAdvisory.tips.general.ventilation.title'), detail: t('healthAdvisory.tips.general.ventilation.detail'), priority: t('healthAdvisory.priorities.high', { defaultValue: 'High' }), badgeClass: 'badge-danger', icon: <VentilationIcon /> },
        { title: t('healthAdvisory.tips.general.exercise.title'), detail: t('healthAdvisory.tips.general.exercise.detail'), priority: t('healthAdvisory.priorities.low', { defaultValue: 'Low' }), badgeClass: 'badge-info', icon: <ExerciseIcon /> }
      ]
    },
    sensitive: {
      label: t('healthAdvisory.audiences.sensitive.label'),
      desc: t('healthAdvisory.audiences.desc_sensitive', { defaultValue: 'Essential guidance for individuals with asthma, heart conditions, or allergies.' }),
      tips: [
        { title: t('healthAdvisory.tips.sensitive.inhaler.title'), detail: t('healthAdvisory.tips.sensitive.inhaler.detail'), priority: t('healthAdvisory.priorities.high', { defaultValue: 'High' }), badgeClass: 'badge-danger', icon: <InhalerIcon /> },
        { title: t('healthAdvisory.tips.sensitive.purifier.title'), detail: t('healthAdvisory.tips.sensitive.purifier.detail'), priority: t('healthAdvisory.priorities.high', { defaultValue: 'High' }), badgeClass: 'badge-danger', icon: <PurifierIcon /> },
        { title: t('healthAdvisory.tips.sensitive.limit.title'), detail: t('healthAdvisory.tips.sensitive.limit.detail'), priority: t('healthAdvisory.priorities.medium', { defaultValue: 'Medium' }), badgeClass: 'badge-warning', icon: <LimitIcon /> }
      ]
    },
    vulnerable: {
      label: t('healthAdvisory.audiences.vulnerable.label'),
      desc: t('healthAdvisory.audiences.desc_vulnerable', { defaultValue: 'Protective actions tailored for developing lungs and older age groups.' }),
      tips: [
        { title: t('healthAdvisory.tips.vulnerable.walks.title'), detail: t('healthAdvisory.tips.vulnerable.walks.detail'), priority: t('healthAdvisory.priorities.high', { defaultValue: 'High' }), badgeClass: 'badge-danger', icon: <WalksIcon /> },
        { title: t('healthAdvisory.tips.vulnerable.diet.title'), detail: t('healthAdvisory.tips.vulnerable.diet.detail'), priority: t('healthAdvisory.priorities.medium', { defaultValue: 'Medium' }), badgeClass: 'badge-warning', icon: <DietIcon /> },
        { title: t('healthAdvisory.tips.vulnerable.play.title'), detail: t('healthAdvisory.tips.vulnerable.play.detail'), priority: t('healthAdvisory.priorities.high', { defaultValue: 'High' }), badge: 'badge-danger', icon: <PlayIcon /> }
      ]
    }
  };

  return (
    <section data-testid="health-advisory" className="panel health-advisory-panel">
      <div className="panel-head">
        <h2>{t('healthAdvisory.title', { defaultValue: 'Health Advisory' })}</h2>
      </div>

      {/* Organ Impacts Grid */}
      <h3 className="section-subtitle">{t('healthAdvisory.organSubtitle')}</h3>
      <div className="advisory-grid">
        {organImpacts.map((organ) => (
          <article key={organ.title} className="advisory-card">
            <div className="advisory-card-header">
              <span
                className="organ-icon-wrapper"
                title={t('healthAdvisory.organIconTooltip', { organ: organ.title, defaultValue: `Impact on ${organ.title}` })}
              >
                {organ.icon}
              </span>
              <h3>{organ.title}</h3>
            </div>
            <p>{organ.impact}</p>
          </article>
        ))}
      </div>

      <div className="divider-line" />

      {/* Interactive Tabs Section */}
      <div className="tabs-container">
        <div className="tabs-header">
          <h3 className="section-subtitle">{t('healthAdvisory.tailoredSubtitle')}</h3>
          <div className="tabs-list-buttons">
            {Object.keys(audiences).map((key) => (
              <button
                key={key}
                type="button"
                className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
              >
                {audiences[key].label}
              </button>
            ))}
          </div>
        </div>

        <p className="tab-description">{audiences[activeTab].desc}</p>

        {/* Actionable Tips Grid */}
        <div className="tips-grid">
          {audiences[activeTab].tips.map((tip) => (
            <div key={tip.title} className="tip-action-card">
              <div className="tip-header">
                <div
                  className="tip-icon-wrapper"
                  title={t('healthAdvisory.tipIconTooltip', { tip: tip.title, defaultValue: `${tip.title} icon` })}
                >
                  {tip.icon}
                </div>
                <span className={`priority-badge ${tip.badgeClass}`}>{tip.priority}</span>
              </div>
              <h3 className="tip-title">{tip.title}</h3>
              <p className="tip-detail">{tip.detail}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Organ Impacts Section */}
      <div className="organ-impacts">
        <h3>{t('healthAdvisory.organsTitle', { defaultValue: 'Organ Impacts' })}</h3>
        <ul className="organ-list" style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          {organImpacts.map((organ, idx) => (
            <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
              <span className="organ-icon-wrapper" style={{ width: '32px', height: '32px', flexShrink: 0, color: 'var(--brand, #0d9488)' }}>
                {organ.icon}
              </span>
              <div>
                <strong style={{ display: 'block', marginBottom: '0.25rem' }}>{organ.title}</strong>
                <span style={{ fontSize: '0.85rem' }}>{organ.impact}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
