import { useState, useEffect, useMemo, useCallback } from "react";
import { eventBus } from "../core/events";
import { useAuth } from "../context/AuthContext";
import {
  readContributionStats,
  recordQuizAnswers,
  POINT_VALUES,
  STATS_CHANGED_EVENT,
} from "../utils/contributionStats";

const POINT_SYSTEM = [
  { action: "Verified Report Submitted", points: POINT_VALUES.verifiedReport, badge: "🛡️ Verified" },
  { action: "New Report Submitted", points: POINT_VALUES.report, badge: "📝 Contributor" },
  { action: "Quiz Answer Completed", points: POINT_VALUES.quizAnswer, badge: "🧠 Learner" },
];

const SAMPLE_CONTRIBUTORS = [
  { id: "sample-1", name: "Aarav Sharma", points: 420, reports: 6, verified: 5, quizzes: 70, avatar: "👨‍💻", isSample: true },
  { id: "sample-2", name: "Ananya Patel", points: 365, reports: 8, verified: 4, quizzes: 65, avatar: "👩‍🔬", isSample: true },
  { id: "sample-3", name: "Rohan Gupta", points: 290, reports: 5, verified: 3, quizzes: 40, avatar: "🌱", isSample: true },
  { id: "sample-4", name: "Priya Singh", points: 215, reports: 4, verified: 2, quizzes: 15, avatar: "🛰️", isSample: true },
  { id: "sample-5", name: "Vikram Verma", points: 180, reports: 3, verified: 2, quizzes: 30, avatar: "🚴", isSample: true },
];

const AVATAR_OPTIONS = ["🌟", "👨‍💻", "👩‍🔬", "🌱", "🚴", "🛰️", "🐱", "🐼", "🦊", "🚀"];
const LEADERBOARD_DB_KEY = "pollution_hub_leaderboard_db";

export default function Leaderboard() {
  const auth = useAuth() || { user: null, isAuthenticated: false, login: () => {}, logout: () => {} };
  const { user, isAuthenticated, login, logout } = auth;
  const [stats, setStats] = useState(() => readContributionStats());
  
  // Registration Form State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regAvatar, setRegAvatar] = useState(AVATAR_OPTIONS[0]);
  const [regError, setRegError] = useState("");

  const refresh = useCallback(() => setStats(readContributionStats()), []);

  useEffect(() => {
    refresh();
    eventBus.on(STATS_CHANGED_EVENT, refresh);
    eventBus.on("COMMUNITY_REPORT_SUBMITTED", refresh);

    return () => {
      eventBus.off(STATS_CHANGED_EVENT, refresh);
      eventBus.off("COMMUNITY_REPORT_SUBMITTED", refresh);
    };
  }, [refresh]);

  // Synchronize score with the leaderboard database
  const getLeaderboardData = useCallback(() => {
    let db = [];
    try {
      const raw = localStorage.getItem(LEADERBOARD_DB_KEY);
      if (raw) db = JSON.parse(raw);
    } catch {
      // ignore
    }

    if (isAuthenticated && user) {
      // Find or update the user's score in the database
      const existingUserIdx = db.findIndex(u => u.email === user.email);
      const userRecord = {
        id: user.email,
        name: user.name,
        email: user.email,
        avatar: user.avatar || "🌟",
        points: stats.points,
        reports: stats.reports,
        verified: stats.verified,
        quizzes: stats.quizzes,
        isCurrentUser: true
      };

      if (existingUserIdx >= 0) {
        db[existingUserIdx] = userRecord;
      } else {
        db.push(userRecord);
      }

      try {
        localStorage.setItem(LEADERBOARD_DB_KEY, JSON.stringify(db));
      } catch {
        // ignore
      }
    }

    // Filter out mock/sample users from DB, keeping only real authenticated users
    const realUsers = db.map(u => ({
      ...u,
      isCurrentUser: user ? u.email === user.email : false
    }));

    // Combine real authenticated users with samples
    const combined = [...SAMPLE_CONTRIBUTORS];
    realUsers.forEach(u => {
      const dupIdx = combined.findIndex(c => c.id === u.id || c.name === u.name);
      if (dupIdx >= 0) combined[dupIdx] = u;
      else combined.push(u);
    });

    // If user is guest/unauthenticated, we still append their local user row as a guest
    if (!isAuthenticated) {
      combined.push({
        id: "current-user-guest",
        name: "You (Guest)",
        avatar: "🌟",
        points: stats.points,
        reports: stats.reports,
        verified: stats.verified,
        quizzes: stats.quizzes,
        isCurrentUser: true,
        isGuest: true
      });
    }

    return combined.sort((a, b) => b.points - a.points);
  }, [isAuthenticated, user, stats]);

  const leaderboard = useMemo(() => getLeaderboardData(), [getLeaderboardData]);

  const currentUserRank = useMemo(() => {
    return leaderboard.findIndex(item => item.isCurrentUser) + 1;
  }, [leaderboard]);

  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    setRegError("");

    if (!regName.trim()) {
      setRegError("Please enter your name.");
      return;
    }
    if (!regEmail.trim() || !regEmail.includes("@")) {
      setRegError("Please enter a valid email address.");
      return;
    }

    login({
      name: regName.trim(),
      email: regEmail.trim(),
      avatar: regAvatar
    });

    setShowRegisterModal(false);
  };

  const isDev = Boolean(import.meta.env?.DEV);
  const simulateQuiz = () => recordQuizAnswers(10);

  return (
    <section data-testid="leaderboard-page" className="panel leaderboard-panel">
      <div className="panel-head" style={{ marginBottom: "1.5rem" }}>
        <h2>🏆 Contributor Leaderboard</h2>
        <p>Recognizing community members driving environmental action through reports and participation.</p>
      </div>

      {/* User Current Point Total & Rank Card */}
      <div
        className="kpi-card user-profile-rank-card"
        style={{
          background: "linear-gradient(135deg, var(--card, #1e293b), var(--bg-card-alt, #0f172a))",
          border: "2px solid var(--brand, #0d9488)",
          borderRadius: "0.75rem",
          padding: "1.25rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "2.5rem" }}>{isAuthenticated && user ? user.avatar : "🌟"}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--ink)" }}>
              {isAuthenticated && user ? user.name : "You (Guest)"}
              {isAuthenticated ? (
                <span style={{ fontSize: "0.75rem", color: "var(--brand)", background: "rgba(13, 148, 136, 0.15)", padding: "0.2rem 0.5rem", borderRadius: "999px", marginLeft: "0.5rem" }}>Registered</span>
              ) : (
                <button
                  type="button"
                  data-testid="join-leaderboard-btn"
                  onClick={() => setShowRegisterModal(true)}
                  style={{
                    fontSize: "0.75rem",
                    color: "white",
                    background: "var(--brand, #0d9488)",
                    padding: "0.2rem 0.6rem",
                    borderRadius: "999px",
                    marginLeft: "0.5rem",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Join Board / Log In
                </button>
              )}
            </h3>
            <p data-testid="leaderboard-user-summary" style={{ margin: "0.25rem 0 0 0", color: "var(--muted)", fontSize: "0.9rem" }}>
              {stats.verified} Verified Reports • {stats.reports} Submissions • {stats.quizzes} Quizzes Answered
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Your Rank</span>
            <div data-testid="leaderboard-user-rank" style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--sky, #38bdf8)" }}>
              {currentUserRank > 0 ? `#${currentUserRank}` : "—"}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Total Points</span>
            <div data-testid="leaderboard-user-points" style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#f59e0b" }}>{stats.points} pts</div>
          </div>
          {isAuthenticated && (
            <button
              type="button"
              data-testid="leaderboard-signout-btn"
              onClick={logout}
              style={{
                padding: "0.35rem 0.75rem",
                backgroundColor: "transparent",
                color: "#dc2626",
                border: "1px solid #dc2626",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.8rem"
              }}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {/* Point Scoring Rules Breakdown */}
      <div style={{ marginBottom: "2rem", background: "var(--card)", padding: "1rem 1.25rem", borderRadius: "0.5rem", border: "1px solid var(--line)" }}>
        <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem", color: "var(--muted)" }}>⚡ How to Earn Points</h4>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          {POINT_SYSTEM.map((rule) => (
            <div key={rule.action} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
              <span style={{ fontWeight: "bold", color: "var(--brand)" }}>+{rule.points} pts</span>
              <span style={{ color: "var(--ink)" }}>{rule.action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Ranked Leaderboard Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid var(--line)", color: "var(--muted)", fontSize: "0.85rem" }}>
              <th style={{ padding: "0.75rem 0.5rem" }}>Rank</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Contributor</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Verified Reports (+50)</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Submissions (+10)</th>
              <th style={{ padding: "0.75rem 0.5rem" }}>Quizzes (+1)</th>
              <th style={{ padding: "0.75rem 0.5rem", textAlign: "right" }}>Total Points</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((userRow, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              const badge = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

              return (
                <tr
                  key={userRow.id}
                  data-testid={userRow.isCurrentUser ? "leaderboard-user-row" : undefined}
                  style={{
                    borderBottom: "1px solid var(--line)",
                    backgroundColor: userRow.isCurrentUser ? "rgba(13, 148, 136, 0.08)" : "transparent",
                    fontWeight: userRow.isCurrentUser ? "bold" : "normal"
                  }}
                >
                  <td style={{ padding: "0.85rem 0.5rem", fontSize: "1.1rem" }}>{badge}</td>
                  <td style={{ padding: "0.85rem 0.5rem" }}>
                    <span style={{ marginRight: "0.5rem" }}>{userRow.avatar}</span>
                    {userRow.name}
                    {userRow.isCurrentUser && <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "var(--brand)" }}>(You)</span>}
                    {userRow.isSample && (
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", color: "var(--muted)", border: "1px solid var(--line)", padding: "0.1rem 0.35rem", borderRadius: "999px" }}>
                        sample
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "0.85rem 0.5rem" }}>{userRow.verified}</td>
                  <td style={{ padding: "0.85rem 0.5rem" }}>{userRow.reports}</td>
                  <td style={{ padding: "0.85rem 0.5rem" }}>{userRow.quizzes}</td>
                  <td style={{ padding: "0.85rem 0.5rem", textAlign: "right", fontWeight: "bold", color: isTop3 ? "#f59e0b" : "var(--ink)" }}>
                    {userRow.points} pts
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--muted)" }}>
        Your figures come from the reports you've filed and the quizzes you've
        answered on this device.
      </p>

      {/* Dev-only simulation */}
      {isDev && (
        <div data-testid="leaderboard-dev-tools" style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px dashed var(--line)", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Dev only:</span>
          <button type="button" className="btn-secondary text-sm" style={{ padding: "0.25rem 0.6rem" }} onClick={simulateQuiz}>
            Record 10 quiz answers
          </button>
        </div>
      )}

      {/* Registration Modal Overlay */}
      {showRegisterModal && (
        <div
          data-testid="register-modal"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000
          }}
        >
          <div
            style={{
              backgroundColor: "var(--card, #1e293b)",
              border: "1px solid var(--line)",
              borderRadius: "0.75rem",
              padding: "2rem",
              maxWidth: "400px",
              width: "90%",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0", color: "var(--ink)" }}>Create Contributor Profile</h3>
            
            <form onSubmit={handleRegisterSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {regError && (
                <div style={{ color: "#ef4444", fontSize: "0.85rem", fontWeight: "600" }}>{regError}</div>
              )}

              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                Name
                <input
                  type="text"
                  placeholder="e.g. Aarav Sharma"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "4px", backgroundColor: "var(--bg)" }}
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.85rem" }}>
                Email
                <input
                  type="email"
                  placeholder="e.g. aarav@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  style={{ padding: "0.5rem", border: "1px solid var(--line)", borderRadius: "4px", backgroundColor: "var(--bg)" }}
                />
              </label>

              <div style={{ fontSize: "0.85rem" }}>
                Choose Avatar
                <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
                  {AVATAR_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setRegAvatar(emoji)}
                      style={{
                        fontSize: "1.5rem",
                        padding: "0.25rem",
                        background: regAvatar === emoji ? "rgba(13, 148, 136, 0.2)" : "transparent",
                        border: regAvatar === emoji ? "2px solid var(--brand)" : "1px solid transparent",
                        borderRadius: "6px",
                        cursor: "pointer"
                      }}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  style={{ flex: 1, padding: "0.5rem", backgroundColor: "transparent", border: "1px solid var(--line)", borderRadius: "6px", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  data-testid="submit-register"
                  style={{ flex: 1, padding: "0.5rem", backgroundColor: "var(--brand)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}
                >
                  Sign In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
