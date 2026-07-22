<<<<<<< HEAD
import { useEffect, useState } from "react";
import { logger } from "../utils/logger";
import useSWR from "../hooks/useSWR.jsx";
import { getAirQuality } from "../services/airQualityService";
=======
import { useEffect, useState } from 'react';
>>>>>>> upstream/main

const STORAGE_KEY = 'pollution-community-reports';
const VOTES_STORAGE_KEY = 'pollution-community-voted-ids';
const VOTE_THRESHOLD = 5; 
const X_DAYS = 7;
const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB
const STORAGE_WARN_THRESHOLD = 5 * 1024 * 1024; // 5 MB warning;

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
  // ✅ All hooks at the top
  const [reports, setReports] = useState(() => readReports());
  const [votedIds, setVotedIds] = useState(() => readVotedIds());
<<<<<<< HEAD
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState({ title: "", description: "", image: "" });
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [uploadError, setUploadError] = useState("");
  const [selectedFileName, setSelectedFileName] = useState("No file chosen");
  const [previewImage, setPreviewImage] = useState("");
=======
  const [filter, setFilter] = useState('All');
  const [form, setForm] = useState({
    title: '',
    description: '',
    image: ''
  });
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [uploadError, setUploadError] = useState('');
>>>>>>> upstream/main

  // SWR hook
  const { data, error, isValidating } = useSWR(
    "airQuality",
    () => getAirQuality(22.57, 88.36) // Kolkata coords
  );

  // Persist reports
  useEffect(() => {
    try {
      const serialized = JSON.stringify(reports);
      const estimatedSize = new Blob([serialized]).size;
      if (estimatedSize > STORAGE_WARN_THRESHOLD) {
<<<<<<< HEAD
        logger.warn("localStorage usage high", {
          usageMB: (estimatedSize / 1024 / 1024).toFixed(1),
        });
=======
        console.warn(
          `Community reports using ${(estimatedSize / 1024 / 1024).toFixed(1)} MB of localStorage`
        );
>>>>>>> upstream/main
      }
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
<<<<<<< HEAD
      if (e.name === "QuotaExceededError" || e.code === 22) {
        logger.error("localStorage quota exceeded, pruning oldest reports");
=======
      if (e.name === 'QuotaExceededError' || e.code === 22) {
        console.error('localStorage quota exceeded. Pruning oldest reports...');
        // Remove oldest/lowest-vote reports until write succeeds
>>>>>>> upstream/main
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
<<<<<<< HEAD
          logger.error("All community reports pruned, quota still exceeded");
=======
          console.error('All community reports pruned — localStorage quota still exceeded.');
>>>>>>> upstream/main
        }
      } else {
        throw e;
      }
    }
  }, [reports]);

  // Persist votes
  useEffect(() => {
<<<<<<< HEAD
    try {
      localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify([...votedIds]));
    } catch (e) {
      logger.error("Failed to persist votes", { error: e?.message });
    }
=======
    localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify([...votedIds]));
>>>>>>> upstream/main
  }, [votedIds]);

  // ✅ Conditional rendering AFTER hooks
  if (isValidating) return <p>Preparing live pollution intelligence…</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const aqiDisplay = (
    <p>Current AQI: {data?.hourly?.pm10?.[0] ?? "N/A"}</p>
  );

  // Handlers
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
      status:"Pending",
      verifiedAt: "",
      moderationNotes:"",
    };
    setReports((prev) => [newReport, ...prev]);
<<<<<<< HEAD
    setForm({ title: "", description: "", image: "" });
    setSelectedFileName("No file chosen");
    setPreviewImage("");
=======
    setForm({ title: '', description: '', image: '' });
>>>>>>> upstream/main
    setFileInputKey(Date.now());
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
<<<<<<< HEAD
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Invalid file format. Please select JPEG, PNG, or WebP.");
      event.target.value = "";
      setSelectedFileName("No file chosen");
      setPreviewImage("");
      setFileInputKey(Date.now());
      return;
    }
    setSelectedFileName(file.name);
    setPreviewImage(URL.createObjectURL(file));
    setUploadError("");
=======

    setUploadError('');

>>>>>>> upstream/main
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setUploadError(
        `Image too large (${(file.size / 1024 / 1024).toFixed(
          1
        )} MB). Max is 500 KB.`
      );
<<<<<<< HEAD
      event.target.value = "";
      setSelectedFileName("No file chosen");
      setPreviewImage("");
=======
      event.target.value = '';
>>>>>>> upstream/main
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

  const vote = (id) => {
    if (votedIds.has(id)) return;
    setReports((prev) =>
      prev.map((report) => {
        if (report.id !== id) return report;
        const nextVotes = report.votes + 1;
        const createdDate = new Date(report.createdAt);
        const ageInDays = (new Date() - createdDate) / (1000 * 60 * 60 * 24);
<<<<<<< HEAD
        let updatedStatus = report.status;
        let verifiedAtTimestamp = report.verifiedAt;
        let notes = report.moderationNotes;
        if (
          nextVotes >= VOTE_THRESHOLD &&
          ageInDays <= X_DAYS &&
          report.status === "Pending"
        ) {
=======
        
        let updatedStatus = report.status;
        let verifiedAtTimestamp = report.verifiedAt;
        let notes = report.moderationNotes;

        if (nextVotes >= VOTE_THRESHOLD && ageInDays <= X_DAYS && report.status === "Pending") {
>>>>>>> upstream/main
          updatedStatus = "Verified (community)";
          verifiedAtTimestamp = new Date().toISOString();
          notes = "Automatically verified via community consensus upvotes.";
        }
<<<<<<< HEAD
        return {
          ...report,
          votes: nextVotes,
=======

        return { 
          ...report, 
          votes: nextVotes, 
>>>>>>> upstream/main
          status: updatedStatus,
          verifiedAt: verifiedAtTimestamp,
          moderationNotes: notes
        };
      })
    );
    setVotedIds((prev) => new Set(prev).add(id));
  };

<<<<<<< HEAD
  const markAddressed = (id) => {
    setReports((prev) =>
      prev.map((report) => {
        if (report.id !== id) return report;
        if (!report.status.startsWith("Verified")) return report;
        return { ...report, status: "Addressed" };
      })
    );
  };

=======
>>>>>>> upstream/main
  const filteredReports = reports.filter((report) => {
    if (filter === 'All') return true;
    if (filter === 'Verified') return report.status.startsWith('Verified');
    return report.status === filter;
  });

  return (
    <section data-testid="community-hub" className="panel">
      <div className="panel-head">
        <h2>Community Contribution</h2>
      {aqiDisplay}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {data && <p>Current AQI: {data?.hourly?.pm10?.[0]}</p>}
      <p>Report local pollution issues with evidence and crowd voting</p>
    </div>

      <form className="community-form" onSubmit={onSubmit}>
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
        <input key={fileInputKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} style={{ width: '100%' }} />
        {uploadError && <p className="upload-error">{uploadError}</p>}
        <button type="submit">Submit Report</button>
      </form>

      <div className="filter-tabs" style={{ display: 'flex', gap: '8px', margin: '15px 0' }}>
        {['All', 'Pending', 'Verified', 'Addressed'].map((statusOption) => (
          <button
            key={statusOption}
            type="button"
            onClick={() => setFilter(statusOption)}
            style={{
              padding: '6px 12px',
              cursor: 'pointer',
              fontWeight: filter === statusOption ? 'bold' : 'normal'
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3>{report.title}</h3>
                  <span className="status-badge" style={{ fontSize: '0.8rem', padding: '2px 6px', border: '1px solid #ccc', borderRadius: '4px' }}>
                    {report.status}
                  </span>
                </div>
                <button onClick={() => vote(report.id)} type="button" disabled={votedIds.has(report.id)}>
                  {votedIds.has(report.id) ? 'Voted' : 'Upvote'} ({report.votes})
                </button>
              </div>
              <p>{report.description}</p>
              {report.image && <img src={report.image} alt={report.title} />}

              <div className="timeline-workflow" style={{ marginTop: '12px', fontSize: '0.8rem', color: '#666' }}>
                <span>Created</span>
                <span style={{ color: report.status.startsWith('Verified') || report.status === 'Addressed' ? '#000' : '#ccc' }}>
                  {" → "}Community verified
                </span>
                <span style={{ color: report.status === 'Addressed' ? '#000' : '#ccc' }}>
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