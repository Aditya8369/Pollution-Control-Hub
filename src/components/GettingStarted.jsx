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

        {["aqi", "pollutants", "health", "faq"].includes(activeTab) && (
        <section className="getting-started-section">
          <div className="overview-content">
            <div className="overview-item">
              <p>
                This section of the Getting Started guide is coming soon.
                We&apos;re working on it — check back shortly!
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