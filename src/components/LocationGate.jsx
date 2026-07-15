export default function LocationGate({ onUseMyLocation, isDetecting, errorMessage, onSearchCity }) {
  return (
    <section className="location-gate section-card" role="dialog" aria-labelledby="location-gate-title">
      <div className="location-gate-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      </div>

      <h2 id="location-gate-title">Enable Your Location</h2>
      <p>
        To show air quality near you, we need your location.
        Click the button below — your browser will ask for permission.
      </p>

      <button
        type="button"
        className="location-gate-btn"
        onClick={onUseMyLocation}
        disabled={isDetecting}
      >
        {isDetecting ? 'Detecting your location...' : 'Allow Location & Show My AQI'}
      </button>

      {errorMessage && (
        <p className="location-gate-error" role="alert">{errorMessage}</p>
      )}

      <p className="location-gate-alt">
        Or{' '}
        <button type="button" className="location-gate-link" onClick={onSearchCity}>
          search for a city manually
        </button>
      </p>
    </section>
  );
}
