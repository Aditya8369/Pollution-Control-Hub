import { useState } from "react";

// Tabs available in the Getting Started guide.
// Only "overview" and "features" have content today; the rest are
// upcoming onboarding sections and render a "coming soon" placeholder
// until their own issues are implemented.
const GUIDE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "aqi", label: "AQI Basics" },
  { id: "pollutants", label: "Pollutants" },
  { id: "health", label: "Health" },
  { id: "faq", label: "FAQ" },
];

function GettingStarted() {
  const [activeTab, setActiveTab] = useState("overview");

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
          {GUIDE_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`guide-tab${activeTab === tab.id ? " active" : ""}`}
              aria-pressed={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {activeTab === "overview" && (
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
        )}

        {activeTab === "features" && (
        <section className="getting-started-section">
  <div className="overview-content">
    <div className="overview-item">
      <h4>01. Home</h4>
      <p>
        Your dashboard for real-time air quality monitoring, giving you an
        at-a-glance view of current conditions for your location.
      </p>
    </div>

    <div className="overview-item">
      <h4>02. Quiz</h4>
      <p>
        Interactive quizzes that help you learn about air pollution and
        build your environmental awareness in a fun, engaging way.
      </p>
    </div>

    <div className="overview-item">
      <h4>03. Game</h4>
      <p>
        Educational games designed to reinforce environmental concepts
        through hands-on, playful learning experiences.
      </p>
    </div>

    <div className="overview-item">
      <h4>04. Community</h4>
      <p>
        A space for community discussions, local reporting, and
        collaborative participation in environmental action.
      </p>
    </div>

    <div className="overview-item">
      <h4>05. History</h4>
      <p>
        Explore historical air quality trends and analytics to understand
        how conditions have changed over time.
      </p>
    </div>

    <div className="overview-item">
      <h4>06. Commute</h4>
      <p>
        Air-quality-aware travel and route planning tools to help you
        choose cleaner ways to get around.
      </p>
    </div>

  </div>
</section>
        )}

        {activeTab === "aqi" && (
<section className="getting-started-section">
  <div className="overview-content">
    <div className="overview-item">
      <h4>01. What is the AQI?</h4>
      <p>
        The Air Quality Index (AQI) is a single number that summarizes how
        clean or polluted the air is, making it easy to understand what the
        pollution measurements around you actually mean.
      </p>
    </div>

    <div className="overview-item">
      <h4>02. How the scale works</h4>
      <p>
        The AQI runs from 0 upward, divided into ranges from Good to
        Hazardous. Lower numbers mean cleaner air; higher numbers mean
        greater health risk, especially for sensitive groups.
      </p>

      <div className="calendar-legend" style={{ marginTop: "12px" }}>
        <div className="calendar-legend-grid">
          <div className="calendar-legend-item">
            <span className="calendar-legend-color" style={{ backgroundColor: "#1f9d55" }}></span>
            <span>0–50 · Good</span>
          </div>
          <div className="calendar-legend-item">
            <span className="calendar-legend-color" style={{ backgroundColor: "#f59e0b" }}></span>
            <span>51–100 · Moderate</span>
          </div>
          <div className="calendar-legend-item">
            <span className="calendar-legend-color" style={{ backgroundColor: "#f97316" }}></span>
            <span>101–150 · Unhealthy (Sensitive)</span>
          </div>
          <div className="calendar-legend-item">
            <span className="calendar-legend-color" style={{ backgroundColor: "#ef4444" }}></span>
            <span>151–200 · Unhealthy</span>
          </div>
          <div className="calendar-legend-item">
            <span className="calendar-legend-color" style={{ backgroundColor: "#b91c1c" }}></span>
            <span>201–300 · Very Unhealthy</span>
          </div>
          <div className="calendar-legend-item">
            <span className="calendar-legend-color" style={{ backgroundColor: "#7f1d1d" }}></span>
            <span>301+ · Hazardous</span>
          </div>
        </div>
      </div>
    </div>

    <div className="overview-item">
      <h4>03. Where you'll see it in this app</h4>
      <p>
        AQI values and their colors show up across the platform — on your
        Home dashboard, in History trends, and in the Commute planner —
        using this same scale, so you can read them consistently everywhere.
      </p>
    </div>

  </div>
</section>
)}

{activeTab === "pollutants" && (
<section className="getting-started-section">
  <div className="overview-content">
    <div className="overview-item">
      <h4>01. PM2.5 — Fine Particulate Matter</h4>
      <p>
        Fine particles can penetrate lungs and enter the bloodstream, making
        PM2.5 one of the most harmful pollutants to human health.
      </p>
      <p>
        <strong>Common sources:</strong> vehicle exhaust, industrial
        emissions, and burning of fuels such as wood or coal.
      </p>
    </div>

    <div className="overview-item">
      <h4>02. PM10 — Coarse Particulate Matter</h4>
      <p>
        Coarse particles can irritate airways and cause coughing. They are
        larger than PM2.5 but still small enough to be inhaled.
      </p>
      <p>
        <strong>Common sources:</strong> dust, construction sites, pollen,
        and road traffic.
      </p>
    </div>

    <div className="overview-item">
      <h4>03. NO₂ — Nitrogen Dioxide</h4>
      <p>
        NO₂ may irritate airways and aggravate respiratory diseases such as
        asthma.
      </p>
      <p>
        <strong>Common sources:</strong> vehicle traffic and combustion of
        fossil fuels in engines and power plants.
      </p>
    </div>

    <div className="overview-item">
      <h4>04. SO₂ — Sulfur Dioxide</h4>
      <p>
        SO₂ can irritate the respiratory system and contributes to the
        formation of acid rain and fine particulate pollution.
      </p>
      <p>
        <strong>Common sources:</strong> industrial activity and the burning
        of sulfur-containing fossil fuels such as coal and oil.
      </p>
    </div>

    <div className="overview-item">
      <h4>05. CO — Carbon Monoxide</h4>
      <p>
        High levels of CO reduce oxygen delivery to the body, which can be
        dangerous in enclosed or heavily trafficked areas.
      </p>
      <p>
        <strong>Common sources:</strong> incomplete combustion from vehicles,
        generators, and heating appliances.
      </p>
    </div>

    <div className="overview-item">
      <h4>06. O₃ — Ground-level Ozone</h4>
      <p>
        Ground-level ozone can trigger asthma and reduce lung function. Unlike
        the ozone layer above us, this ozone forms close to the ground and is
        harmful to breathe.
      </p>
      <p>
        <strong>Common sources:</strong> a secondary pollutant formed when
        vehicle and industrial emissions react in sunlight.
      </p>
    </div>

  </div>
</section>
)}

{["health", "faq"].includes(activeTab) && (
<section className="getting-started-section">
  <div className="overview-content">
    <div className="overview-item">
      <p>
        This section of the Getting Started guide is coming soon.
        We're working on it — check back shortly!
      </p>
    </div>
  </div>
</section>
)}
      </div>
    </section>
  );
}

export default GettingStarted;