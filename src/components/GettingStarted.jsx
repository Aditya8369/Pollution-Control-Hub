import { useState } from "react";
import "../styles.css";

// Tabs available in the Getting Started guide. All tabs have content;
// "aqi" also includes two interactive elements (a live AQI-scale explorer
// and a short quiz) per issue #834.
const GUIDE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "aqi", label: "AQI Basics" },
  { id: "pollutants", label: "Pollutants" },
  { id: "health", label: "Health" },
  { id: "faq", label: "FAQ" },
];

const AQI_BANDS = [
  { max: 50, label: "Good", color: "#1f9d55", tip: "Air quality is satisfactory, and air pollution poses little or no risk." },
  { max: 100, label: "Moderate", color: "#f59e0b", tip: "Air quality is acceptable. Unusually sensitive people should consider limiting prolonged outdoor exertion." },
  { max: 150, label: "Unhealthy (Sensitive)", color: "#f97316", tip: "Sensitive groups may experience health effects; the general public is less likely to be affected." },
  { max: 200, label: "Unhealthy", color: "#ef4444", tip: "Everyone may begin to experience health effects; sensitive groups may experience more serious effects." },
  { max: 300, label: "Very Unhealthy", color: "#b91c1c", tip: "Health alert: everyone may experience more serious health effects." },
  { max: 500, label: "Hazardous", color: "#7f1d1d", tip: "Health warning of emergency conditions: everyone is more likely to be affected." },
];

function getBandForValue(value) {
  return AQI_BANDS.find((b) => value <= b.max) || AQI_BANDS[AQI_BANDS.length - 1];
}

/** Interactive, animated AQI-scale explorer — drag the slider to preview each band. */
function AQIRangeExplorer() {
  const [value, setValue] = useState(42);
  const band = getBandForValue(value);

  return (
    <div className="aqi-explorer" style={{ marginTop: "16px" }}>
      <label htmlFor="aqi-explorer-slider" style={{ display: "block", fontWeight: 600, marginBottom: "8px" }}>
        Try it: drag to explore the AQI scale
      </label>
      <input
        id="aqi-explorer-slider"
        type="range"
        min="0"
        max="500"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ width: "100%", accentColor: band.color }}
      />
      <div
        style={{
          marginTop: "12px",
          padding: "12px 16px",
          borderRadius: "8px",
          backgroundColor: `${band.color}1a`,
          borderLeft: `4px solid ${band.color}`,
          transition: "background-color 0.2s ease, border-color 0.2s ease",
        }}
      >
        <strong style={{ color: band.color, fontSize: "1.1rem" }}>
          AQI {value} · {band.label}
        </strong>
        <p style={{ margin: "6px 0 0" }}>{band.tip}</p>
      </div>
    </div>
  );
}

const AQI_MINI_QUIZ = [
  {
    q: "What does a LOWER AQI number mean?",
    options: ["Cleaner air", "More polluted air", "No difference", "Higher temperature"],
    answer: 0,
  },
  {
    q: "Which AQI range is considered 'Unhealthy for Sensitive Groups'?",
    options: ["0–50", "51–100", "101–150", "301+"],
    answer: 2,
  },
  {
    q: "Which pollutant is well known for penetrating deep into lungs and the bloodstream?",
    options: ["PM2.5", "Ozone", "CO2", "Pollen"],
    answer: 0,
  },
  {
    q: "On a 'Hazardous' AQI day, what should you generally do?",
    options: [
      "Go for a long run outside",
      "Open all windows for fresh air",
      "Avoid outdoor activity and keep windows closed",
      "Nothing, it doesn't matter",
    ],
    answer: 2,
  },
];

/** Short, self-graded quiz reinforcing the AQI Basics content above it. */
function AQIMiniQuiz() {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const score = AQI_MINI_QUIZ.reduce(
    (total, q, i) => total + (answers[i] === q.answer ? 1 : 0),
    0
  );

  const handleSelect = (qIndex, optIndex) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [qIndex]: optIndex }));
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  return (
    <div className="aqi-mini-quiz" style={{ marginTop: "24px" }}>
      <h4>Quick Check: Test What You Learned</h4>
      {AQI_MINI_QUIZ.map((q, qIndex) => (
        <div key={q.q} style={{ marginBottom: "16px" }}>
          <p style={{ fontWeight: 600, marginBottom: "8px" }}>{qIndex + 1}. {q.q}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {q.options.map((opt, optIndex) => {
              const isSelected = answers[qIndex] === optIndex;
              const isCorrect = optIndex === q.answer;
              let borderColor = "var(--border-color, #e2e8f0)";
              if (submitted && isSelected) borderColor = isCorrect ? "#16a34a" : "#dc2626";
              else if (submitted && isCorrect) borderColor = "#16a34a";

              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(qIndex, optIndex)}
                  disabled={submitted}
                  style={{
                    textAlign: "left",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: `2px solid ${borderColor}`,
                    backgroundColor: isSelected ? "rgba(13,148,136,0.08)" : "transparent",
                    cursor: submitted ? "default" : "pointer",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted ? (
        <button
          type="button"
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length < AQI_MINI_QUIZ.length}
          style={{
            padding: "10px 20px",
            borderRadius: "6px",
            border: "none",
            backgroundColor: "#0d9488",
            color: "white",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Check Answers
        </button>
      ) : (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <strong>Score: {score} / {AQI_MINI_QUIZ.length}</strong>
          <button
            type="button"
            onClick={handleReset}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid var(--border-color, #e2e8f0)",
              backgroundColor: "transparent",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

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

                <AQIRangeExplorer />
              </div>

              <div className="overview-item">
                <h4>03. Where you'll see it in this app</h4>
                <p>
                  AQI values and their colors show up across the platform — on your
                  Home dashboard, in History trends, and in the Commute planner —
                  using this same scale, so you can read them consistently everywhere.
                </p>
              </div>

              <AQIMiniQuiz />

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

        {activeTab === "health" && (
          <section className="getting-started-section">
            <div className="overview-content">

              <div className="overview-item">
                <h4>01. How air pollution affects health</h4>
                <p>
                  Poor air quality can irritate the eyes, nose, and throat, worsen
                  breathing problems, and increase the risk of heart and lung diseases,
                  especially during prolonged exposure.
                </p>
              </div>

              <div className="overview-item">
                <h4>02. Who is most at risk?</h4>
                <p>
                  Children, older adults, pregnant individuals, and people with asthma,
                  heart disease, or other respiratory conditions are more sensitive to
                  polluted air and should take extra precautions.
                </p>
              </div>

              <div className="overview-item">
                <h4>03. How to protect yourself</h4>
                <p>
                  Check the AQI before going outdoors, reduce strenuous outdoor
                  activities on unhealthy days, keep windows closed when pollution is
                  high, and consider wearing a well-fitted mask if exposure is
                  unavoidable.
                </p>
              </div>

              <div className="overview-item">
                <h4>04. Important reminder</h4>
                <p>
                  Pollution Control Hub provides environmental information to help you
                  make informed decisions. It is not a substitute for professional
                  medical advice or emergency healthcare.
                </p>
              </div>

            </div>
          </section>
        )}

        {activeTab === "faq" && (
          <section className="getting-started-section">
            <div className="overview-content">

              <div className="overview-item">
                <h4>01. Do I need an account to use Pollution Control Hub?</h4>
                <p>
                  No. Most features are available without creating an account, allowing you
                  to explore air quality information and educational resources immediately.
                </p>
              </div>

              <div className="overview-item">
                <h4>02. How often is air quality data updated?</h4>
                <p>
                  Air quality information is updated regularly based on the latest data
                  available from supported monitoring sources.
                </p>
              </div>

              <div className="overview-item">
                <h4>03. Why can AQI differ between nearby locations?</h4>
                <p>
                  Pollution levels can vary due to traffic, weather conditions,
                  industrial activity, vegetation, and other local environmental
                  factors.
                </p>
              </div>

              <div className="overview-item">
                <h4>04. Can I use this platform for medical advice?</h4>
                <p>
                  No. Pollution Control Hub provides environmental information to help
                  users understand air quality and should not replace professional
                  medical advice.
                </p>
              </div>

              <div className="overview-item">
                <h4>05. What should I do when the AQI is unhealthy?</h4>
                <p>
                  Limit prolonged outdoor activities, follow local health guidance,
                  monitor AQI updates, and take extra precautions if you are part of a
                  sensitive group.
                </p>
              </div>

              <div className="overview-item">
                <h4>06. What devices can I use to access Pollution Control Hub?</h4>
                <p>
                  Pollution Control Hub is designed to work in modern web browsers on
                  desktops, laptops, tablets, and mobile devices for easy access wherever
                  you are.
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