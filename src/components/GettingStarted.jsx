function GettingStarted() {
  return (
    <section
      className="panel getting-started"
      aria-labelledby="getting-started-title"
    >
      <div className="getting-started-content">

        {/* Internal Guide Navigation */}
        <nav
          className="getting-started-nav"
          aria-label="Getting Started Sections"
        >
          <button className="guide-tab active" type="button">
            Overview
          </button>

          <button className="guide-tab" type="button">
            Features
          </button>

          <button className="guide-tab" type="button">
            AQI Basics
          </button>

          <button className="guide-tab" type="button">
            Pollutants
          </button>

          <button className="guide-tab" type="button">
            Health
          </button>

          <button className="guide-tab" type="button">
            FAQ
          </button>
        </nav>

        <section className="getting-started-section">
  <div className="overview-content">
    <div className="overview-item">
      <h4>01. What is Pollution Control Hub?</h4>
      <p>
        Pollution Control Hub is an open-source platform that helps people
        understand air quality through real-time monitoring, historical
        insights, community participation, educational activities, and health
        awareness resources.
      </p>
    </div>

    <div className="overview-item">
      <h4>02. Why was it built?</h4>
      <p>
        Air quality information is often difficult to interpret. The platform
        was created to transform complex pollution data into simple,
        understandable information that encourages informed decisions and
        community-driven environmental action.
      </p>
    </div>

    <div className="overview-item">
      <h4>03. Who is it for?</h4>
      <p>
        Whether you're a resident, student, educator, researcher, health-
        conscious individual, or community volunteer, Pollution Control Hub
        provides tools that make environmental information easier to access and
        understand.
      </p>
    </div>

    <div className="overview-item">
      <h4>04. What problem does it solve?</h4>
      <p>
        The platform bridges the gap between raw pollution data and meaningful
        action by helping users monitor air quality, understand its impact, and
        discover practical ways to contribute toward cleaner and healthier
        communities.
      </p>
    </div>

  </div>
</section>
      </div>
    </section>
  );
}

export default GettingStarted;