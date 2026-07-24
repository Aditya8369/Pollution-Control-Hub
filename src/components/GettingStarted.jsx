function GettingStarted() {
  return (
    <section
      className="panel getting-started"
      aria-labelledby="getting-started-title"
    >
      <div className="getting-started-content">
        <header className="getting-started-header">
          <h2 id="getting-started-title">Getting Started</h2>
          <p>
            Welcome to <strong>Pollution Control Hub</strong>. This guide will
            help you understand the platform, discover its capabilities, and
            learn how to make the most of every feature.
          </p>
        </header>

        <section className="getting-started-section">
          <h3>About the Platform</h3>
          <p>
            Pollution Control Hub is an interactive environmental platform that
            combines real-time air quality monitoring, historical pollution
            trends, community participation, educational activities, and
            awareness tools into one experience.
          </p>
        </section>

        <section className="getting-started-section">
          <h3>What this guide will cover</h3>

          <ul className="getting-started-list">
            <li>Platform overview and objectives</li>
            <li>Understanding each section of the application</li>
            <li>Air Quality Index (AQI) basics</li>
            <li>Pollutants and their health impacts</li>
            <li>Health recommendations and environmental awareness</li>
            <li>Frequently Asked Questions</li>
          </ul>
        </section>

        <section className="getting-started-section">
          <h3>Coming Soon</h3>

          <p>
            This is the foundation of the Getting Started guide. Future updates
            will gradually introduce dedicated sections covering every major
            feature of Pollution Control Hub with simple explanations,
            walkthroughs, and helpful resources.
          </p>
        </section>
      </div>
    </section>
  );
}

export default GettingStarted;