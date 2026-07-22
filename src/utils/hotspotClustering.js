const EARTH_RADIUS_METERS = 6371000;

/**
 * Great-circle distance between two lat/lon points, in meters.
 */
export function haversineDistanceMeters(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Groups reports that are geographically close (within radiusMeters of a
 * cluster's running centroid) and recent (within windowDays of `now`) into
 * hotspots.
 *
 * This is a single-pass, order-independent greedy clustering: reports are
 * processed oldest-first, each report joins the first existing cluster whose
 * centroid it falls within the radius of, or starts a new cluster otherwise.
 * The centroid is recomputed as the running average of member coordinates
 * each time a report joins, so a hotspot can "drift" slightly as more reports
 * accumulate — deliberately simple and deterministic rather than a full
 * iterative reassignment (e.g. k-means), since hotspot membership only needs
 * to be good enough to surface an aggregated signal, not globally optimal.
 *
 * Reports without both `lat` and `lon` are skipped entirely (can't be
 * clustered) and are not included in any hotspot or in the returned
 * `unclustered` list's distance calculations.
 *
 * @param {Array} reports - report objects with id, lat, lon, votes, createdAt, status
 * @param {Object} [options]
 * @param {number} [options.radiusMeters=500]
 * @param {number} [options.windowDays=7]
 * @param {Date}   [options.now=new Date()]
 * @param {number} [options.escalationThreshold=3] - min report count to flag hotspot.escalationReady
 * @returns {{ hotspots: Array, skipped: Array }}
 */
export function clusterReports(
  reports,
  {
    radiusMeters = 500,
    windowDays = 7,
    now = new Date(),
    escalationThreshold = 3,
  } = {}
) {
  const nowMs = now.getTime();
  const windowMs = windowDays * 24 * 60 * 60 * 1000;

  const skipped = [];
  const eligible = [];

  for (const report of reports) {
    const hasGeo = typeof report.lat === "number" && typeof report.lon === "number";
    const createdMs = new Date(report.createdAt).getTime();
    const isRecent = Number.isFinite(createdMs) && nowMs - createdMs <= windowMs;

    if (!hasGeo || !isRecent) {
      skipped.push(report);
      continue;
    }
    eligible.push(report);
  }

  // Oldest first, so a hotspot's "anchor" is its earliest report.
  eligible.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const clusters = [];

  for (const report of eligible) {
    const point = { lat: report.lat, lon: report.lon };
    const cluster = clusters.find(
      (c) => haversineDistanceMeters(c.centroid, point) <= radiusMeters
    );

    if (cluster) {
      cluster.reports.push(report);
      const n = cluster.reports.length;
      cluster.centroid = {
        lat: cluster.centroid.lat + (point.lat - cluster.centroid.lat) / n,
        lon: cluster.centroid.lon + (point.lon - cluster.centroid.lon) / n,
      };
    } else {
      clusters.push({ centroid: point, reports: [report] });
    }
  }

  const hotspots = clusters.map((cluster, index) => {
    const { reports: members, centroid } = cluster;
    const totalVotes = members.reduce((sum, r) => sum + (r.votes || 0), 0);
    const createdDates = members.map((r) => new Date(r.createdAt));

    return {
      id: `hotspot-${index}`,
      centerLat: centroid.lat,
      centerLon: centroid.lon,
      reportCount: members.length,
      // Votes are used as a proxy for perceived severity in the absence of a
      // dedicated severity field on individual reports.
      averageSeverity: totalVotes / members.length,
      reportIds: members.map((r) => r.id),
      earliestReportAt: new Date(Math.min(...createdDates)).toISOString(),
      latestReportAt: new Date(Math.max(...createdDates)).toISOString(),
      escalationReady: members.length >= escalationThreshold,
    };
  });

  return { hotspots, skipped };
}

export default clusterReports;
