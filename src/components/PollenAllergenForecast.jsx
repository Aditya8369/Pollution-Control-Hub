import { useSWR } from "../hooks/useSWR";
import {
  fetchPollenData,
  getPollenSeverity,
  isValidCoord,
} from "../services/airQualityService";

/** How long a pollen reading stays fresh. The upstream series is hourly. */
const POLLEN_TTL_MS = 60 * 60 * 1000;

/** Maps a severity label onto the badge class the stylesheet already defines. */
const BADGE_CLASS = {
  High: 'badge-danger',
  Moderate: 'badge-warning',
  Low: 'badge-success',
};

/**
 * @param {string} label
 * @returns {string} The badge class for a severity label, neutral for anything else.
 */
function badgeClassFor(label) {
  return BADGE_CLASS[label] || 'badge-info';
}

/**
 * @param {unknown} value
 * @returns {boolean} Whether a pollen count is a usable reading.
 */
function isCount(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * One allergen card.
 *
 * The value slot is the point of this component. Each card used to interpolate
 * the count straight into the markup:
 *
 *   <div className="pollen-value">{tree} <span className="pollen-unit">grains/m³</span></div>
 *
 * React renders `null` as nothing, so a pollutant the endpoint had no data for
 * came out as a bare "grains/m³" with no number in front of it — next to a badge
 * reading "Unavailable". Say it once, in the value slot, and drop the unit that
 * has nothing to qualify.
 *
 * @param {{
 *   title: string,
 *   value: number|null,
 *   severity: { label: string },
 *   description: string,
 *   iconClass: string,
 *   children: any,
 *   testId?: string,
 * }} params
 */
function PollenCard({ title, value, severity, description, iconClass, children, testId }) {
  const measured = isCount(value);

  return (
    <article className="pollen-card" data-testid={testId}>
      <div className="pollen-card-header">
        <span className={`pollen-icon-wrapper ${iconClass}`}>{children}</span>
        <span className={`priority-badge ${badgeClassFor(severity.label)}`}>
          {severity.label}
        </span>
      </div>
      <h3>{title}</h3>
      <div className="pollen-value">
        {measured ? (
          <>
            {value} <span className="pollen-unit">grains/m³</span>
          </>
        ) : (
          <span className="pollen-value-missing" style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>
            No data
          </span>
        )}
      </div>
      <p>{description}</p>
    </article>
  );
}

/**
 * The combined index, from whichever allergens were actually measured.
 *
 * Returns null when nothing was measured, rather than the old unconditional
 * "Low" — which is what the previous implementation reported for a location the
 * endpoint had no coverage for at all.
 *
 * @param {Array<{ label: string }>} severities
 * @param {Array<number|null>} values
 * @returns {{ label: string, color: string, textClass: string }|null}
 */
export function getOverallIndex(severities, values) {
  const measured = severities.filter((severity, i) => isCount(values[i]));
  if (measured.length === 0) return null;

  const labels = measured.map((s) => s.label);
  if (labels.includes('High')) {
    return { label: 'High', color: '#ef4444', textClass: 'badge-danger' };
  }
  if (labels.includes('Moderate')) {
    return { label: 'Moderate', color: '#f59e0b', textClass: 'badge-warning' };
  }
  return { label: 'Low', color: '#1f9d55', textClass: 'badge-success' };
}

/** @param {{ lat?: number, lon?: number }} params */
export default function PollenAllergenForecast({ lat, lon }) {
  // `lat && lon` was a truthiness test, so 0 read as "no location" and the panel
  // sat on its error state forever anywhere on the equator or the prime meridian —
  // Quito, Libreville, Accra, Kampala. `isValidCoord` is the same check the
  // service itself applies, and it also rejects the non-numeric input `.toFixed`
  // used to throw on.
  const hasLocation = isValidCoord(lat, lon);
  const pollenKey = hasLocation ? `pollen_${lat.toFixed(4)}_${lon.toFixed(4)}` : null;

  const {
    data: pollenData,
    error,
    isValidating
  } = useSWR(pollenKey, () => fetchPollenData(lat, lon), { ttl: POLLEN_TTL_MS });

  const loading = hasLocation && !pollenData && isValidating;

  if (loading) {
    return (
      <section className="panel pollen-allergen-panel" data-testid="pollen-allergen-forecast">
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

  if (!hasLocation) {
    return (
      <section className="panel pollen-allergen-panel" data-testid="pollen-allergen-forecast">
        <div className="panel-head">
          <h2>🌾 Pollen & Allergen Forecast</h2>
          <p>Allergy and pollen conditions</p>
        </div>
        <div className="pollen-error-container" style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)' }}>
          <p>Pick a location to see its pollen forecast.</p>
        </div>
      </section>
    );
  }

  if (error || !pollenData) {
    return (
      <section className="panel pollen-allergen-panel" data-testid="pollen-allergen-forecast">
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

  const overall = getOverallIndex([treeSev, grassSev, weedSev], [tree, grass, weed]);

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
        <PollenCard
          testId="pollen-card-tree"
          title="Tree Pollen"
          value={tree}
          severity={treeSev}
          description="Alder, Birch, and Olive trees"
          iconClass="tree-bg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pollen-icon" aria-hidden="true">
            <path d="M12 22v-5M9 17h6M12 3a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3.5 5.5h7c2-1 3.5-3 3.5-5.5a7 7 0 0 0-7-7z" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </PollenCard>

        <PollenCard
          testId="pollen-card-grass"
          title="Grass Pollen"
          value={grass}
          severity={grassSev}
          description="Ryegrass, Timothy, and Meadow grasses"
          iconClass="grass-bg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pollen-icon" aria-hidden="true">
            <path d="M5 22c1-6 4-12 10-14M11 22c1-5 3-10 7-11M3 22c2-8 7-16 16-18" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </PollenCard>

        <PollenCard
          testId="pollen-card-weed"
          title="Weed Pollen"
          value={weed}
          severity={weedSev}
          description="Ragweed, Mugwort, and Nettle weeds"
          iconClass="weed-bg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pollen-icon" aria-hidden="true">
            <path d="M12 2v20M12 7l-5 3M12 12l6 3M12 17l-4 2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </PollenCard>

        {/* The mold card used to render a severity badge next to a hard-coded
            "N/A": the badge was computed from `mold`, the value was a literal. Now
            both come from the same field, so the card can only ever say one thing. */}
        <PollenCard
          testId="pollen-card-mold"
          title="Mold Spores"
          value={mold}
          severity={moldSev}
          description="Outdoor fungal spore counts"
          iconClass="mold-bg"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pollen-icon" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="8" cy="9" r="1.5"/>
            <circle cx="15" cy="10" r="1"/>
            <circle cx="10" cy="14" r="1.5"/>
            <circle cx="14" cy="15" r="1"/>
          </svg>
        </PollenCard>

        {overall && (
          <article className="pollen-card highlight-card" data-testid="pollen-card-overall" style={{ borderTop: `3px solid ${overall.color}` }}>
            <div className="pollen-card-header">
              <span className="pollen-icon-wrapper overall-bg" style={{ background: `${overall.color}20` }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pollen-icon" style={{ color: overall.color }} aria-hidden="true">
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
        )}
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
