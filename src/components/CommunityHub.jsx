import { useEffect, useState, useCallback } from "react";
import {
  fetchReports,
  createReport,
  voteOnReport,
  updateReportStatus,
  readPendingLegacyReports,
  migrateLegacyReports,
  markMigrationDecided,
} from "../services/communityReportsService";
import { clusterReports } from "../utils/hotspotClustering";
import HotspotMap from "./HotspotMap";

const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB

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
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxWidth / img.width, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}

/**
 * Best-effort precise geolocation for hotspot clustering, falling back to the
 * currently-selected city's coordinates (already city-level public info
 * elsewhere in the app) if the browser has no geolocation support or the
 * user denies permission.
 */
function getReportCoordinates(fallbackPosition) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(fallbackPosition);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve(fallbackPosition),
      { timeout: 5000 }
    );
  });
}

export default function CommunityHub({ position }) {
  const [reports, setReports] = useState([]);
  const [votedIds, setVotedIds] = useState(() => {
    try {
      const raw = localStorage.getItem("pollution-community-voted-ids");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState({ title: "", description: "", image: "" });
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [uploadError, setUploadError] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("No file chosen");
  const [previewImage, setPreviewImage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [pendingMigration, setPendingMigration] = useState([]);
  const [isMigrating, setIsMigrating] = useState(false);

  const loadReports = useCallback(async () => {
    try {
      setLoadError("");
      const data = await fetchReports();
      setReports(data);
    } catch (err) {
      console.error("Failed to load community reports:", err);
      setLoadError("Could not reach the community backend. Showing no reports for now.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReports();
    setPendingMigration(readPendingLegacyReports());
  }, [loadReports]);

  useEffect(() => {
    try {
      localStorage.setItem("pollution-community-voted-ids", JSON.stringify([...votedIds]));
    } catch (e) {
      console.error("Failed to persist community votes to localStorage:", e);
    }
  }, [votedIds]);

  const acceptMigration = async () => {
    setIsMigrating(true);
    try {
      await migrateLegacyReports(pendingMigration);
      setPendingMigration([]);
      await loadReports();
    } catch (err) {
      console.error("Migration failed:", err);
    } finally {
      setIsMigrating(false);
    }
  };

  const declineMigration = () => {
    // The user keeps their old reports private — we just stop asking again
    // and stop treating localStorage as a data source going forward.
    markMigrationDecided();
    setPendingMigration([]);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;

    const coords = await getReportCoordinates(
      position && position.lat && position.lon ? { lat: position.lat, lon: position.lon } : null
    );

    const newReport = {
      id: crypto.randomUUID(),
      title: form.title.trim(),
      description: form.description.trim(),
      image: form.image,
      lat: coords?.lat ?? null,
      lon: coords?.lon ?? null,
      votes: 0,
      createdAt: new Date().toISOString(),
      status: "Pending",
      verifiedAt: "",
      moderationNotes: "",
    };

    try {
      const saved = await createReport(newReport);
      setReports((prev) => [saved, ...prev]);
    } catch (err) {
      console.error("Failed to submit report:", err);
      setLoadError("Failed to submit your report — please try again.");
    }

    setForm({ title: "", description: "", image: "" });
    setSelectedFileName("No file chosen");
    setPreviewImage("");
    setFileInputKey(Date.now());
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Invalid file format. Please select a JPEG, PNG, or WebP image.");
      event.target.value = "";
      setSelectedFileName("No file chosen");
      setPreviewImage("");
      setFileInputKey(Date.now());
      return;
    }

    setSelectedFileName(file.name);
    setPreviewImage(URL.createObjectURL(file));
    setUploadError("");

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setUploadError(
        `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 500 KB.`
      );
      event.target.value = "";
      setSelectedFileName("No file chosen");
      setPreviewImage("");
      setFileInputKey(Date.now());
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(String(reader.result));
        setForm((prev) => ({ ...prev, image: compressed }));
      } catch {
        setUploadError("Failed to process image. Please try again.");
      }
    };
    reader.onerror = () => {
      setUploadError("Failed to read image file. Please try again.");
    };
    reader.readAsDataURL(file);
  };

  const vote = async (id) => {
    if (votedIds.has(id)) return;
    // Optimistic UI: mark it voted locally right away for responsiveness.
    setVotedIds((prev) => new Set(prev).add(id));
    try {
      const updated = await voteOnReport(id);
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error("Failed to submit vote:", err);
      // Roll back optimistic vote-tracking so the user can retry.
      setVotedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const markAddressed = async (id) => {
    try {
      const updated = await updateReportStatus(id, "Addressed");
      setReports((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      console.error("Failed to mark report addressed:", err);
    }
  };

  const filteredReports = reports.filter((report) => {
    if (filter === "All") return true;
    if (filter === "Verified") return report.status.startsWith("Verified");
    return report.status === filter;
  });

  const { hotspots } = clusterReports(reports);

  return (
    <section data-testid="community-hub" className="panel">
      <div className="panel-head">
        <h2>Community Contribution</h2>
        <p>Report local pollution issues with evidence and crowd voting</p>
      </div>

      {pendingMigration.length > 0 && (
        <div className="migration-banner" role="alert">
          <p>
            You have {pendingMigration.length} report{pendingMigration.length === 1 ? "" : "s"}{" "}
            saved only in this browser from before community reports were shared. Share{" "}
            {pendingMigration.length === 1 ? "it" : "them"} to the community backend so other
            residents can see and verify {pendingMigration.length === 1 ? "it" : "them"}?
          </p>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="button" onClick={acceptMigration} disabled={isMigrating}>
              {isMigrating ? "Sharing…" : "Share & Continue"}
            </button>
            <button type="button" onClick={declineMigration} disabled={isMigrating}>
              Keep Private
            </button>
          </div>
        </div>
      )}

      {loadError && <p className="upload-error">{loadError}</p>}

      <form className="community-form" id="report-form" onSubmit={onSubmit}>
        <input
          type="text"
          value={form.title}
          placeholder="Issue title (e.g., Garbage burning)"
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <textarea
          value={form.description}
          placeholder="Describe location and issue details"
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <div className="file-upload-container">
          <label htmlFor="community-file-upload" className="file-upload-button">
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
              <img src={previewImage} alt="Selected evidence" className="image-preview" />
            )}
            <span className="selected-file-name">{selectedFileName}</span>
          </div>
        </div>

        {uploadError && <p className="upload-error">{uploadError}</p>}
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
        {isLoading ? (
          <p className="empty-filter-message">Loading community reports…</p>
        ) : reports.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__icon" aria-hidden="true">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 9v4m0 4h.01M4.93 4.93a10 10 0 1 0 14.14 14.14A10 10 0 0 0 4.93 4.93Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="empty-state__title">No reports yet</p>
            <p className="empty-state__message">Be the first to flag a pollution issue in your area.</p>
            <button
              type="button"
              className="empty-state__cta"
              onClick={() =>
                document.getElementById("report-form")?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
            >
              Submit a report
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <p className="empty-filter-message">No reports match the "{filter}" filter.</p>
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
                    {votedIds.has(report.id) ? "Voted" : "Upvote"} ({report.votes})
                  </button>
                </div>
              </div>
              <p>{report.description}</p>
              {report.image && <img src={report.image} alt={report.title} />}

              <div className="timeline-workflow">
                <span>Created</span>
                <span className={report.status.startsWith("Verified") || report.status === "Addressed" ? "active" : "inactive"}>
                  {" → "}Community verified
                </span>
                <span className={report.status === "Addressed" ? "active" : "inactive"}>
                  {" → "}Addressed
                </span>
              </div>
            </article>
          ))
        )}
      </div>

      {position?.lat && position?.lon && (
        <HotspotMap hotspots={hotspots} center={position} cityName={position.cityName} />
      )}
    </section>
  );
}