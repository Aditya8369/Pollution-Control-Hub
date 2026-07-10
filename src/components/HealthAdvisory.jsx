import { useState } from 'react';

import { FaHeartbeat, FaLungs, FaHandSparkles } from "react-icons/fa";
const sections = [
  {
    title: "Lungs",
    icon: <FaLungs />,
    variant: "lungs",
    impact:
      "Fine particles inflame airways and can worsen asthma, bronchitis, and breathing difficulty.",
  },
  {
    title: "Heart",
    icon: <FaHeartbeat />,
    variant: "heart",
    impact:
      "Long-term exposure to polluted air increases blood pressure and cardiovascular disease risk.",
  },
  {
    title: "Skin",
    icon: <FaHandSparkles />,
    variant: "skin",
    impact:
      "Air pollutants and smog can trigger irritation, dryness, and premature aging.",
  },
];


const audiences = {
  general: {
    label: 'General Public',
    desc: 'Advisories and tips for healthy adults with no pre-existing conditions.',
    tips: [
      {
        title: 'Wear a Mask',
        detail: 'Use an N95/N99 mask during peak traffic hours or when AQI exceeds 150.',
        priority: 'Medium',
        badgeClass: 'badge-warning',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M12 2a5 5 0 0 0-5 5v4h10V7a5 5 0 0 0-5-5z" />
          </svg>
        )
      },
      {
        title: 'Monitor Ventilation',
        detail: 'Keep windows closed when local AQI is high; open them during clean wind hours.',
        priority: 'High',
        badgeClass: 'badge-danger',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M12 3v18M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
          </svg>
        )
      },
      {
        title: 'Optimize Exercise',
        detail: 'Shift intense cardio sessions indoors if the AQI rises above 100.',
        priority: 'Low',
        badgeClass: 'badge-info',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v8H2Z" />
            <path d="M6 2v6M14 2v6" />
          </svg>
        )
      }
    ]
  },
  sensitive: {
    label: 'Sensitive Groups',
    desc: 'Essential guidance for individuals with asthma, heart conditions, or allergies.',
    tips: [
      {
        title: 'Rescue Inhaler',
        detail: 'Keep prescribed quick-relief medication handy at all times when outdoors.',
        priority: 'High',
        badgeClass: 'badge-danger',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 9h16v11H4zM4 5h6v4H4zM14 5h6v4h-6z" />
          </svg>
        )
      },
      {
        title: 'Run Air Purifiers',
        detail: 'Keep HEPA filters active in your bedroom and workspace to reduce indoor triggers.',
        priority: 'High',
        badgeClass: 'badge-danger',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" />
          </svg>
        )
      },
      {
        title: 'Limit Exposure',
        detail: 'Avoid walking near main roads during peak congestion and early mornings.',
        priority: 'Medium',
        badgeClass: 'badge-warning',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4l3 3" />
          </svg>
        )
      }
    ]
  },
  vulnerable: {
    label: 'Children & Elderly',
    desc: 'Protective actions tailored for developing lungs and older age groups.',
    tips: [
      {
        title: 'Avoid Morning Walks',
        detail: 'Air pollutants settle close to the ground in the early morning; walk in the afternoon instead.',
        priority: 'High',
        badgeClass: 'badge-danger',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        )
      },
      {
        title: 'Nutritious Diet',
        detail: 'Consume foods rich in Vitamin C, E, and Omega-3 to help combat system-wide oxidative stress.',
        priority: 'Medium',
        badgeClass: 'badge-warning',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6Z" />
          </svg>
        )
      },
      {
        title: 'Indoor Play',
        detail: 'Keep kids active with creative indoor activities instead of playing outdoors when AQI exceeds 100.',
        priority: 'High',
        badgeClass: 'badge-danger',
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 22h20L12 2Z" />
          </svg>
        )
      }
    ]
  }
};

export default function HealthAdvisory() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <section className="panel health-advisory-panel">
      <div className="panel-head">
        <h2>Health Advisory Hub</h2>
        <p>How current air quality impacts your organs, and recommended steps to protect yourself.</p>
      </div>

      {/* Organ Impacts Grid */}
      <h3 className="section-subtitle">Organ-Specific Impacts</h3>
     <div className="advisory-grid">
        {sections.map((section) => (
          <article key={section.title} className="advisory-card">
            <div className={`icon-container ${section.variant}`}>{section.icon}</div>
            <div className="advisory-card-top">
              <h3>{section.title}</h3>
            </div>
            <p>{section.impact}</p>
          </article>
        ))}
      </div>

      <div className="divider-line" />

      {/* Interactive Tabs Section */}
      <div className="tabs-container">
        <div className="tabs-header">
          <h3 className="section-subtitle">Tailored Health Recommendations</h3>
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
                <div className="tip-icon-wrapper">{tip.icon}</div>
                <span className={`priority-badge ${tip.badgeClass}`}>{tip.priority}</span>
              </div>
              <div className="tip-body">
                <h4>{tip.title}</h4>
                <p>{tip.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
