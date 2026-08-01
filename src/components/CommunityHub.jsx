import { useEffect, useState } from 'react';
import { eventBus } from '../core/events';

const STORAGE_KEY = 'pollution-community-reports';
const VOTES_STORAGE_KEY = 'pollution-community-voted-ids';
const VOTE_THRESHOLD = 5;
const X_DAYS = 7;
const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB
const STORAGE_WARN_THRESHOLD = 5 * 1024 * 1024; // 5 MB warning
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;

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

/**
 * Reverses the HTML entity escaping that earlier versions applied before storing a
 * report. React escapes text children itself, so the stored entities were rendered
 * literally ("Smoke &amp;amp; dust"). Decoding on read repairs reports that were already
 * saved in that form; text that contains no entities passes through untouched.
 *
 * Applied repeatedly this is not idempotent in the strict sense — a report whose author
 * genuinely typed "&amp;" would lose one round — so it runs once, at the migration below,
 * and the result is written back.
 *
 * @param {string} value
 * @returns {string}
 */
export function decodeStoredEntities(value) {
  if (typeof value !== 'string') return value;
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&'); // last, so "&amp;lt;" decodes to "&lt;" and not "<"
}

/**
 * True when a stored report still holds the escaped text written by earlier versions.
 *
 * @param {any} report
 * @returns {boolean}
 */
function needsEntityMigration(report) {
  const pattern = /&(amp|lt|gt|quot|#x27);/;
  return pattern.test(report?.title || '') || pattern.test(report?.description || '');
}

/**
 * Loads reports from localStorage, decoding any that were persisted with HTML entities.
 *
 * @returns {any[]}
 */
export function readReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    if (!parsed.some(needsEntityMigration)) return parsed;

    const migrated = parsed.map((report) =>
      needsEntityMigration(report)
        ? {
            ...report,
            title: decodeStoredEntities(report.title),
            description: decodeStoredEntities(report.description),
          }
        : report
    );

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    } catch {
      // Migration is best-effort; the decoded copy is still returned for this session.
    }

    return migrated;
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
    title: '',
    description: '',
    image: ''
  });
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [uploadError, setUploadError] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');

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
          // @ts-ignore
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
    localStorage.setItem(VOTES_STORAGE_KEY, JSON.stringify([...votedIds]));
  }, [votedIds]);

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('error');
      return;
    }
    setLocationStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus('success');
      },
      () => {
        setLocationCoords(null);
        setLocationStatus('error');
      }
    );
  };

  /** @param {any} event */
  const onSubmit = (event) => {
    event.preventDefault();
    // Report text is stored verbatim and rendered as a React text child, which React
    // escapes on output. Escaping here as well would double-encode it — an apostrophe
    // would reach the reader as "&#x27;" — without adding any protection, since this
    // component never uses dangerouslySetInnerHTML.
    const cleanTitle = form.title.trim().slice(0, MAX_TITLE_LENGTH);
    const cleanDescription = form.description.trim().slice(0, MAX_DESCRIPTION_LENGTH);
    if (!cleanTitle || !cleanDescription) return;

    // Validate image data URL scheme if present
    let safeImage = '';
    if (form.image) {
      if (/^data:image\/(jpeg|png|webp);base64,/.test(form.image)) {
        safeImage = form.image;
      } else {
        setUploadError('Invalid image format detected.');
        return;
      }
    }

    const newReport = {
      id: crypto.randomUUID(),
      title: cleanTitle,
      description: cleanDescription,
      image: safeImage,
      votes: 0,
      createdAt: new Date().toISOString(),
      status: "Pending",
      verifiedAt: "",
      moderationNotes: "",
      latitude: locationCoords ? locationCoords.latitude : null,
      longitude: locationCoords ? locationCoords.longitude : null,
    };

    setReports((prev) => [newReport, ...prev]);
    setForm({ title: '', description: '', image: '' });
    setFileInputKey(Date.now());
    setLocationCoords(null);
    setLocationStatus('idle');

    eventBus.emit('COMMUNITY_REPORT_SUBMITTED', newReport);
  };

  /** @param {any} event */
  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Only JPEG, PNG, and WebP images are allowed.');
      event.target.value = '';
      setFileInputKey(Date.now());
      return;
    }

    setUploadError('');
    setIsProcessingImage(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const compressed = await compressImage(String(reader.result));
        
        // Ensure result has valid image data URI prefix
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(compressed)) {
          setUploadError('Invalid image data generated. Please upload a valid image file.');
          event.target.value = '';
          setFileInputKey(Date.now());
          return;
        }

        // Calculate size of the compressed image in bytes from the base64 string
        const base64Str = compressed.split(',')[1];
        const compressedSize = Math.round((base64Str.length * 3) / 4) - (base64Str.endsWith('==') ? 2 : base64Str.endsWith('=') ? 1 : 0);

        if (compressedSize > MAX_IMAGE_SIZE_BYTES) {
          setUploadError(
            `Image too large (${(compressedSize / 1024 / 1024).toFixed(1)} MB). Maximum is 500 KB.`
          );
          event.target.value = '';
          setFileInputKey(Date.now());
        } else {
          setForm((prev) => ({ ...prev, image: compressed }));
        }
      } catch {
        setUploadError('Failed to process image. Please try again.');
      } finally {
        setIsProcessingImage(false);
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read image file. Please try again.');
      setIsProcessingImage(false);
    };
    reader.readAsDataURL(file);
  };

  /** @param {any} id */
  const vote = (id) => {
    if (votedIds.has(id)) return;

    setReports((prev) =>
      prev.map((report) => {
        if (report.id !== id) return report;

        const nextVotes = report.votes + 1;
        const createdDate = new Date(report.createdAt);
        // @ts-ignore
        const ageInDays = (new Date() - createdDate) / (1000 * 60 * 60 * 24);

        let updatedStatus = report.status;
        let verifiedAtTimestamp = report.verifiedAt;
        let notes = report.moderationNotes;

        if (nextVotes >= VOTE_THRESHOLD && ageInDays <= X_DAYS && report.status === "Pending") {
          updatedStatus = "Verified (community)";
          verifiedAtTimestamp = new Date().toISOString();
          notes = "Automatically verified via community consensus upvotes.";
        }

        return {
          ...report,
          votes: nextVotes,
          status: updatedStatus,
          verifiedAt: verifiedAtTimestamp,
          moderationNotes: notes
        };
      })
    );

    setVotedIds((prev) => new Set(prev).add(id));
  };

  const filteredReports = reports.filter((report) => {
    if (filter === 'All') return true;
    if (filter === 'Verified') return report.status.startsWith('Verified');
    return report.status === filter;
  });

  return (
    <section data-testid="community-hub" className="panel">
      <div className="panel-head">
        <h2>Community Contribution</h2>
        <p>Report local pollution issues with evidence and crowd voting</p>
      </div>

      <form className="community-form" onSubmit={onSubmit}>
        <input
          type="text"
          value={form.title}
          maxLength={MAX_TITLE_LENGTH}
          placeholder="Issue title (e.g., Garbage burning)"
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
        />
        <textarea
          value={form.description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          placeholder="Describe location and issue details"
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />
        <input
          key={fileInputKey}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={uploadImage}
          style={{ width: '100%' }}
          disabled={isProcessingImage}
        />
        {isProcessingImage && (
          <p className="upload-processing" role="status" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="live-dot active" aria-hidden="true"></span>
            Processing image...
          </p>
        )}
        {uploadError && <p className="upload-error">{uploadError}</p>}
        <div className="location-action-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={handleGetLocation}
            disabled={locationStatus === 'locating'}
            style={{
              padding: '0.4rem 0.8rem',
              whiteSpace: 'nowrap',
              fontSize: '0.85rem'
            }}
          >
            {locationStatus === 'locating' ? 'Locating...' : 'Use Current Location'}
          </button>
          {locationStatus === 'success' && (
            <span className="location-status-text" style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: '500' }}>
              Location attached
            </span>
          )}
          {locationStatus === 'error' && (
            <span className="location-status-text" style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '500' }}>
              Unable to retrieve location
            </span>
          )}
        </div>
        <button type="submit" disabled={isProcessingImage}>
          {isProcessingImage ? 'Processing image…' : 'Submit Report'}
        </button>
      </form>

      <div className="filter-tabs" style={{ display: 'flex', gap: '8px', margin: '15px 0' }}>
        {['All', 'Pending', 'Verified', 'Addressed'].map((statusOption) => (
          <button
            key={statusOption}
            type="button"
            className={filter === statusOption ? 'active' : ''}
            onClick={() => setFilter(statusOption)}
          >
            {statusOption}
          </button>
        ))}
      </div>

      <div className="reports-list" style={{ display: 'grid', gap: '15px' }}>
        {filteredReports.length === 0 ? (
          <p className="no-reports">No reports found for "{filter}".</p>
        ) : (
          filteredReports.map((report) => {
            const isVoted = votedIds.has(report.id);
            return (
              <div key={report.id} className="report-card" style={{ border: '1px solid var(--line)', padding: '15px', borderRadius: '8px', background: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{report.title}</h3>
                  <span className={`status-badge ${report.status.toLowerCase().replace(/[^a-z]/g, '')}`} style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: report.status.startsWith('Verified') ? '#dcfce7' : '#fef3c7', color: report.status.startsWith('Verified') ? '#166534' : '#92400e' }}>
                    {report.status}
                  </span>
                </div>
                <p style={{ margin: '0 0 10px 0', color: 'var(--muted)', fontSize: '0.95rem' }}>{report.description}</p>
                {report.image && (
                  <div style={{ marginBottom: '10px' }}>
                    <img src={report.image} alt={report.title} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '6px', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  <span>Votes: {report.votes}</span>
                  <button
                    type="button"
                    onClick={() => vote(report.id)}
                    disabled={isVoted}
                    style={{ padding: '4px 12px', cursor: isVoted ? 'default' : 'pointer' }}
                  >
                    {isVoted ? 'Voted' : 'Upvote (+1)'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}