import React, { useState, useEffect, useCallback } from 'react';
import { eventBus } from '../core/events';
import { STATS_CHANGED_EVENT } from '../utils/contributionStats';

const DAILY_CHALLENGE_POOL = [
  { id: "public-transport", text: "Use public transport today", points: 10, type: "manual" },
  { id: "check-aqi", text: "Check AQI before your walk", points: 10, type: "manual" },
  { id: "reusable-bottle", text: "Carry a reusable water bottle today", points: 10, type: "manual" },
  { id: "avoid-plastic", text: "Avoid single-use plastic today", points: 10, type: "manual" },
  { id: "report-symptom", text: "Report a symptom today", points: 15, type: "auto", event: "SYMPTOM_REPORT_SUBMITTED" },
  { id: "submit-report", text: "Submit a community pollution report today", points: 15, type: "auto", event: "COMMUNITY_REPORT_SUBMITTED" }
];

const WEEKLY_CHALLENGE_POOL = [
  { id: "plan-routes", text: "Plan 5 clean commute routes this week", points: 50, type: "auto", event: "ROUTE_PLANNED", target: 5 },
  { id: "complete-dailies", text: "Complete 3 daily challenges this week", points: 40, type: "auto", event: "DAILY_CHALLENGE_COMPLETED", target: 3 },
  { id: "report-hotspots", text: "Report 3 pollution hotspots this week", points: 50, type: "auto", event: "COMMUNITY_REPORT_SUBMITTED", target: 3 }
];

const STORAGE_KEY = "pollution_hub_challenges_data";
const POINTS_KEY = "pollution_hub_total_points";

function getMonday(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(date.setDate(diff)).toDateString();
}

export default function ChallengesWidget() {
  const [activeTab, setActiveTab] = useState("daily");
  const [dailies, setDailies] = useState([]);
  const [weeklies, setWeeklies] = useState([]);
  const [points, setPoints] = useState(0);

  // Load points and active challenges from storage
  const loadChallenges = useCallback(() => {
    // Load points
    try {
      const storedPoints = localStorage.getItem(POINTS_KEY);
      setPoints(parseInt(storedPoints, 10) || 0);
    } catch {
      // ignore
    }

    const today = new Date().toDateString();
    const currentMonday = getMonday(new Date());
    let data = null;

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) data = JSON.parse(raw);
    } catch {
      // ignore
    }

    let updatedDailies = [];
    let updatedWeeklies = [];

    // Initialize/Load Daily Challenges
    if (data && data.assignedDate === today && Array.isArray(data.dailies)) {
      updatedDailies = data.dailies;
    } else {
      // Select 3 random daily challenges
      const pool = [...DAILY_CHALLENGE_POOL];
      while (updatedDailies.length < 3 && pool.length > 0) {
        const idx = Math.floor(Math.random() * pool.length);
        const challenge = pool.splice(idx, 1)[0];
        updatedDailies.push({ ...challenge, completed: false });
      }
    }

    // Initialize/Load Weekly Challenges
    if (data && data.weekStartDate === currentMonday && Array.isArray(data.weeklies)) {
      updatedWeeklies = data.weeklies;
    } else {
      // Load all weekly challenges
      updatedWeeklies = WEEKLY_CHALLENGE_POOL.map(c => ({
        ...c,
        current: 0,
        completed: false
      }));
    }

    setDailies(updatedDailies);
    setWeeklies(updatedWeeklies);

    // Save changes back
    saveToStorage(updatedDailies, updatedWeeklies, today, currentMonday);
  }, []);

  const saveToStorage = (newDailies, newWeeklies, todayDate, mondayDate) => {
    const today = todayDate || new Date().toDateString();
    const currentMonday = mondayDate || getMonday(new Date());
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        assignedDate: today,
        weekStartDate: currentMonday,
        dailies: newDailies,
        weeklies: newWeeklies
      }));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  // Award points and notify other components
  const awardPoints = useCallback((pointsToAward) => {
    setPoints(prevPoints => {
      const nextPoints = prevPoints + pointsToAward;
      try {
        localStorage.setItem(POINTS_KEY, nextPoints.toString());
      } catch {
        // ignore
      }
      // Notify leaderboard to update
      eventBus.emit(STATS_CHANGED_EVENT);
      return nextPoints;
    });
  }, []);

  // Completion logic for manual tasks
  const handleMarkComplete = (challengeId) => {
    const today = new Date().toDateString();
    const currentMonday = getMonday(new Date());

    let pointsAwarded = 0;
    const nextDailies = dailies.map(c => {
      if (c.id === challengeId && !c.completed) {
        pointsAwarded = c.points;
        eventBus.emit("CHALLENGE_COMPLETED", c);
        // Track daily challenge completion count for weekly challenge progress
        triggerWeeklyProgress("DAILY_CHALLENGE_COMPLETED");
        return { ...c, completed: true };
      }
      return c;
    });

    if (pointsAwarded > 0) {
      setDailies(nextDailies);
      awardPoints(pointsAwarded);
      saveToStorage(nextDailies, weeklies, today, currentMonday);
    }
  };

  // Progress update for weekly tasks
  const triggerWeeklyProgress = useCallback((eventKey, count = 1) => {
    setWeeklies(prevWeeklies => {
      let pointsAwarded = 0;
      const nextWeeklies = prevWeeklies.map(c => {
        if (c.event === eventKey && !c.completed) {
          const nextVal = Math.min(c.target, c.current + count);
          const isDone = nextVal >= c.target;
          if (isDone) {
            pointsAwarded = c.points;
            eventBus.emit("CHALLENGE_COMPLETED", c);
          }
          return { ...c, current: nextVal, completed: isDone };
        }
        return c;
      });

      if (pointsAwarded > 0) {
        awardPoints(pointsAwarded);
      }
      saveToStorage(dailies, nextWeeklies, new Date().toDateString(), getMonday(new Date()));
      return nextWeeklies;
    });
  }, [dailies, awardPoints]);

  // Hook event bus to handle auto completions
  useEffect(() => {
    const handleSymptomReported = () => {
      // Auto-complete daily
      setDailies(prevDailies => {
        let pointsAwarded = 0;
        const nextDailies = prevDailies.map(c => {
          if (c.event === "SYMPTOM_REPORT_SUBMITTED" && !c.completed) {
            pointsAwarded = c.points;
            eventBus.emit("CHALLENGE_COMPLETED", c);
            triggerWeeklyProgress("DAILY_CHALLENGE_COMPLETED");
            return { ...c, completed: true };
          }
          return c;
        });

        if (pointsAwarded > 0) awardPoints(pointsAwarded);
        saveToStorage(nextDailies, weeklies, new Date().toDateString(), getMonday(new Date()));
        return nextDailies;
      });
    };

    const handleCommunityReportSubmitted = () => {
      // Auto-complete daily
      setDailies(prevDailies => {
        let pointsAwarded = 0;
        const nextDailies = prevDailies.map(c => {
          if (c.event === "COMMUNITY_REPORT_SUBMITTED" && !c.completed) {
            pointsAwarded = c.points;
            eventBus.emit("CHALLENGE_COMPLETED", c);
            triggerWeeklyProgress("DAILY_CHALLENGE_COMPLETED");
            return { ...c, completed: true };
          }
          return c;
        });

        if (pointsAwarded > 0) awardPoints(pointsAwarded);
        saveToStorage(nextDailies, weeklies, new Date().toDateString(), getMonday(new Date()));
        return nextDailies;
      });

      // Progress weekly
      triggerWeeklyProgress("COMMUNITY_REPORT_SUBMITTED");
    };

    const handleQuizCompleted = (payload) => {
      if (payload?.percent === 100) {
        setDailies(prevDailies => {
          let pointsAwarded = 0;
          const nextDailies = prevDailies.map(c => {
            if (c.event === "QUIZ_COMPLETED_PERFECT" && !c.completed) {
              pointsAwarded = c.points;
              eventBus.emit("CHALLENGE_COMPLETED", c);
              triggerWeeklyProgress("DAILY_CHALLENGE_COMPLETED");
              return { ...c, completed: true };
            }
            return c;
          });

          if (pointsAwarded > 0) awardPoints(pointsAwarded);
          saveToStorage(nextDailies, weeklies, new Date().toDateString(), getMonday(new Date()));
          return nextDailies;
        });
      }
    };

    const handleRoutePlanned = () => {
      triggerWeeklyProgress("ROUTE_PLANNED");
    };

    eventBus.on("SYMPTOM_REPORT_SUBMITTED", handleSymptomReported);
    eventBus.on("COMMUNITY_REPORT_SUBMITTED", handleCommunityReportSubmitted);
    eventBus.on("QUIZ_COMPLETED", handleQuizCompleted);
    eventBus.on("ROUTE_PLANNED", handleRoutePlanned);

    return () => {
      eventBus.off("SYMPTOM_REPORT_SUBMITTED", handleSymptomReported);
      eventBus.off("COMMUNITY_REPORT_SUBMITTED", handleCommunityReportSubmitted);
      eventBus.off("QUIZ_COMPLETED", handleQuizCompleted);
      eventBus.off("ROUTE_PLANNED", handleRoutePlanned);
    };
  }, [weeklies, triggerWeeklyProgress, awardPoints]);

  return (
    <article className="kpi-card challenges-widget" data-testid="challenges-widget" style={{ padding: '1.25rem', borderRadius: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>🌱 Eco Challenges</h3>
        <span data-testid="challenge-points" style={{ fontSize: '0.9rem', fontWeight: 'bold', background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
          {points} pts
        </span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--line)', paddingBottom: '0.5rem' }}>
        <button
          type="button"
          data-testid="daily-tab-btn"
          onClick={() => setActiveTab("daily")}
          style={{
            flex: 1,
            padding: '0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === "daily" ? '2px solid var(--brand)' : 'none',
            color: activeTab === "daily" ? 'var(--ink)' : 'var(--muted)',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Daily
        </button>
        <button
          type="button"
          data-testid="weekly-tab-btn"
          onClick={() => setActiveTab("weekly")}
          style={{
            flex: 1,
            padding: '0.5rem',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === "weekly" ? '2px solid var(--brand)' : 'none',
            color: activeTab === "weekly" ? 'var(--ink)' : 'var(--muted)',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Weekly
        </button>
      </div>

      {/* Challenge List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {activeTab === "daily" ? (
          dailies.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--card-alt, rgba(0,0,0,0.02))', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--line)' }}>
              <div style={{ flex: 1, marginRight: '0.75rem' }}>
                <div style={{ fontWeight: '500', fontSize: '0.95rem', textDecoration: c.completed ? 'line-through' : 'none', color: c.completed ? 'var(--muted)' : 'var(--ink)' }}>
                  {c.text}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--brand)', marginTop: '0.2rem', fontWeight: 'bold' }}>
                  +{c.points} pts
                </div>
              </div>
              <div>
                {c.completed ? (
                  <span style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.1rem' }}>✔</span>
                ) : c.type === "manual" ? (
                  <button
                    type="button"
                    data-testid={`complete-${c.id}`}
                    onClick={() => handleMarkComplete(c.id)}
                    style={{ padding: '0.3rem 0.6rem', backgroundColor: 'var(--brand)', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer' }}
                  >
                    Done
                  </button>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--muted)', background: 'rgba(0,0,0,0.05)', padding: '0.2rem 0.4rem', borderRadius: '4px' }}>
                    Auto
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          weeklies.map(c => {
            const pct = Math.min(100, Math.round((c.current / c.target) * 100));
            return (
              <div key={c.id} style={{ display: 'flex', flexDirection: 'column', background: 'var(--card-alt, rgba(0,0,0,0.02))', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--line)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '500', fontSize: '0.95rem', textDecoration: c.completed ? 'line-through' : 'none', color: c.completed ? 'var(--muted)' : 'var(--ink)' }}>
                    {c.text}
                  </span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--brand)' }}>
                    +{c.points} pts
                  </span>
                </div>
                
                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', backgroundColor: c.completed ? '#16a34a' : 'var(--brand)', transition: 'width 0.3s ease' }} />
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: '600', minWidth: '2.5rem', textAlign: 'right' }}>
                    {c.completed ? "Done" : `${c.current}/${c.target}`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </article>
  );
}
