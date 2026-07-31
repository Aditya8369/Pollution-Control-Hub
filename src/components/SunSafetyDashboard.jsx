import { useState, useEffect } from "react";
import { fetchSunSafetyData } from "../services/airQualityService";

function getUVRisk(uvIndex) {
  if (uvIndex <= 2) return "Low";
  if (uvIndex <= 5) return "Moderate";
  if (uvIndex <= 7) return "High";
  if (uvIndex <= 10) return "Very High";

  return "Extreme";
}

function getRecommendations(uvIndex, temperature) {
  const recommendations = [];

  if (uvIndex >= 3) {
    recommendations.push(
      "Use sunscreen and wear protective clothing when outdoors."
    );
  }

  if (uvIndex >= 6) {
    recommendations.push(
      "Avoid prolonged outdoor exposure during high UV levels."
    );
  }

  if (temperature >= 30) {
    recommendations.push(
      "Stay hydrated and take breaks in shaded or cool areas."
    );
  }

  if (temperature >= 35) {
    recommendations.push(
      "Children and older adults should take extra precautions in the heat."
    );
  }

  if (recommendations.length === 0) {
    recommendations.push(
      "Conditions are relatively safe. Basic sun protection is still recommended."
    );
  }

  return recommendations;
}

export default function SunSafetyDashboard({ lat, lon }) {
  const [showSafetyDetails, setShowSafetyDetails] = useState(false);
  const [sunData, setSunData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (typeof lat !== "number" || typeof lon !== "number") return;

    let isMounted = true;
    const controller = new AbortController();
    setLoading(true);
    setError(false);

    fetchSunSafetyData(lat, lon, controller.signal)
      .then((result) => {
        if (!isMounted) return;
        if (result) {
          setSunData(result);
        } else {
          setError(true);
        }
        setLoading(false);
      })
      .catch(() => {
        if (isMounted) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [lat, lon]);

  const temperature = sunData?.temperature ?? null;
  const feelsLike = sunData?.feelsLike ?? null;
  const uvIndex = sunData?.uvIndex ?? null;

  const riskLevel = uvIndex !== null ? getUVRisk(uvIndex) : null;
  const recommendations =
    uvIndex !== null ? getRecommendations(uvIndex, temperature) : [];

  return (
    <section className="panel sun-safety-dashboard">
      <div className="panel-head sun-safety-header">
        <div>
          <h2>🌞 Sun Safety & UV Health Advisor</h2>
          <p>
            Check today's heat and UV conditions and get simple safety
            recommendations.
          </p>
        </div>

        <button
          type="button"
          className="sun-safety-button"
          onClick={() => setShowSafetyDetails((previous) => !previous)}
          aria-expanded={showSafetyDetails}
        >
          {showSafetyDetails
            ? "Hide Sun Safety"
            : "Check Today's Sun Safety"}
        </button>
      </div>

      {showSafetyDetails && (
        <>
          {loading && (
            <div className="sun-safety-loading">
              <div className="loading-spinner" />
              <p>Fetching live UV and weather data...</p>
            </div>
          )}

          {!loading && error && (
            <p className="sun-safety-disclaimer">
              Unable to load live UV and weather data right now. Please try again later.
            </p>
          )}

          {!loading && !error && sunData && (
            <>
              <div className="sun-safety-metrics">
                <article className="sun-safety-card">
                  <span className="sun-safety-icon">🌡️</span>
                  <h3>Temperature</h3>
                  <div className="sun-safety-value">{temperature}°C</div>
                  <p>Current temperature</p>
                </article>

                <article className="sun-safety-card">
                  <span className="sun-safety-icon">☀️</span>
                  <h3>Feels Like</h3>
                  <div className="sun-safety-value">{feelsLike}°C</div>
                  <p>Perceived outdoor temperature</p>
                </article>

                <article className="sun-safety-card">
                  <span className="sun-safety-icon">🔆</span>
                  <h3>UV Index</h3>
                  <div className="sun-safety-value">{uvIndex}</div>
                  <p>Current UV exposure level</p>
                </article>

                <article className="sun-safety-card">
                  <span className="sun-safety-icon">🛡️</span>
                  <h3>Risk Level</h3>
                  <div className="sun-safety-risk">{riskLevel}</div>
                  <p>Based on today's UV index</p>
                </article>
              </div>

              <div className="sun-safety-recommendations">
                <h3>Recommended Precautions</h3>

                <ul>
                  {recommendations.map((recommendation) => (
                    <li key={recommendation}>{recommendation}</li>
                  ))}
                </ul>

                <p className="sun-safety-disclaimer">
                  General environmental health guidance only. Follow local health
                  advice when conditions are severe.
                </p>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}