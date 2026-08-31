import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  haversineDistanceKm,
  findNearbyReports,
  detectDuplicates,
  deriveVerificationState,
  computeVerificationScore,
} from './verificationService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** @param {Partial<Object>} overrides */
function makeReport(overrides = {}) {
  return {
    id: 'r1',
    title: 'Factory Smoke',
    description: 'Heavy black smoke coming from the factory chimney.',
    hashtag: '#StubbleBurning',
    votes: 0,
    createdAt: new Date().toISOString(),
    status: 'Pending',
    verifiedAt: '',
    moderationNotes: '',
    latitude: 28.6139,
    longitude: 77.209,
    comments: [],
    ...overrides,
  };
}

/** Builds a minimal AQI data payload matching the shape from fetchAirQualityByCoords. */
function makeAqiData({ us_aqi = 200, pm2_5 = 80, pm10 = 60 } = {}) {
  return {
    current: { us_aqi, pm2_5, pm10, nitrogen_dioxide: null, ozone: null, carbon_monoxide: null },
  };
}

// ─── haversineDistanceKm ──────────────────────────────────────────────────────

describe('haversineDistanceKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistanceKm(28.6139, 77.209, 28.6139, 77.209)).toBe(0);
  });

  it('computes ~11 km between Delhi (28.6139, 77.209) and Gurgaon (28.459, 77.026)', () => {
    const dist = haversineDistanceKm(28.6139, 77.209, 28.459, 77.026);
    // Approximately 22 km, allow ±5 km tolerance
    expect(dist).toBeGreaterThan(17);
    expect(dist).toBeLessThan(27);
  });

  it('computes ~0.14 km for a 200m offset in latitude', () => {
    // 0.002 degrees latitude ≈ 222 m
    const dist = haversineDistanceKm(28.6139, 77.209, 28.6159, 77.209);
    expect(dist).toBeGreaterThan(0.15);
    expect(dist).toBeLessThan(0.3);
  });

  it('returns a positive value regardless of argument order', () => {
    const d1 = haversineDistanceKm(28.6139, 77.209, 19.076, 72.877);
    const d2 = haversineDistanceKm(19.076, 72.877, 28.6139, 77.209);
    expect(d1).toBeCloseTo(d2, 5);
  });
});

// ─── findNearbyReports ────────────────────────────────────────────────────────

describe('findNearbyReports', () => {
  const target = makeReport({ id: 'target', latitude: 28.6139, longitude: 77.209 });

  it('excludes the target report itself', () => {
    const reports = [target, makeReport({ id: 'r2', latitude: 28.6140, longitude: 77.209 })];
    const result = findNearbyReports(target, reports);
    expect(result.every((r) => r.id !== 'target')).toBe(true);
  });

  it('includes geotagged reports within 5 km', () => {
    const nearby = makeReport({ id: 'nearby', latitude: 28.615, longitude: 77.21 });
    const reports = [target, nearby];
    expect(findNearbyReports(target, reports)).toHaveLength(1);
  });

  it('excludes reports beyond 5 km', () => {
    const far = makeReport({ id: 'far', latitude: 19.076, longitude: 72.877 });
    const reports = [target, far];
    expect(findNearbyReports(target, reports)).toHaveLength(0);
  });

  it('excludes reports older than 7 days', () => {
    const old = makeReport({
      id: 'old',
      latitude: 28.615,
      longitude: 77.21,
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const reports = [target, old];
    expect(findNearbyReports(target, reports)).toHaveLength(0);
  });

  it('excludes reports without valid GPS coordinates', () => {
    const noGps = makeReport({ id: 'nogps', latitude: null, longitude: null });
    const reports = [target, noGps];
    expect(findNearbyReports(target, reports)).toHaveLength(0);
  });

  it('returns empty array when target has no GPS', () => {
    const noGpsTarget = makeReport({ id: 't', latitude: null, longitude: null });
    const reports = [noGpsTarget, makeReport({ id: 'r2' })];
    expect(findNearbyReports(noGpsTarget, reports)).toHaveLength(0);
  });
});

// ─── detectDuplicates ────────────────────────────────────────────────────────

describe('detectDuplicates', () => {
  it('returns isDuplicate: false for a unique report', () => {
    const target = makeReport({ id: 'target' });
    const other = makeReport({
      id: 'other',
      latitude: 19.076,
      longitude: 72.877, // far away
    });
    expect(detectDuplicates(target, [target, other])).toEqual({
      isDuplicate: false,
      duplicateOf: null,
    });
  });

  it('detects duplicate when within 200 m, 30 min, same hashtag', () => {
    const now = new Date().toISOString();
    const target = makeReport({ id: 'target', createdAt: now, hashtag: '#StubbleBurning' });
    const dupe = makeReport({
      id: 'dupe',
      latitude: 28.6141, // ~22 m away
      longitude: 77.209,
      createdAt: now,
      hashtag: '#StubbleBurning',
    });
    const { isDuplicate, duplicateOf } = detectDuplicates(target, [target, dupe]);
    expect(isDuplicate).toBe(true);
    expect(duplicateOf).toBe('dupe');
  });

  it('detects duplicate via title word overlap', () => {
    const now = new Date().toISOString();
    const target = makeReport({ id: 'target', title: 'Smoke from factory chimney', createdAt: now, hashtag: '' });
    const dupe = makeReport({
      id: 'dupe',
      latitude: 28.6141,
      longitude: 77.209,
      createdAt: now,
      title: 'Factory chimney emitting smoke',
      hashtag: '',
    });
    expect(detectDuplicates(target, [target, dupe]).isDuplicate).toBe(true);
  });

  it('does not flag reports beyond 200 m as duplicates', () => {
    const now = new Date().toISOString();
    const target = makeReport({ id: 'target', createdAt: now, hashtag: '#StubbleBurning' });
    const far = makeReport({
      id: 'far',
      latitude: 28.62, // >1 km away
      longitude: 77.21,
      createdAt: now,
      hashtag: '#StubbleBurning',
    });
    expect(detectDuplicates(target, [target, far]).isDuplicate).toBe(false);
  });

  it('does not flag reports more than 30 min apart as duplicates', () => {
    const target = makeReport({ id: 'target', hashtag: '#StubbleBurning' });
    const old = makeReport({
      id: 'old',
      latitude: 28.6141,
      longitude: 77.209,
      createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      hashtag: '#StubbleBurning',
    });
    expect(detectDuplicates(target, [target, old]).isDuplicate).toBe(false);
  });

  it('returns isDuplicate: false when target has no GPS', () => {
    const target = makeReport({ id: 'target', latitude: null, longitude: null });
    expect(detectDuplicates(target, [target]).isDuplicate).toBe(false);
  });
});

// ─── deriveVerificationState ─────────────────────────────────────────────────

describe('deriveVerificationState', () => {
  it('returns Verified for score >= 80', () => {
    expect(deriveVerificationState(80)).toBe('Verified');
    expect(deriveVerificationState(100)).toBe('Verified');
  });

  it('returns Likely for score 50–79', () => {
    expect(deriveVerificationState(50)).toBe('Likely');
    expect(deriveVerificationState(79)).toBe('Likely');
  });

  it('returns Unverified for score < 50', () => {
    expect(deriveVerificationState(49)).toBe('Unverified');
    expect(deriveVerificationState(0)).toBe('Unverified');
  });
});

// ─── computeVerificationScore ────────────────────────────────────────────────

describe('computeVerificationScore', () => {
  it('awards full 30 pts for 3+ nearby reports', () => {
    const report = makeReport();
    const nearbyReports = [makeReport({ id: 'n1' }), makeReport({ id: 'n2' }), makeReport({ id: 'n3' })];
    const result = computeVerificationScore(report, { nearbyReports });
    const nearbyFactor = result.factors.find((f) => f.label === 'verificationNearby');
    expect(nearbyFactor.score).toBe(30);
  });

  it('awards 10 pts for 1 nearby report', () => {
    const report = makeReport();
    const nearbyReports = [makeReport({ id: 'n1' })];
    const result = computeVerificationScore(report, { nearbyReports });
    const nearbyFactor = result.factors.find((f) => f.label === 'verificationNearby');
    expect(nearbyFactor.score).toBe(10);
  });

  it('awards 25 AQI pts when AQI >= 150 and report has GPS', () => {
    const report = makeReport();
    const aqiData = makeAqiData({ us_aqi: 200 });
    const result = computeVerificationScore(report, { aqiData });
    const aqiFactor = result.factors.find((f) => f.label === 'verificationAqi');
    expect(aqiFactor.score).toBe(25);
  });

  it('awards 0 AQI pts when report has no GPS', () => {
    const report = makeReport({ latitude: null, longitude: null });
    const aqiData = makeAqiData({ us_aqi: 200 });
    const result = computeVerificationScore(report, { aqiData });
    const aqiFactor = result.factors.find((f) => f.label === 'verificationAqi');
    expect(aqiFactor.score).toBe(0);
  });

  it('awards 20 pollutant pts for #StubbleBurning with PM2.5 >= 35', () => {
    const report = makeReport({ hashtag: '#StubbleBurning' });
    const aqiData = makeAqiData({ pm2_5: 40 });
    const result = computeVerificationScore(report, { aqiData });
    const factor = result.factors.find((f) => f.label === 'verificationPollutant');
    expect(factor.score).toBe(20);
  });

  it('awards 15 vote pts for >= 5 votes', () => {
    const report = makeReport({ votes: 7 });
    const result = computeVerificationScore(report, {});
    const voteFactor = result.factors.find((f) => f.label === 'verificationVotes');
    expect(voteFactor.score).toBe(15);
  });

  it('awards 0 vote pts for 0 votes', () => {
    const report = makeReport({ votes: 0 });
    const result = computeVerificationScore(report, {});
    const voteFactor = result.factors.find((f) => f.label === 'verificationVotes');
    expect(voteFactor.score).toBe(0);
  });

  it('awards full 10 freshness pts for a report just submitted', () => {
    const report = makeReport({ createdAt: new Date().toISOString() });
    const result = computeVerificationScore(report, {});
    const freshFactor = result.factors.find((f) => f.label === 'verificationFreshness');
    expect(freshFactor.score).toBe(10);
  });

  it('awards 0 freshness pts for a report older than 3 days', () => {
    const old = makeReport({
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    });
    const result = computeVerificationScore(old, {});
    const freshFactor = result.factors.find((f) => f.label === 'verificationFreshness');
    expect(freshFactor.score).toBe(0);
  });

  it('caps duplicate reports at score 10', () => {
    const now = new Date().toISOString();
    const target = makeReport({ id: 'target', createdAt: now, hashtag: '#StubbleBurning' });
    const dupe = makeReport({
      id: 'dupe',
      latitude: 28.6141,
      longitude: 77.209,
      createdAt: now,
      hashtag: '#StubbleBurning',
    });
    const nearbyReports = [dupe, makeReport({ id: 'n2' }), makeReport({ id: 'n3' })];
    const aqiData = makeAqiData({ us_aqi: 200, pm2_5: 60 });
    const result = computeVerificationScore(target, {
      aqiData,
      nearbyReports,
      allReports: [target, dupe],
    });
    expect(result.isDuplicate).toBe(true);
    expect(result.confidenceScore).toBeLessThanOrEqual(10);
    expect(result.verificationState).toBe('Unverified');
  });

  it('moderatorOverride verified → score 100, state Verified', () => {
    const report = makeReport({ moderatorOverride: 'verified' });
    const result = computeVerificationScore(report);
    expect(result.confidenceScore).toBe(100);
    expect(result.verificationState).toBe('Verified');
  });

  it('moderatorOverride unverified → score 0, state Unverified', () => {
    const report = makeReport({ votes: 100, moderatorOverride: 'unverified' });
    const result = computeVerificationScore(report);
    expect(result.confidenceScore).toBe(0);
    expect(result.verificationState).toBe('Unverified');
  });

  it('returns a score of 0 for a report with no data', () => {
    const report = makeReport({ votes: 0, latitude: null, longitude: null });
    const result = computeVerificationScore(report, {});
    // Only freshness (10 pts for fresh) can contribute
    expect(result.confidenceScore).toBeLessThanOrEqual(10);
    expect(result.factors).toHaveLength(6);
  });

  it('composite score does not exceed 100', () => {
    const report = makeReport({ votes: 100 });
    const aqiData = makeAqiData({ us_aqi: 300, pm2_5: 200 });
    const nearbyReports = [
      makeReport({ id: 'n1' }),
      makeReport({ id: 'n2' }),
      makeReport({ id: 'n3' }),
      makeReport({ id: 'n4' }),
    ];
    const result = computeVerificationScore(report, { aqiData, nearbyReports });
    expect(result.confidenceScore).toBeLessThanOrEqual(100);
  });
});
