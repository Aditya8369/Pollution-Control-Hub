import { useEffect, useState } from "react";

const STORAGE_KEY = "pollution-community-reports";
const VOTES_STORAGE_KEY = "pollution-community-voted-ids";
const VOTE_THRESHOLD = 5;
const X_DAYS = 7;
const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB
const STORAGE_WARN_THRESHOLD = 5 * 1024 * 1024; // 5 MB warning

/**
 * Compress a base64 data URI to a smaller JPEG using canvas.
 * @param {string} dataUrl - Original image data URI
 * @param {number} maxWidth - Maximum width in pixels (default 800)
 * @param {number} quality - JPEG quality 0–1 (default 0.7)
 * @returns {Promise<string>} Compressed data URI
 */
function compressImage(dataUrl, maxWidth = 800, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
  });
}

function readReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readVotedIds() {
  try {
    const raw = localStorage.getItem(VOTES_STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export default function CommunityHub() {
  const [reports, setReports] = useState(() => readReports());
  const [votedIds, setVotedIds] = useState(() => readVotedIds());
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState({
    title: "",
    description: "",
    image: "",
  });
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [uploadError, setUploadError] = useState('');
  const [selectedFileName, setSelectedFileName] = useState("No file chosen");
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    try {
      const serialized = JSON.stringify(reports);
      const estimatedSize = new Blob([serialized]).size;

      if (estimatedSize > STORAGE_WARN_THRESHOLD) {
        console.warn(
          `Community reports using ${(estimatedSize / 1024 / 1024).toFixed(1)} MB of localStorage`
        );
      }

      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error('localStorage quota exceeded. Pruning oldest reports...');
        // Remove oldest/lowest-vote reports until write succeeds
        const sorted = [...reports].sort((a, b) => {
          if (a.votes !== b.votes) return a.votes - b.votes;
          return new Date(a.createdAt) - new Date(b.createdAt);
        });

        let pruned = [...reports];
        while (pruned.length > 0) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
            setReports(pruned);
            break;
          } catch {
            pruned.shift(); // remove lowest-value report
          }
        }

        if (pruned.length === 0) {
          console.error('All community reports pruned — localStorage quota still exceeded.');
        }
      } else {
        throw e;
      }
    }
  }, [reports]);

  useEffect(() => {
    try {
      localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify([...votedIds]));
    } catch (e) {
      console.error('Failed to persist community votes to localStorage:', e);
    }
  }, [votedIds]);

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
    setForm({
      title: "",
      description: "",
      image: "",
    });

    setSelectedFileName("No file chosen");
    setPreviewImage("");
    setFileInputKey(Date.now());
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setPreviewImage(URL.createObjectURL(file));
    setUploadError('');

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setUploadError(
        `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 500 KB.`
      );
      event.target.value = '';
      setSelectedFileName("No file chosen");
      setFileInputKey(Date.now());
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(String(reader.result));
        setForm((prev) => ({ ...prev, image: compressed }));
      } catch {
        setUploadError('Failed to process image. Please try again.');
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const vote = (id) => {
    if (votedIds.has(id)) return;

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

    setVotedIds((prev) => new Set(prev).add(id));
  };

  const markAddressed = (id) => {
    setReports((prev) =>
      prev.map((report) => {
        if (report.id !== id) return report;
        if (!report.status.startsWith("Verified")) return report;

        return { ...report, status: "Addressed" };
      })
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

      <form className="community-form" id="report-form" onSubmit={onSubmit}>
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
        <div className="file-upload-container">
          <label
            htmlFor="community-file-upload"
            className="file-upload-button"
          >
            📤 Choose File
          </label>

          <input
            id="community-file-upload"
            key={fileInputKey}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={uploadImage}
            className="file-input-hidden"
          />

          <div className="selected-file-container">
            {previewImage && (
              <img
                src={previewImage}
                alt="Selected evidence"
                className="image-preview"
              />
            )}

            <span className="selected-file-name">
              {selectedFileName}
            </span>
          </div>
        </div>

        {uploadError && (
          <p className="upload-error">
            {uploadError}
          </p>
        )}
        <button type="submit">Submit Report</button>
      </form>

      <div className="filter-tabs">
        {["All", "Pending", "Verified", "Addressed"].map((statusOption) => (
          <button
            key={statusOption}
            type="button"
            onClick={() => setFilter(statusOption)}
            className={filter === statusOption ? "active" : ""}
          >
            {statusOption}
          </button>
        ))}
      </div>

      <div className="report-feed">
        {reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 9v4m0 4h.01M4.93 4.93a10 10 0 1 0 14.14 14.14A10 10 0 0 0 4.93 4.93Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="empty-state__title">No reports yet</p>
            <p className="empty-state__message">
              Be the first to flag a pollution issue in your area.
            </p>
            <button
              type="button"
              className="empty-state__cta"
              onClick={() =>
                document
                  .getElementById("report-form")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            >
              Submit a report
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <p className="empty-filter-message">
            No reports match the "{filter}" filter.
          </p>
        ) : (
          filteredReports.map((report) => (
            <article className="report-card" key={report.id}>
              <div className="report-head">
                <div className="report-title-container">
                  <h3>{report.title}</h3>
                  <span className="status-badge">{report.status}</span>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {report.status.startsWith("Verified") && (
                    <button type="button" onClick={() => markAddressed(report.id)}>
                      Mark addressed
                    </button>
                  )}
                  <button onClick={() => vote(report.id)} type="button" disabled={votedIds.has(report.id)}>
                    {votedIds.has(report.id) ? 'Voted' : 'Upvote'} ({report.votes})
                  </button>
                </div>
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