/**
 * Community Pollution Verification Service (#867)
 *
 * Pure, side-effect-free functions that compute a verification confidence
 * score for a community pollution report. Consumed by CommunityHub and LocationMap.
 *
 * Scoring model (max 100 pts):
 *   Factor 1 – Nearby reports      30 pts  (10 × geotagged reports within 5 km, last 7 days, max 3)
 *   Factor 2 – Official AQI level  25 pts  (requires GPS on report)
 *   Factor 3 – Pollutant-type match 20 pts (hashtag/title vs live pollutant levels)
 *   Factor 4 – Community votes     15 pts  (based on report.votes)
 *   Factor 5 – Timestamp freshness 10 pts  (age of report in hours/days)
 *
 * Moderator overrides short-circuit scoring:
 *   moderatorOverride = 'verified'   → score 100, state 'Verified'
 *   moderatorOverride = 'unverified' → score 0,   state 'Unverified'
 *
 * Duplicate detection: if another report is within 200 m AND within 30 min AND
 * shares hashtag or >50% title-word overlap, confidence is capped at 10.
 */

const NEARBY_RADIUS_KM = 5;
const NEARBY_MAX_DAYS = 7;
const NEARBY_MAX_REPORTS = 3;
const NEARBY_PTS_EACH = 10;

const DUPLICATE_RADIUS_KM = 0.2; // 200 m
const DUPLICATE_TIME_MS = 30 * 60 * 1000; // 30 minutes
const DUPLICATE_WORD_OVERLAP_THRESHOLD = 0.5;
const DUPLICATE_SCORE_CAP = 10;

const EARTH_RADIUS_KM = 6371;

// ─── Distance ────────────────────────────────────────────────────────────────

/**
 * Computes the great-circle distance between two geographic points using the
 * Haversine formula.
 *
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number} Distance in kilometres.
 */
export function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Nearby report collection ────────────────────────────────────────────────

/**
 * Returns geotagged reports within `radiusKm` of the target report, excluding
 * the target itself and reports older than NEARBY_MAX_DAYS days.
 *
 * @param {Object} targetReport - The report being verified.
 * @param {Object[]} allReports - Full list of community reports.
 * @param {number} [radiusKm] - Search radius in km (default: 5).
 * @returns {Object[]} Matching nearby reports.
 */
export function findNearbyReports(targetReport, allReports, radiusKm = NEARBY_RADIUS_KM) {
  if (
    typeof targetReport.latitude !== 'number' ||
    typeof targetReport.longitude !== 'number'
  ) {
    return [];
  }

  const cutoffMs = Date.now() - NEARBY_MAX_DAYS * 24 * 60 * 60 * 1000;

  return allReports.filter((report) => {
    if (report.id === targetReport.id) return false;
    if (typeof report.latitude !== 'number' || typeof report.longitude !== 'number') {
      return false;
    }
    const age = new Date(report.createdAt).getTime();
    if (isNaN(age) || age < cutoffMs) return false;
    const dist = haversineDistanceKm(
      targetReport.latitude,
      targetReport.longitude,
      report.latitude,
      report.longitude
    );
    return dist <= radiusKm;
  });
}

// ─── Duplicate detection ─────────────────────────────────────────────────────

/**
 * Tokenises a string into lowercase words (min 3 chars) for overlap comparison.
 * @param {string} str
 * @returns {string[]}
 */
function tokenize(str) {
  if (typeof str !== 'string') return [];
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length >= 3);
}

/**
 * Checks whether `targetReport` is a probable duplicate of an existing report.
 *
 * A report is considered a duplicate when another report:
 *   1. Is within DUPLICATE_RADIUS_KM (200 m).
 *   2. Was submitted within DUPLICATE_TIME_MS (30 min) of the target.
 *   3. Shares the same hashtag OR has > 50% title-word overlap.
 *
 * @param {Object} targetReport
 * @param {Object[]} allReports
 * @returns {{ isDuplicate: boolean, duplicateOf: string|null }}
 */
export function detectDuplicates(targetReport, allReports) {
  if (
    typeof targetReport.latitude !== 'number' ||
    typeof targetReport.longitude !== 'number'
  ) {
    return { isDuplicate: false, duplicateOf: null };
  }

  const targetTimeMs = new Date(targetReport.createdAt).getTime();
  const targetWords = tokenize(targetReport.title);

  for (const report of allReports) {
    if (report.id === targetReport.id) continue;
    if (typeof report.latitude !== 'number' || typeof report.longitude !== 'number') {
      continue;
    }

    const dist = haversineDistanceKm(
      targetReport.latitude,
      targetReport.longitude,
      report.latitude,
      report.longitude
    );
    if (dist > DUPLICATE_RADIUS_KM) continue;

    const reportTimeMs = new Date(report.createdAt).getTime();
    if (Math.abs(targetTimeMs - reportTimeMs) > DUPLICATE_TIME_MS) continue;

    // Same hashtag (both must be non-empty to avoid false matches)
    if (
      targetReport.hashtag &&
      report.hashtag &&
      targetReport.hashtag === report.hashtag
    ) {
      return { isDuplicate: true, duplicateOf: report.id };
    }

    // Title word overlap
    const reportWords = tokenize(report.title);
    if (targetWords.length > 0 && reportWords.length > 0) {
      const intersection = targetWords.filter((w) => reportWords.includes(w));
      const overlap =
        intersection.length / Math.max(targetWords.length, reportWords.length);
      if (overlap >= DUPLICATE_WORD_OVERLAP_THRESHOLD) {
        return { isDuplicate: true, duplicateOf: report.id };
      }
    }
  }

  return { isDuplicate: false, duplicateOf: null };
}

// ─── Verification state ──────────────────────────────────────────────────────

/**
 * Maps a 0–100 confidence score to a human-readable verification state.
 *
 * @param {number} score
 * @returns {'Verified' | 'Likely' | 'Unverified'}
 */
export function deriveVerificationState(score) {
  if (score >= 80) return 'Verified';
  if (score >= 50) return 'Likely';
  return 'Unverified';
}

// ─── Scoring ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} VerificationFactor
 * @property {string} label - i18n key for the factor label (used by CommunityHub).
 * @property {number} score - Points this factor contributed.
 * @property {number} max   - Maximum points this factor could contribute.
 */

/**
 * @typedef {Object} VerificationResult
 * @property {number} confidenceScore                          - Total score 0–100.
 * @property {'Verified'|'Likely'|'Unverified'} verificationState
 * @property {boolean}     isDuplicate   - True when a probable duplicate was detected.
 * @property {string|null} duplicateOf   - ID of the report this appears to duplicate.
 * @property {number}      nearbyCount   - Number of nearby geotagged reports found.
 * @property {VerificationFactor[]} factors - Breakdown for tooltip display.
 */

/**
 * Computes the verification confidence score for a single community report.
 *
 * All inputs are optional/nullable so the function degrades gracefully when AQI
 * data or geolocation is absent — the relevant factors simply contribute 0 pts.
 *
 * @param {Object} report - The community report object.
 * @param {Object} [options={}]
 * @param {Object|null} [options.aqiData]       - Live AQI data from fetchAirQualityByCoords.
 * @param {Object[]}    [options.nearbyReports]  - Pre-computed nearby report list.
 * @param {Object[]}    [options.allReports]     - Full report list (for duplicate check).
 * @returns {VerificationResult}
 */
export function computeVerificationScore(
  report,
  { aqiData = null, nearbyReports = [], allReports = [] } = {}
) {
  // ── Moderator overrides short-circuit everything ──────────────────────────
  if (report.moderatorOverride === 'verified') {
    return {
      confidenceScore: 100,
      verificationState: 'Verified',
      isDuplicate: false,
      duplicateOf: null,
      nearbyCount: nearbyReports.length,
      factors: [{ label: 'verificationNearby', score: 100, max: 100 }],
    };
  }
  if (report.moderatorOverride === 'unverified') {
    return {
      confidenceScore: 0,
      verificationState: 'Unverified',
      isDuplicate: false,
      duplicateOf: null,
      nearbyCount: nearbyReports.length,
      factors: [{ label: 'verificationNearby', score: 0, max: 100 }],
    };
  }

  // ── Factor 1: Nearby reports (max 30 pts) ────────────────────────────────
  const cappedNearby = Math.min(nearbyReports.length, NEARBY_MAX_REPORTS);
  const nearbyScore = cappedNearby * NEARBY_PTS_EACH;

  // ── Factor 2: Official AQI level (max 25 pts, requires GPS) ─────────────
  let aqiScore = 0;
  const currentAqi = aqiData?.current?.us_aqi ?? null;
  const hasGps =
    typeof report.latitude === 'number' && typeof report.longitude === 'number';

  if (hasGps && typeof currentAqi === 'number' && Number.isFinite(currentAqi)) {
    if (currentAqi >= 150) aqiScore = 25;
    else if (currentAqi >= 100) aqiScore = 15;
    else if (currentAqi > 50) aqiScore = 8;
  }

  // ── Factor 3: Pollutant-type match (max 20 pts) ──────────────────────────
  let pollutantScore = 0;
  const combinedText =
    `${report.hashtag || ''} ${report.title || ''}`.toLowerCase();
  const pm25 = aqiData?.current?.pm2_5 ?? null;
  const pm10 = aqiData?.current?.pm10 ?? null;

  if (hasGps && aqiData) {
    const isBurning =
      combinedText.includes('#stubbleburning') ||
      combinedText.includes('burning') ||
      combinedText.includes('fire') ||
      combinedText.includes('smoke');
    const isDust =
      combinedText.includes('#cleanair') ||
      combinedText.includes('dust') ||
      combinedText.includes('traffic');

    if (isBurning) {
      if (typeof pm25 === 'number' && pm25 >= 35) {
        pollutantScore = 20;
      } else if (typeof currentAqi === 'number' && currentAqi >= 100) {
        pollutantScore = 10;
      }
    } else if (isDust) {
      if (typeof pm10 === 'number' && pm10 >= 45) {
        pollutantScore = 20;
      } else if (typeof currentAqi === 'number' && currentAqi >= 100) {
        pollutantScore = 10;
      }
    } else {
      // General report — fall back to overall AQI
      if (typeof currentAqi === 'number') {
        if (currentAqi >= 150) pollutantScore = 20;
        else if (currentAqi >= 100) pollutantScore = 10;
      }
    }
  }

  // ── Factor 4: Community votes (max 15 pts) ───────────────────────────────
  const votes = typeof report.votes === 'number' ? report.votes : 0;
  let votesScore = 0;
  if (votes >= 5) votesScore = 15;
  else if (votes >= 3) votesScore = 10;
  else if (votes >= 1) votesScore = 5;

  // ── Factor 5: Timestamp freshness (max 10 pts) ───────────────────────────
  let freshnessScore = 0;
  const ageHours =
    (Date.now() - new Date(report.createdAt).getTime()) / 3_600_000;
  if (ageHours <= 6) freshnessScore = 10;
  else if (ageHours <= 24) freshnessScore = 7;
  else if (ageHours <= 72) freshnessScore = 4;

  const rawScore =
    nearbyScore + aqiScore + pollutantScore + votesScore + freshnessScore;

  // ── Duplicate detection ──────────────────────────────────────────────────
  const { isDuplicate, duplicateOf } = detectDuplicates(report, allReports);

  // Duplicates are capped to DUPLICATE_SCORE_CAP (10 pts)
  const confidenceScore = Math.min(
    isDuplicate ? Math.min(rawScore, DUPLICATE_SCORE_CAP) : rawScore,
    100
  );

  const verificationState = isDuplicate
    ? 'Unverified'
    : deriveVerificationState(confidenceScore);

  return {
    confidenceScore,
    verificationState,
    isDuplicate,
    duplicateOf,
    nearbyCount: nearbyReports.length,
    factors: [
      { label: 'verificationNearby',    score: nearbyScore,     max: 30 },
      { label: 'verificationAqi',       score: aqiScore,        max: 25 },
      { label: 'verificationPollutant', score: pollutantScore,  max: 20 },
      { label: 'verificationVotes',     score: votesScore,      max: 15 },
      { label: 'verificationFreshness', score: freshnessScore,  max: 10 },
    ],
  };
}
