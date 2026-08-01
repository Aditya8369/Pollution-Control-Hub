import { useSWR } from "../hooks/useSWR";
import { fetchPollenData, getPollenSeverity } from "../services/airQualityService";

export default function PollenAllergenForecast({ lat, lon }) {
  const pollenKey = lat && lon ? `pollen_${lat.toFixed(4)}_${lon.toFixed(4)}` : null;
  const {
    data: pollenData,
    error,
    isValidating
  } = useSWR(pollenKey, () => fetchPollenData(lat, lon), { ttl: 60 * 60 * 1000 });

  const loading = !pollenData && isValidating;

  if (loading) {
    return (
      <section className="panel pollen-allergen-panel">
        <div className="panel-head">
          <h2>🌾 Pollen & Allergen Forecast</h2>
          <p>Loading allergy and pollen conditions...</p>
        </div>
        <div className="pollen-loading-container" style={{ padding: '2rem', textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '1rem', color: 'var(--muted)' }}>Fetching live pollen metrics...</p>
        </div>
      </section>
    );
  }

  if (error || !pollenData) {
    return (
      <section className="panel pollen-allergen-panel">
        <div className="panel-head">
          <h2>🌾 Pollen & Allergen Forecast</h2>
          <p>Allergy and pollen conditions</p>
        </div>
        <div className="pollen-error-container" style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>
          <p>Unable to load pollen forecast data right now. Please try again later.</p>
        </div>
      </section>
    );
  }

  const { tree, grass, weed, mold, isFallback } = pollenData;

  const treeSev = getPollenSeverity('tree', tree);
  const grassSev = getPollenSeverity('grass', grass);
  const weedSev = getPollenSeverity('weed', weed);
  const moldSev = getPollenSeverity('mold', mold);

  // Compute Overall Allergen Index
  const getOverallIndex = () => {
    const severities = [treeSev.label, grassSev.label, weedSev.label];
    if (severities.includes('High')) {
      return { label: 'High', color: '#ef4444', textClass: 'badge-danger' };
    }
    if (severities.includes('Moderate')) {
      return { label: 'Moderate', color: '#f59e0b', textClass: 'badge-warning' };
    }
    return { label: 'Low', color: '#1f9d55', textClass: 'badge-success' };
  };

  const overall = getOverallIndex();

  return (
    <section className="panel pollen-allergen-panel" data-testid="pollen-allergen-forecast">
      <div className="panel-head pollen-header">
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2>🌾 Pollen & Allergen Forecast</h2>
          <p>
            Current airborne allergen concentrations and risk levels.
            {isFallback && (
              <span className="fallback-badge pollen-fallback-badge" style={{
                marginLeft: '0.75rem',
                padding: '0.2rem 0.5rem',
                backgroundColor: 'var(--bg-card-alt, #f8fafc)',
                color: 'var(--muted, #64748b)',
                border: '1px solid var(--line, #e2e8f0)',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                display: 'inline-block',
                verticalAlign: 'middle'
              }}>
                Regional Estimate
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="pollen-metrics-grid">
        {/* Tree Pollen */}
        <article className="pollen-card">
          <div className="pollen-card-header">
            <span className="pollen-icon-wrapper tree-bg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pollen-icon">
                <path d="M12 22v-5M9 17h6M12 3a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3.5 5.5h7c2-1 3.5-3 3.5-5.5a7 7 0 0 0-7-7z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className={`priority-badge ${treeSev.label === 'High' ? 'badge-danger' : treeSev.label === 'Moderate' ? 'badge-warning' : 'badge-success'}`}>
              {treeSev.label}
            </span>
          </div>
          <h3>Tree Pollen</h3>
          <div className="pollen-value">{tree} <span className="pollen-unit">grains/m³</span></div>
          <p>Alder, Birch, and Olive trees</p>
        </article>

        {/* Grass Pollen */}
        <article className="pollen-card">
          <div className="pollen-card-header">
            <span className="pollen-icon-wrapper grass-bg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pollen-icon">
                <path d="M5 22c1-6 4-12 10-14M11 22c1-5 3-10 7-11M3 22c2-8 7-16 16-18" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className={`priority-badge ${grassSev.label === 'High' ? 'badge-danger' : grassSev.label === 'Moderate' ? 'badge-warning' : 'badge-success'}`}>
              {grassSev.label}
            </span>
          </div>
          <h3>Grass Pollen</h3>
          <div className="pollen-value">{grass} <span className="pollen-unit">grains/m³</span></div>
          <p>Ryegrass, Timothy, and Meadow grasses</p>
        </article>

        {/* Weed Pollen */}
        <article className="pollen-card">
          <div className="pollen-card-header">
            <span className="pollen-icon-wrapper weed-bg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pollen-icon">
                <path d="M12 2v20M12 7l-5 3M12 12l6 3M12 17l-4 2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className={`priority-badge ${weedSev.label === 'High' ? 'badge-danger' : weedSev.label === 'Moderate' ? 'badge-warning' : 'badge-success'}`}>
              {weedSev.label}
            </span>
          </div>
          <h3>Weed Pollen</h3>
          <div className="pollen-value">{weed} <span className="pollen-unit">grains/m³</span></div>
          <p>Ragweed, Mugwort, and Nettle weeds</p>
        </article>

        {/* Mold Spores */}
        <article className="pollen-card">
          <div className="pollen-card-header">
            <span className="pollen-icon-wrapper mold-bg">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pollen-icon">
                <circle cx="12" cy="12" r="10"/>
                <circle cx="8" cy="9" r="1.5"/>
                <circle cx="15" cy="10" r="1"/>
                <circle cx="10" cy="14" r="1.5"/>
                <circle cx="14" cy="15" r="1"/>
              </svg>
            </span>
            <span className="priority-badge badge-info">
              {moldSev.label}
            </span>
          </div>
          <h3>Mold Spores</h3>
          <div className="pollen-value">N/A</div>
          <p>Outdoor fungal spore counts</p>
        </article>

        {/* Overall Index */}
        <article className="pollen-card highlight-card" style={{ borderTop: `3px solid ${overall.color}` }}>
          <div className="pollen-card-header">
            <span className="pollen-icon-wrapper overall-bg" style={{ background: `${overall.color}20` }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pollen-icon" style={{ color: overall.color }}>
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </span>
            <span className={`priority-badge ${overall.textClass}`}>
              {overall.label}
            </span>
          </div>
          <h3>Overall Allergen Index</h3>
          <div className="pollen-value" style={{ color: overall.color }}>{overall.label}</div>
          <p>Combined risk based on active allergens</p>
        </article>
      </div>

      {isFallback && (
        <p className="pollen-disclaimer" style={{
          marginTop: '1.2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--line)',
          color: 'var(--muted)',
          lineHeight: '1.5',
          fontSize: '0.8rem'
        }}>
          * Pollen measurements are currently simulated. Live data coverage is unavailable for this coordinates region.
        </p>
      )}
    </section>
  );
}
