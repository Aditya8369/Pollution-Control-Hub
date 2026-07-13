import { useState } from "react";
import "./SunSafetyDashboard.css";

export default function SunSafetyDashboard() {
  const [showDetails, setShowDetails] = useState(false);

  const weather = {
    temperature: "34°C",
    uvIndex: 8,
    status: "Dangerous",
    feelsLike: "38°C",
  };

  return (
    <>
      <section
        className="sun-safety-card"
        onClick={() => setShowDetails(true)}
      >
        <div className="sun-header">
          <span className="sun-icon">☀️</span>
          <h2>Sun Safety Today</h2>
        </div>

        <div className="sun-info">
          <div className="sun-item">
            <h3>🌡 Temperature</h3>
            <p>{weather.temperature}</p>
          </div>

          <div className="sun-item">
            <h3>☀️ UV Index</h3>
            <p>{weather.uvIndex}</p>
          </div>

          <div className="sun-item full">
            <h3>🚶 Outdoor Status</h3>
            <span className="danger-badge">
              {weather.status}
            </span>
          </div>
        </div>

        <button className="know-btn">
          Know Today's Health Advice →
        </button>
      </section>

      {showDetails && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetails(false)}
        >
          <div
            className="health-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h2>☀️ Today's Health Advice</h2>

            <div className="modal-grid">
              <div>
                <strong>🌡 Temperature</strong>
                <p>{weather.temperature}</p>
              </div>

              <div>
                <strong>🥵 Feels Like</strong>
                <p>{weather.feelsLike}</p>
              </div>

              <div>
                <strong>☀️ UV Index</strong>
                <p>{weather.uvIndex}</p>
              </div>

              <div>
                <strong>🚨 Risk</strong>
                <p>{weather.status}</p>
              </div>
            </div>

            <ul className="tips">
              <li>💧 Drink plenty of water.</li>
              <li>🧴 Apply SPF 30+ sunscreen.</li>
              <li>🕶 Wear sunglasses outdoors.</li>
              <li>🧢 Wear a hat or use an umbrella.</li>
              <li>⏰ Avoid direct sunlight between 11 AM and 3 PM.</li>
              <li>👶 Children and elderly people should limit outdoor exposure.</li>
            </ul>

            <button
              className="close-btn"
              onClick={() => setShowDetails(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
