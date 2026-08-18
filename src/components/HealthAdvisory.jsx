import { useState, useEffect, memo } from 'react';
import { useTranslation } from 'react-i18next';
import GlossaryLinkedText from './GlossaryLinkedText';

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
// 1b. USER HEALTH PROFILE (voluntary, persisted locally on this device)
// -----------------------------------------------------------------------------
const HEALTH_PROFILE_STORAGE_KEY = 'pch_health_profile';

const HEALTH_CONDITIONS = [
  { id: 'asthma', label: 'Asthma' },
  { id: 'heartDisease', label: 'Heart Disease' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'copd', label: 'COPD / Chronic Lung Condition' },
  { id: 'pregnancy', label: 'Pregnancy' }
];

const CONDITION_ADVISORY_MESSAGES = {
  asthma: 'Keep your rescue inhaler within reach and avoid outdoor exertion when AQI is elevated — pollutants can trigger airway inflammation quickly.',
  heartDisease: 'Avoid strenuous outdoor activity during poor air quality; fine particulates (PM2.5) are linked to increased cardiovascular strain.',
  allergies: 'Check pollen and particulate levels before heading out, and keep windows closed on high-AQI days to limit allergen and pollutant exposure.',
  copd: 'Monitor symptoms closely on poor air quality days and keep prescribed medication accessible; consider an N95 mask for unavoidable outdoor exposure.',
  pregnancy: 'Limit prolonged outdoor exposure on high-pollution days, as fine particulates have been associated with risks to maternal and fetal health.'
};

function loadHealthProfile() {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(HEALTH_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn(`Error reading localStorage key "${HEALTH_PROFILE_STORAGE_KEY}":`, err);
  }
  return [];
}

// -----------------------------------------------------------------------------
// 2. MAIN COMPONENT
// -----------------------------------------------------------------------------
export default function HealthAdvisory() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [healthConditions, setHealthConditions] = useState(loadHealthProfile);
  const hasSensitiveProfile = healthConditions.length > 0;

  // Persist the user's voluntary health profile locally on this device.
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HEALTH_PROFILE_STORAGE_KEY, JSON.stringify(healthConditions));
      }
    } catch (err) {
      console.warn(`Error writing to localStorage key "${HEALTH_PROFILE_STORAGE_KEY}":`, err);
    }
  }, [healthConditions]);

  // If the user has opted in with any condition, surface the sensitive-group tab by default.
  useEffect(() => {
    if (hasSensitiveProfile) {
      setActiveTab('sensitive');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleHealthCondition = (id) => {
    setHealthConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

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

      {/* Voluntary Health Profile */}
      <div className="health-profile-section" data-testid="health-profile-section">
        <h3 className="section-subtitle">
          {t('healthAdvisory.profile.title', { defaultValue: 'Your Health Profile (optional)' })}
        </h3>
        <p className="tab-description">
          {t('healthAdvisory.profile.desc', {
            defaultValue: 'Voluntarily add any pre-existing conditions to get tailored, higher-priority guidance. Stored only on this device.'
          })}
        </p>
        <div className="health-conditions-list">
          {HEALTH_CONDITIONS.map((condition) => (
            <label key={condition.id} className="health-condition-checkbox">
              <input
                type="checkbox"
                checked={healthConditions.includes(condition.id)}
                onChange={() => toggleHealthCondition(condition.id)}
              />
              {t(`healthAdvisory.profile.conditions.${condition.id}`, { defaultValue: condition.label })}
            </label>
          ))}
        </div>
      </div>

      <div className="divider-line" />

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
            <p><GlossaryLinkedText text={organ.impact} /></p>
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

        {/* Personalized Advisory (shown with higher prominence for opted-in users) */}
        {hasSensitiveProfile && (
          <div className="personalized-advisory-banner" data-testid="personalized-advisory-banner">
            <h3>{t('healthAdvisory.profile.personalizedTitle', { defaultValue: '⚠️ Personalized Guidance For You' })}</h3>
            <ul>
              {healthConditions.map((id) => (
                <li key={id}>
                  <strong>
                    {t(`healthAdvisory.profile.conditions.${id}`, {
                      defaultValue: HEALTH_CONDITIONS.find((c) => c.id === id)?.label || id
                    })}
                    :
                  </strong>{' '}
                  {t(`healthAdvisory.profile.messages.${id}`, { defaultValue: CONDITION_ADVISORY_MESSAGES[id] })}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actionable Tips Grid */}
        <ul className="tips-grid">
          {audiences[activeTab].tips.map((tip) => (
            <li key={tip.title} className="tip-action-card">
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
              <p className="tip-detail"><GlossaryLinkedText text={tip.detail} /></p>
            </li>
          ))}
        </ul>
      </div>


    </section>
  );
}
