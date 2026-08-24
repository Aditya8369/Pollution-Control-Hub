import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { eventBus } from '../core/events';
import InfoTooltip from './InfoTooltip';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../config/rbac';
import { fetchAirQualityByCoords } from '../services/airQualityService';
import {
  computeVerificationScore,
  findNearbyReports,
} from '../services/verificationService';
// Issue #926: Import our new reputation system logic
import { updateUserReputation } from '../services/reputationService';

const STORAGE_KEY = 'pollution-community-reports';
const VOTES_STORAGE_KEY = 'pollution-community-voted-ids';
const VOTE_THRESHOLD = 5;
const X_DAYS = 7;
const MAX_IMAGE_SIZE_BYTES = 500 * 1024; // 500 KB
const STORAGE_WARN_THRESHOLD = 5 * 1024 * 1024; // 5 MB warning
const MAX_TITLE_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_COMMENT_LENGTH = 500;
const HASHTAGS = ['#TreePlanting', '#StubbleBurning', '#CleanAir'];

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

    const migrated = parsed.map((report) => {
      let r = { ...report };
      if (needsEntityMigration(report)) {
        r.title = decodeStoredEntities(report.title);
        r.description = decodeStoredEntities(report.description);
      }
      if (r.status === 'Pending') r.status = 'New';
      if (r.status === 'Addressed') r.status = 'Resolved';
      return r;
    });

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

const INCIDENT_CATEGORIES = [
  'Garbage burning',
  'Industrial smoke',
  'Construction dust',
  'Excessive traffic pollution',
  'Chemical smell',
  'Smoke from vehicles',
  'Waste dumping',
];

const SEVERITY_LEVELS = ['Low', 'Medium', 'High', 'Critical'];

export default function CommunityHub() {
  const { t } = useTranslation();
  const { user } = useAuth() || {};
  const isModerator = user && hasPermission(user.role, 'edit:report');

  const [reports, setReports] = useState(() => readReports());
  const [votedIds, setVotedIds] = useState(() => readVotedIds());
  
  // Filters
  const [filter, setFilter] = useState('All');
  const [hashtagFilter, setHashtagFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('All Time');
  const [locationFilter, setLocationFilter] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    image: '',
    hashtag: '',
    category: '',
    severity: 'Medium',
    locationName: ''
  });
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [uploadError, setUploadError] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState('idle');
  const [commentDrafts, setCommentDrafts] = useState({});

  // Verification: keyed by report.id → VerificationResult
  const [verificationResults, setVerificationResults] = useState({});

  // AQI cache: keyed by "lat,lon" (2 d.p.) → AQI data object.
  // useRef keeps a mutable map across renders without triggering re-renders.
  const aqiCacheRef = useRef({});
  const aqiCache = aqiCacheRef.current;

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
        // Lowest-value first: fewest votes, then oldest. We drop victims in
        // this order but keep `pruned` in the original (newest-first) display
        // order so the surviving reports aren't reordered.
        const sorted = [...reports].sort((a, b) => {
          if (a.votes !== b.votes) return a.votes - b.votes;
          // @ts-ignore
          return new Date(a.createdAt) - new Date(b.createdAt);
        });

        let pruned = [...reports];
        let victimIdx = 0;
        while (pruned.length > 0) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(pruned));
            setReports(pruned);
            break;
          } catch {
            const victim = sorted[victimIdx++]; // remove lowest-value report
            pruned = pruned.filter((r) => r !== victim);
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

  // ── Verification computation ───────────────────────────────────────────────
  // Runs whenever reports change. For geotagged reports, fetches live AQI at
  // that location (using skipGrid=true to avoid the 9-point grid fetch), cached
  // in-memory so re-renders don't trigger extra network calls.
  useEffect(() => {
    let cancelled = false;

    async function computeAll() {
      const updates = {};

      for (const report of reports) {
        if (cancelled) return;

        let aqiData = null;
        if (typeof report.latitude === 'number' && typeof report.longitude === 'number') {
          const cacheKey = `${report.latitude.toFixed(2)},${report.longitude.toFixed(2)}`;
          if (aqiCache[cacheKey]) {
            aqiData = aqiCache[cacheKey];
          } else {
            try {
              aqiData = await fetchAirQualityByCoords(
                report.latitude,
                report.longitude,
                undefined,
                true // skipGrid
              );
              aqiCache[cacheKey] = aqiData;
            } catch {
              // AQI unavailable — relevant factors will score 0
            }
          }
        }

        const nearbyReports = findNearbyReports(report, reports);
        updates[report.id] = computeVerificationScore(report, {
          aqiData,
          nearbyReports,
          allReports: reports,
        });
      }

      if (!cancelled) {
        setVerificationResults(updates);
      }
    }

    computeAll();
    return () => { cancelled = true; };
  }, [reports]); // aqiCache is a stable ref — intentionally omitted

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
      authorId: user?.id || null, // Issue #926: Tracking the author for reputation points
      title: cleanTitle,
      description: cleanDescription,
      category: form.category,
      severity: form.severity,
      locationName: form.locationName.trim().slice(0, 100),
      image: safeImage,
      hashtag: form.hashtag,
      votes: 0,
      createdAt: new Date().toISOString(),
      status: "New",
      verifiedAt: "",
      moderationNotes: "",
      latitude: locationCoords ? locationCoords.latitude : null,
      longitude: locationCoords ? locationCoords.longitude : null,
      comments: [],
    };

    setReports((prev) => [newReport, ...prev]);
    setForm({ title: '', description: '', image: '', hashtag: '', category: '', severity: 'Medium', locationName: '' });
    setShowForm(false);
    setFileInputKey(Date.now());
    setLocationCoords(null);
    setLocationStatus('idle');

    eventBus.emit('COMMUNITY_REPORT_SUBMITTED', newReport);

    // Issue #926: Step 2 - Award points for valid reports
    if (user?.id) {
      updateUserReputation(user.id, 'VALID_REPORT').catch(console.error);
    }
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

        if (nextVotes >= VOTE_THRESHOLD && ageInDays <= X_DAYS && report.status === "New") {
          updatedStatus = "Verified";
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

    // Issue #926: Step 3 - Award points for confirming incidents
    if (user?.id) {
      updateUserReputation(user.id, 'CONFIRM_INCIDENT').catch(console.error);
    }
  };

  /** @param {string} reportId */
  const addComment = (reportId) => {
    const text = (commentDrafts[reportId] || '').trim().slice(0, MAX_COMMENT_LENGTH);
    if (!text) return;

    setReports((prev) =>
      prev.map((report) => {
        if (report.id !== reportId) return report;
        const comments = Array.isArray(report.comments) ? report.comments : [];
        return {
          ...report,
          comments: [
            ...comments,
            {
              id: crypto.randomUUID(),
              text,
              createdAt: new Date().toISOString(),
            },
          ],
        };
      })
    );

    setCommentDrafts((prev) => ({ ...prev, [reportId]: '' }));
  };

  const filteredReports = reports.filter((report) => {
    if (hashtagFilter !== 'All' && report.hashtag !== hashtagFilter) return false;
    
    // Status
    if (filter !== 'All') {
      if (filter === 'Verified' && !report.status.startsWith('Verified')) return false;
      if ((filter === 'New' || filter === 'Under Review' || filter === 'Resolved') && report.status !== filter) return false;
      if (filter === 'Likely' || filter === 'Unverified') {
        const vr = verificationResults[report.id];
        if (!vr || vr.verificationState !== filter) return false;
      }
    }
    
    // Type/Category
    if (typeFilter !== 'All' && report.category !== typeFilter) return false;
    
    // Severity
    if (severityFilter !== 'All' && report.severity !== severityFilter) return false;
    
    // Date
    if (dateFilter && dateFilter !== 'All Time') {
       const reportDate = new Date(report.createdAt);
       const now = new Date();
       // @ts-ignore
       const diff = now - reportDate;
       if (dateFilter === 'Last 24 Hours' && diff > 24 * 60 * 60 * 1000) return false;
       if (dateFilter === 'Last 7 Days' && diff > 7 * 24 * 60 * 60 * 1000) return false;
       if (dateFilter === 'Last 30 Days' && diff > 30 * 24 * 60 * 60 * 1000) return false;
    }
    
    // Location
    if (locationFilter) {
       const term = locationFilter.toLowerCase();
       const locName = (report.locationName || '').toLowerCase();
       const desc = (report.description || '').toLowerCase();
       const title = (report.title || '').toLowerCase();
       if (!locName.includes(term) && !desc.includes(term) && !title.includes(term)) {
           return false;
       }
    }
    
    return true;
  });

  const statusLabel = (status) => {
    if (status === 'New') return t('communityHub.statusNew', 'New');
    if (status === 'Under Review') return t('communityHub.statusUnderReview', 'Under Review');
    if (status === 'Resolved') return t('communityHub.statusResolved', 'Resolved');
    if (status.startsWith('Verified')) return t('communityHub.statusVerified', 'Verified');
    return status;
  };

  const filterLabel = (option) => {
    if (option === 'All') return t('communityHub.filterAll', 'All');
    if (option === 'New') return t('communityHub.filterNew', 'New');
    if (option === 'Under Review') return t('communityHub.filterUnderReview', 'Under Review');
    if (option === 'Verified') return t('communityHub.filterVerified', 'Verified');
    if (option === 'Resolved') return t('communityHub.filterResolved', 'Resolved');
    if (option === 'Likely') return t('communityHub.filterLikely', 'Likely');
    if (option === 'Unverified') return t('communityHub.filterUnverified', 'Unverified');
    return option;
  };

  /** Returns badge color based on verification state. */
  const verificationBadgeStyle = (state, isDuplicate) => {
    if (isDuplicate) return { background: '#fff7ed', color: '#c2410c' };
    if (state === 'Verified') return { background: '#dcfce7', color: '#166534' };
    if (state === 'Likely') return { background: '#fef9c3', color: '#854d0e' };
    return { background: '#f1f5f9', color: '#475569' };
  };

  /** Builds the tooltip text from the 5-factor breakdown. */
  const buildTooltipText = (result) => {
    if (!result) return '';
    const title = t('communityHub.verificationTooltipTitle', 'Confidence Breakdown');
    const lines = result.factors.map(
      (f) => `${t('communityHub.' + f.label, f.label)}: ${f.score}/${f.max}`
    );
    return `${title}\n${lines.join('\n')}`;
  };

  /** Moderator action: flag a report as suspicious (override → unverified). */
  const handleMarkSuspicious = (reportId) => {
    setReports((prev) =>
      prev.map((r) => {
        if (r.id !== reportId) return r;

        // Issue #926: Step 4 - Penalize spam/false reports
        if (r.authorId) {
          updateUserReputation(r.authorId, 'SPAM_PENALTY').catch(console.error);
        }

        return {
          ...r,
          moderatorOverride: 'unverified',
          moderationNotes: t(
            'communityHub.moderatorMarkSuspicious',
            'Mark Suspicious'
          ) + ' — ' + new Date().toISOString(),
        };
      })
    );
  };

  /** Moderator action: force a report to Verified state. */
  const handleModeratorVerify = (reportId) => {
    setReports((prev) =>
      prev.map((r) =>
        r.id !== reportId
          ? r
          : {
            ...r,
            moderatorOverride: 'verified',
            moderationNotes: t(
              'communityHub.moderatorOverrideVerified',
              'Override: Verified'
            ) + ' — ' + new Date().toISOString(),
          }
      )
    );
  };

  return (
    <section data-testid="community-hub" className="panel">
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
        <div>
          <h2>{t("communityHub.title", "Community Contribution")}</h2>
          <p>{t("communityHub.subtitle", "Report local pollution issues with evidence and crowd voting")}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{marginTop: '10px'}}>
          {showForm ? t("communityHub.cancelReport", "Cancel") : t("communityHub.reportPollution", "Report Pollution")}
        </button>
      </div>

      {showForm && (
      <form className="community-form" onSubmit={onSubmit} style={{marginTop: '15px'}}>
        <input
          type="text"
          value={form.title}
          maxLength={MAX_TITLE_LENGTH}
          placeholder={t("communityHub.placeholderTitle", "Issue title (e.g., Garbage burning)")}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          required
        />
        <select
          value={form.category}
          onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
          required
        >
          <option value="" disabled>{t("communityHub.categoryPlaceholder", "Select Incident Category")}</option>
          {INCIDENT_CATEGORIES.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>
        <select
          value={form.severity}
          onChange={(event) => setForm((prev) => ({ ...prev, severity: event.target.value }))}
          required
        >
          {SEVERITY_LEVELS.map((severity) => (
            <option key={severity} value={severity}>{severity}</option>
          ))}
        </select>
        <textarea
          value={form.description}
          maxLength={MAX_DESCRIPTION_LENGTH}
          placeholder={t("communityHub.placeholderDesc", "Describe location and issue details")}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
          required
        />
        <input
          type="text"
          value={form.locationName}
          maxLength={100}
          placeholder={t("communityHub.placeholderLocationName", "Location Name or Address")}
          onChange={(event) => setForm((prev) => ({ ...prev, locationName: event.target.value }))}
        />
        <select
          value={form.hashtag}
          onChange={(event) => setForm((prev) => ({ ...prev, hashtag: event.target.value }))}
        >
          <option value="">{t("communityHub.hashtagPlaceholder", "Add a hashtag (optional)")}</option>
          {HASHTAGS.map((hashtag) => (
            <option key={hashtag} value={hashtag}>{hashtag}</option>
          ))}
        </select>
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
            {t("communityHub.processingImage", "Processing image...")}
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
            {locationStatus === 'locating' ? t("communityHub.locating", "Locating...") : t("communityHub.useCurrentLocation", "Use GPS for Location")}
          </button>
          {locationStatus === 'success' && (
            <span className="location-status-text" style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: '500' }}>
              {t("communityHub.locationAttached", "GPS Location attached")}
            </span>
          )}
          {locationStatus === 'error' && (
            <span className="location-status-text" style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: '500' }}>
              {t("communityHub.locationError", "Unable to retrieve location")}
            </span>
          )}
        </div>
        <button type="submit" disabled={isProcessingImage}>
          {isProcessingImage ? t("communityHub.processingImage", "Processing image...") : t("communityHub.submit", "Submit Report")}
        </button>
      </form>
      )}

      <div className="filters-section" style={{ background: 'var(--card)', padding: '15px', borderRadius: '8px', marginBottom: '15px', marginTop: '15px' }}>
        <h4 style={{ margin: '0 0 10px 0' }}>{t("communityHub.filters", "Filters")}</h4>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          <label style={{display: 'flex', flexDirection: 'column', fontSize: '0.85rem'}}>
            {t("communityHub.filterType", "Type")}
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{padding: '5px', marginTop: '4px'}}>
              <option value="All">All Types</option>
              {INCIDENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label style={{display: 'flex', flexDirection: 'column', fontSize: '0.85rem'}}>
            {t("communityHub.filterSeverity", "Severity")}
            <select value={severityFilter} onChange={(e) => setSeverityFilter(e.target.value)} style={{padding: '5px', marginTop: '4px'}}>
              <option value="All">All Severities</option>
              {SEVERITY_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label style={{display: 'flex', flexDirection: 'column', fontSize: '0.85rem'}}>
            {t("communityHub.filterDate", "Date")}
            <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} style={{padding: '5px', marginTop: '4px'}}>
              <option value="All Time">All Time</option>
              <option value="Last 24 Hours">Last 24 Hours</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
            </select>
          </label>
          <label style={{display: 'flex', flexDirection: 'column', fontSize: '0.85rem'}}>
            {t("communityHub.filterLocation", "Location (Search)")}
            <input type="text" value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} placeholder="Search location..." style={{padding: '5px', marginTop: '4px', maxWidth: '150px'}} />
          </label>
        </div>
      </div>

      <div className="filter-tabs" style={{ display: 'flex', gap: '8px', marginBottom: '15px', flexWrap: 'wrap' }}>
        {['All', 'New', 'Under Review', 'Verified', 'Likely', 'Unverified', 'Resolved'].map((statusOption) => (
          <button
            key={statusOption}
            type="button"
            className={filter === statusOption ? 'active' : ''}
            onClick={() => setFilter(statusOption)}
          >
            {filterLabel(statusOption)}
          </button>
        ))}
      </div>

      <div className="filter-tabs" style={{ display: 'flex', gap: '8px', margin: '15px 0', flexWrap: 'wrap' }}>
        {['All', ...HASHTAGS].map((hashtagOption) => (
          <button
            key={hashtagOption}
            type="button"
            className={hashtagFilter === hashtagOption ? 'active' : ''}
            onClick={() => setHashtagFilter(hashtagOption)}
          >
            {hashtagOption}
          </button>
        ))}
      </div>

      <div className="reports-list" style={{ display: 'grid', gap: '15px' }}>
        {filteredReports.length === 0 ? (
          <p className="no-reports">{t("communityHub.noReportsFilter", "No reports found for \"{{filter}}\".", { filter: filterLabel(filter) })}</p>
        ) : (
          filteredReports.map((report) => {
            const isVoted = votedIds.has(report.id);
            const vr = verificationResults[report.id];
            const vrState = vr?.verificationState ?? null;
            const vrScore = vr?.confidenceScore ?? null;
            const vrIsDuplicate = vr?.isDuplicate ?? false;
            const vrBadgeStyle = verificationBadgeStyle(vrState, vrIsDuplicate);
            const vrTooltipText = buildTooltipText(vr);
            return (
              <div key={report.id} className="report-card" style={{ border: '1px solid var(--line)', padding: '15px', borderRadius: '8px', background: 'var(--card)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', gap: '8px', flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', flex: 1, minWidth: 0 }}>{report.title}</h3>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                    <span className={`status-badge ${report.status.toLowerCase().replace(/[^a-z]/g, '')}`} style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', background: report.status.startsWith('Verified') ? '#dcfce7' : '#fef3c7', color: report.status.startsWith('Verified') ? '#166534' : '#92400e' }}>
                      {statusLabel(report.status)}
                    </span>
                    {vrState !== null && (
                      <span
                        className="verification-badge"
                        style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px', ...vrBadgeStyle }}
                      >
                        {vrIsDuplicate
                          ? t('communityHub.statusDuplicate', 'Possible Duplicate')
                          : t('communityHub.verificationBadge', '{{state}} ({{pct}}%)', { state: vrState === 'Verified' ? t('communityHub.filterVerified', 'Verified') : vrState === 'Likely' ? t('communityHub.filterLikely', 'Likely') : t('communityHub.filterUnverified', 'Unverified'), pct: vrScore })}
                        {vrTooltipText && <InfoTooltip text={vrTooltipText} />}
                      </span>
                    )}
                  </div>
                </div>
                <p style={{ margin: '0 0 10px 0', color: 'var(--muted)', fontSize: '0.95rem' }}>{report.description}</p>
                {report.hashtag && (
                  <p className="report-hashtag" style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--brand)' }}>{report.hashtag}</p>
                )}
                {report.image && (
                  <div style={{ marginBottom: '10px' }}>
                    <img src={report.image} alt={report.title} style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '6px', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', color: 'var(--muted)' }}>
                  <span>{t("communityHub.votes", "Votes: {{count}}", { count: report.votes })}</span>
                  <button
                    type="button"
                    onClick={() => vote(report.id)}
                    disabled={isVoted}
                    style={{ padding: '4px 12px', cursor: isVoted ? 'default' : 'pointer' }}
                  >
                    {isVoted ? t("communityHub.voted", "Voted") : t("communityHub.upvoteCount", "Upvote (+1)")}
                  </button>
                </div>

                <div className="report-comments" style={{ marginTop: '12px', borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 600 }}>
                    {t("communityHub.commentsCount", "Comments ({{count}})", { count: (report.comments || []).length })}
                  </p>
                  {(report.comments || []).length === 0 ? (
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--muted)' }}>
                      {t("communityHub.noComments", "No comments yet.")}
                    </p>
                  ) : (
                    <ul style={{ listStyle: 'none', margin: '0 0 10px 0', padding: 0, display: 'grid', gap: '8px' }}>
                      {(report.comments || []).map((comment) => (
                        <li
                          key={comment.id}
                          style={{
                            fontSize: '0.9rem',
                            padding: '8px 10px',
                            background: 'var(--panel)',
                            borderRadius: '6px',
                          }}
                        >
                          <p style={{ margin: 0 }}>{comment.text}</p>
                          <small style={{ color: 'var(--muted)' }}>
                            {new Date(comment.createdAt).toLocaleString()}
                          </small>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      addComment(report.id);
                    }}
                    style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}
                  >
                    <textarea
                      value={commentDrafts[report.id] || ''}
                      maxLength={MAX_COMMENT_LENGTH}
                      placeholder={t("communityHub.commentPlaceholder", "Add a comment...")}
                      onChange={(event) =>
                        setCommentDrafts((prev) => ({
                          ...prev,
                          [report.id]: event.target.value,
                        }))
                      }
                      style={{ flex: 1, minHeight: '60px', resize: 'vertical' }}
                    />
                    <button type="submit" style={{ padding: '6px 12px', whiteSpace: 'nowrap' }}>
                      {t("communityHub.post", "Post")}
                    </button>
                  </form>
                </div>

                {isModerator && (
                  <div
                    className="moderator-panel"
                    style={{
                      marginTop: '12px',
                      borderTop: '1px dashed var(--line)',
                      paddingTop: '10px',
                      display: 'flex',
                      gap: '8px',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                    }}
                  >
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted)', flex: '0 0 auto' }}>
                      {t('communityHub.moderatorPanel', 'Moderator Actions')}:
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMarkSuspicious(report.id)}
                      style={{
                        fontSize: '0.8rem',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: '#fef2f2',
                        color: '#b91c1c',
                        border: '1px solid #fecaca',
                        cursor: 'pointer',
                      }}
                    >
                      {t('communityHub.moderatorMarkSuspicious', 'Mark Suspicious')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeratorVerify(report.id)}
                      style={{
                        fontSize: '0.8rem',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: '#f0fdf4',
                        color: '#166534',
                        border: '1px solid #bbf7d0',
                        cursor: 'pointer',
                      }}
                    >
                      {t('communityHub.moderatorOverrideVerified', 'Override: Verified')}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
