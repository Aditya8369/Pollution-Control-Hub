import { useEffect, useState } from "react";

const STORAGE_KEY = "pollution-community-reports";
const VOTE_THRESHOLD = 5;
const X_DAYS = 7;

function readReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export default function CommunityHub() {
  const [reports, setReports] = useState(() => readReports());
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState({
    title: "",
    description: "",
    image: "",
  });
  const [fileInputKey, setFileInputKey] = useState(Date.now());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
  }, [reports]);

  const onSubmit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    const newReport = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image,
      votes: 0,
      createdAt: new Date().toISOString(),
      status: "Pending",
      verifiedAt: "",
      moderationNotes: "",
    };

    setReports((prev) => [newReport, ...prev]);
    setForm({ title: "", description: "", image: "" });
    setFileInputKey(Date.now());
  };

  const uploadImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, image: String(reader.result) }));
    };
    reader.readAsDataURL(file);
  };

  const vote = (id) => {
    setReports((prev) =>
      prev.map((report) => {
        if (report.id !== id) return report;

        const nextVotes = report.votes + 1;
        const createdDate = new Date(report.createdAt);
        const ageInDays = (new Date() - createdDate) / (1000 * 60 * 60 * 24);

        let updatedStatus = report.status;
        let verifiedAtTimestamp = report.verifiedAt;
        let notes = report.moderationNotes;

        if (
          nextVotes >= VOTE_THRESHOLD &&
          ageInDays <= X_DAYS &&
          report.status === "Pending"
        ) {
          updatedStatus = "Verified (community)";
          verifiedAtTimestamp = new Date().toISOString();
          notes = "Automatically verified via community consensus upvotes.";
        }

        return {
          ...report,
          votes: nextVotes,
          status: updatedStatus,
          verifiedAt: verifiedAtTimestamp,
          moderationNotes: notes,
        };
      }),
    );
  };

  const filteredReports = reports.filter((report) => {
    if (filter === "All") return true;
    if (filter === "Verified") return report.status.startsWith("Verified");
    return report.status === filter;
  });

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Community Contribution</h2>
        <p>Report local pollution issues with evidence and crowd voting</p>
      </div>

      <form className="community-form" onSubmit={onSubmit}>
        <input
          type="text"
          value={form.title}
          placeholder="Issue title (e.g., Garbage burning)"
          onChange={(event) =>
            setForm((prev) => ({ ...prev, title: event.target.value }))
          }
        />
        <textarea
          value={form.description}
          placeholder="Describe location and issue details"
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
        />
        <input
          key={fileInputKey}
          type="file"
          accept="image/*"
          onChange={uploadImage}
        />
        <button type="submit">Submit Report</button>
      </form>

   <div
  className="filter-tabs"
  style={{
    display: "flex",
    gap: "12px",
    margin: "20px 0",
    flexWrap: "wrap",
  }}
>
  {["All", "Pending", "Verified", "Addressed"].map((statusOption) => (
    <button
      key={statusOption}
      type="button"
      onClick={() => setFilter(statusOption)}
      style={{
        padding: "8px 15px",
        borderRadius: "10px",
        border: filter === statusOption ? "2px solid #0077b6" : "2px solid #dcdcdc",
        backgroundColor:
          filter === statusOption ? "#0077b6" : "#ffffff",
        color: filter === statusOption ? "#ffffff" : "#333333",
        cursor: "pointer",
        fontWeight: filter === statusOption ? "600" : "500",
        fontSize: "15px",
        transition: "all 0.3s ease",
        boxShadow:
          filter === statusOption
            ? "0 4px 12px rgba(0,119,182,0.3)"
            : "0 2px 6px rgba(0,0,0,0.08)",
      }}
    >
      {statusOption}
    </button>
  ))}
</div>

      <div className="report-feed">
        {filteredReports.length === 0 ? (
          <p>No reports yet. Be the first to raise an issue.</p>
        ) : (
          filteredReports.map((report) => (
            <article className="report-card" key={report.id}>
              <div className="report-head">
                <div className="report-title-container">
                  <h3>{report.title}</h3>
                  <span className="status-badge">{report.status}</span>
                </div>
                <button onClick={() => vote(report.id)} type="button">
                  Upvote ({report.votes})
                </button>
              </div>
              <p>{report.description}</p>
              {report.image && <img src={report.image} alt={report.title} />}

              <div className="timeline-workflow">
                <span>Created</span>
                <span
                  className={
                    report.status.startsWith("Verified") ||
                    report.status === "Addressed"
                      ? "active"
                      : "inactive"
                  }
                >
                  {" → "}Community verified
                </span>
                <span
                  className={
                    report.status === "Addressed" ? "active" : "inactive"
                  }
                >
                  {" → "}Addressed
                </span>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
