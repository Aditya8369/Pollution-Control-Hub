import React, { useState, useEffect } from 'react';
import { eventBus } from '../core/events';

const CHALLENGES = [
  "Use public transport today",
  "Check AQI before your walk",
  "Carry a reusable water bottle",
  "Switch off unused lights",
  "Walk or cycle for a short trip",
  "Plant or water a tree",
  "Avoid single-use plastic today"
];

const LOCAL_STORAGE_KEY = "pollution_hub_daily_challenge";
const POINTS_KEY = "pollution_hub_total_points";

export default function ChallengesWidget() {
  const [challenge, setChallenge] = useState("");
  const [completed, setCompleted] = useState(false);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    // Load points
    try {
      const storedPoints = localStorage.getItem(POINTS_KEY);
      if (storedPoints) {
        setPoints(parseInt(storedPoints, 10) || 0);
      }
    } catch (e) {
      console.warn("Failed to read points from localStorage", e);
    }

    // Load challenge
    const today = new Date().toDateString();
    let currentData = null;

    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        currentData = JSON.parse(raw);
      }
    } catch (e) {
      console.warn("Failed to read challenge from localStorage", e);
    }

    if (currentData && currentData.assignedDate === today) {
      setChallenge(currentData.currentChallenge);
      setCompleted(currentData.completed || false);
    } else {
      // Assign new challenge
      const randomChallenge = CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)];
      setChallenge(randomChallenge);
      setCompleted(false);

      const newData = {
        currentChallenge: randomChallenge,
        assignedDate: today,
        completed: false
      };

      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newData));
      } catch (e) {
        console.warn("Failed to write challenge to localStorage", e);
      }
    }
  }, []);

  const handleMarkComplete = () => {
    completeChallenge();
  };

  function completeChallenge() {
    if (completed) return;

    setCompleted(true);

    // Update points
    const newPoints = points + 10;
    setPoints(newPoints);

    // Update local storage
    try {
      localStorage.setItem(POINTS_KEY, newPoints.toString());

      const today = new Date().toDateString();
      const updatedData = {
        currentChallenge: challenge,
        assignedDate: today,
        completed: true
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedData));
    } catch (e) {
      console.warn("Failed to update challenge status in localStorage", e);
    }
  }

  // Connects to the Eco Impact Dashboard (src/utils/ecoImpactStore.js): logging a
  // trip that matches today's assigned challenge (e.g. "Use public transport
  // today" + a logged public-transport trip) auto-completes it instead of making
  // the user separately click "Mark Complete" for something they already did.
  useEffect(() => {
    function handleEcoTripLogged(trip) {
      if (!challenge || completed || !trip) return;
      const text = challenge.toLowerCase();
      const isPublicTransportMatch = trip.type === "publicTransport" && text.includes("public transport");
      const isWalkOrCycleMatch =
        (trip.type === "cycling" || trip.type === "carAvoided") &&
        (text.includes("cycle") || text.includes("walk"));

      if (isPublicTransportMatch || isWalkOrCycleMatch) {
        completeChallenge();
      }
    }

    eventBus.on("ECO_TRIP_LOGGED", handleEcoTripLogged);
    return () => eventBus.off("ECO_TRIP_LOGGED", handleEcoTripLogged);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- completeChallenge
    // closes over challenge/completed/points, which are already in this array.
  }, [challenge, completed, points]);

  return (
    <article className="kpi-card challenges-widget" data-testid="challenges-widget">
      <h3>🌱 Daily Challenge</h3>

      <div style={{ marginTop: '1rem', marginBottom: '1.5rem', minHeight: '3rem' }}>
        <p style={{ fontSize: '1.1rem', fontWeight: '500', color: 'var(--ink)' }}>
          {challenge || "Loading challenge..."}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {completed ? (
          <div style={{
            padding: '0.75rem',
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            borderRadius: '6px',
            textAlign: 'center',
            fontWeight: '600',
            border: '1px solid #bbf7d0'
          }}>
            ✔ Challenge Completed
          </div>
        ) : (
          <button
            type="button"
            onClick={handleMarkComplete}
            disabled={!challenge}
            style={{
              padding: '0.75rem 1rem',
              backgroundColor: 'var(--brand)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: challenge ? 'pointer' : 'not-allowed',
              opacity: challenge ? 1 : 0.7
            }}
          >
            Mark Complete
          </button>
        )}

        <div style={{
          textAlign: 'center',
          fontSize: '0.95rem',
          fontWeight: '600',
          color: 'var(--muted)'
        }}>
          Points: <span data-testid="challenge-points">{points}</span>
        </div>
      </div>
    </article>
  );
}
