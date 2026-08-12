import { useState, useEffect, useMemo, useCallback } from "react";
import { eventBus } from "../core/events";
import {
  readContributionStats,
  recordQuizAnswers,
  POINT_VALUES,
  STATS_CHANGED_EVENT,
} from "../utils/contributionStats";

// Point breakdown constants matching issue requirements. The weights come from
// the scoring module so the table and the arithmetic cannot drift apart.
const POINT_SYSTEM = [
  { action: "Verified Report Submitted", points: POINT_VALUES.verifiedReport, badge: "🛡️ Verified" },
  { action: "New Report Submitted", points: POINT_VALUES.report, badge: "📝 Contributor" },
  { action: "Quiz Answer Completed", points: POINT_VALUES.quizAnswer, badge: "🧠 Learner" },
];

/**
 * Illustrative entries, so the board is not empty on a fresh install.
 *
 * Flagged as samples and labelled as such in the table. They are not real people
 * and the panel should not imply they are — the visitor's own row is the only one
 * carrying real numbers until there is a backend behind this (#152).
 */
const SAMPLE_CONTRIBUTORS = [
  { id: "sample-1", name: "Aarav Sharma", points: 420, reports: 6, verified: 5, quizzes: 70, avatar: "👨‍💻", isSample: true },
  { id: "sample-2", name: "Ananya Patel", points: 365, reports: 8, verified: 4, quizzes: 65, avatar: "👩‍🔬", isSample: true },
  { id: "sample-3", name: "Rohan Gupta", points: 290, reports: 5, verified: 3, quizzes: 40, avatar: "🌱", isSample: true },
  { id: "sample-4", name: "Priya Singh", points: 215, reports: 4, verified: 2, quizzes: 15, avatar: "🛰️", isSample: true },
  { id: "sample-5", name: "Vikram Verma", points: 180, reports: 3, verified: 2, quizzes: 30, avatar: "🚴", isSample: true },
];

export default function Leaderboard() {
  // Derived from what the app recorded, not from a seed. A visitor who has done
  // nothing sees zeros.
  const [stats, setStats] = useState(() => readContributionStats());

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

  const userRow = useMemo(
    () => ({
      id: "current-user",
      name: "You (Guest)",
      avatar: "🌟",
      isCurrentUser: true,
      ...stats,
    }),
    [stats]
  );

  const leaderboard = useMemo(
    () => [...SAMPLE_CONTRIBUTORS, userRow].sort((a, b) => b.points - a.points),
    [userRow]
  );

  const currentUserRank = leaderboard.findIndex((item) => item.isCurrentUser) + 1;

  // Dev-only seeding, so the ranking can be exercised without filing real reports.
  // It writes through the same recording path as the app, rather than inventing a
  // separate total — and it is not present in a production build.
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
          <span style={{ fontSize: "2.5rem" }}>{userRow.avatar}</span>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--ink, #f8fafc)" }}>
              {userRow.name} <span style={{ fontSize: "0.8rem", color: "var(--brand, #0d9488)", background: "rgba(13, 148, 136, 0.15)", padding: "0.2rem 0.5rem", borderRadius: "999px" }}>Current User</span>
            </h3>
            <p data-testid="leaderboard-user-summary" style={{ margin: "0.25rem 0 0 0", color: "var(--muted, #94a3b8)", fontSize: "0.9rem" }}>
              {stats.verified} Verified Reports • {stats.reports} Submissions • {stats.quizzes} Quizzes Answered
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: "1.5rem", alignItems: "center" }}>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Your Rank</span>
            {/* findIndex returns -1 before the list exists, which rendered "#0". */}
            <div data-testid="leaderboard-user-rank" style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--sky, #38bdf8)" }}>
              {currentUserRank > 0 ? `#${currentUserRank}` : "—"}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "var(--muted)", letterSpacing: "0.05em" }}>Total Points</span>
            <div data-testid="leaderboard-user-points" style={{ fontSize: "1.75rem", fontWeight: "bold", color: "#f59e0b" }}>{userRow.points} pts</div>
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
                  key={user.id}
                  data-testid={user.isCurrentUser ? "leaderboard-user-row" : undefined}
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
                    {user.isSample && (
                      <span style={{ marginLeft: "0.5rem", fontSize: "0.7rem", color: "var(--muted)", border: "1px solid var(--line)", padding: "0.1rem 0.35rem", borderRadius: "999px" }}>
                        sample
                      </span>
                    )}
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

      <p style={{ marginTop: "1.5rem", fontSize: "0.8rem", color: "var(--muted)" }}>
        Your figures come from the reports you've filed and the quizzes you've
        answered on this device. The other contributors are sample data — there is no
        shared backend behind this board yet.
      </p>

      {/* Dev-only. Shipping this to production let any visitor click their way up
          the ranking, which — together with the seeded starting figures — meant no
          number on this panel corresponded to anything. */}
      {isDev && (
        <div data-testid="leaderboard-dev-tools" style={{ marginTop: "2rem", paddingTop: "1rem", borderTop: "1px dashed var(--line)", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.8rem", color: "var(--muted)" }}>Dev only:</span>
          <button type="button" className="btn-secondary text-sm" style={{ padding: "0.25rem 0.6rem" }} onClick={simulateQuiz}>
            Record 10 quiz answers
          </button>
        </div>
      )}
    </section>
  );
}
