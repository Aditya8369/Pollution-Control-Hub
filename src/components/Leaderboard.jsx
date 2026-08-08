import { useState, useEffect } from "react";

// Point breakdown constants matching issue requirements
const POINT_SYSTEM = [
  { action: "Verified Report Submitted", points: 50, badge: "🛡️ Verified" },
  { action: "New Report Submitted", points: 10, badge: "📝 Contributor" },
  { action: "Quiz Answer Completed", points: 1, badge: "🧠 Learner" },
];

const INITIAL_MOCK_LEADERBOARD = [
  { id: 1, name: "Aarav Sharma", points: 420, reports: 6, verified: 5, quizzes: 70, avatar: "👨‍💻" },
  { id: 2, name: "Ananya Patel", points: 365, reports: 8, verified: 4, quizzes: 65, avatar: "👩‍🔬" },
  { id: 3, name: "Rohan Gupta", points: 290, reports: 5, verified: 3, quizzes: 40, avatar: "🌱" },
  { id: 4, name: "Priya Singh", points: 215, reports: 4, verified: 2, quizzes: 15, avatar: "🛰️" },
  { id: 5, name: "Vikram Verma", points: 180, reports: 3, verified: 2, quizzes: 30, avatar: "🚴" },
];

const USER_STORAGE_KEY = "pollution-hub-user-points";

export default function Leaderboard() {
  const [userStats, setUserStats] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved
        ? JSON.parse(saved)
        : { name: "You (Guest)", points: 125, reports: 2, verified: 1, quizzes: 55, avatar: "🌟" };
    } catch {
      return { name: "You (Guest)", points: 125, reports: 2, verified: 1, quizzes: 55, avatar: "🌟" };
    }
  });

  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    // Combine user stats with community leaderboard and rank by total points
    const combined = [...INITIAL_MOCK_LEADERBOARD, { ...userStats, isCurrentUser: true }];
    combined.sort((a, b) => b.points - a.points);
    setLeaderboard(combined);
  }, [userStats]);

  const currentUserRank = leaderboard.findIndex((item) => item.isCurrentUser) + 1;

  // Handler to simulate point earning for testing UI updates
  const addPoints = (amount, type) => {
    setUserStats((prev) => {
      const updated = {
        ...prev,
        points: prev.points + amount,
        reports: type === "report" ? prev.reports + 1 : prev.reports,
        verified: type === "verified" ? prev.verified + 1 : prev.verified,
        quizzes: type === "quiz" ? prev.quizzes + 1 : prev.quizzes,
      };
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

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
          <span style={{ fontSize: "2.5rem" }}>{userStats.avatar}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--ink, #f8fafc)" }}>
              {userStats.name} <span style={{ fontSize: "0.8rem", color: "var(--brand, #0d9488)", background: "rgba(13, 148, 136, 0.15)", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>Current User</span>
            </h3>
            <p style={{ margin: "0.25rem 0 0 0", color: "var(--muted, #94a3b8)", fontSize: "0.9rem" }}>
              {userStats.verified} Verified Reports • {userStats.reports} Submissions • {userStats.quizzes} Quizzes Answered
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Your Rank</span>
            <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--sky, #38bdf8)" }}>#{currentUserRank}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Total Points</span>
            <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#f59e0b" }}>{userStats.points} pts</div>
          </div>
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
            {leaderboard.map((user, idx) => {
              const rank = idx + 1;
              const isTop3 = rank <= 3;
              const badge = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

              return (
                <tr
                  key={user.name}
                  style={{
                    borderBottom: "1px solid var(--line)",
                    backgroundColor: user.isCurrentUser ? "rgba(13, 148, 136, 0.08)" : "transparent",
                    fontWeight: user.isCurrentUser ? "bold" : "normal"
                  }}
                >
                  <td style={{ padding: "0.85rem 0.5rem", fontSize: "1.1rem" }}>{badge}</td>
                  <td style={{ padding: "0.85rem 0.5rem" }}>
                    <span style={{ marginRight: "0.5rem" }}>{user.avatar}</span>
                    {user.name}
                    {user.isCurrentUser && <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "var(--brand)" }}>(You)</span>}
                  </td>
                  <td style={{ padding: "0.85rem 0.5rem" }}>{user.verified}</td>
                  <td style={{ padding: "0.85rem 0.5rem" }}>{user.reports}</td>
                  <td style={{ padding: "0.85rem 0.5rem" }}>{user.quizzes}</td>
                  <td style={{ padding: "0.85rem 0.5rem", textAlign: "right", fontWeight: "bold", color: isTop3 ? "#f59e0b" : "var(--ink)" }}>
                    {user.points} pts
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Developer Action Simulator for Testing */}
      <div style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px dashed var(--line)", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Simulate Action:</span>
        <button type="button" className="btn-secondary text-sm" style={{ padding: "0.25rem 0.6rem" }} onClick={() => addPoints(10, "report")}>+10 New Report</button>
        <button type="button" className="btn-secondary text-sm" style={{ padding: "0.25rem 0.6rem" }} onClick={() => addPoints(50, "verified")}>+50 Verified Report</button>
        <button type="button" className="btn-secondary text-sm" style={{ padding: "0.25rem 0.6rem" }} onClick={() => addPoints(1, "quiz")}>+1 Quiz Answer</button>
      </div>
    </section>
  );
}
