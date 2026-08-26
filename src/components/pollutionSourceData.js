import {
  SOURCE_TYPES,
  POLLUTANT_TYPES,
  SEVERITY_LEVELS,
  SOURCE_STATUS,
  AFFECTED_AREAS,
  WIND_DIRECTIONS,
} from './pollutionSourceTypes';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomSubset = (arr, count) => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);

const SOURCE_NAMES = [
  'Riverside Steel Works', 'Metro Power Station', 'Highway 101 Corridor', 'Green Valley Farms',
  'Central Landfill Site', 'Harbor Refinery Complex', 'Eastside Cement Plant', 'Northgate Chemical Co.',
  'Sunset Construction Zone', 'Downtown Traffic Hub', 'Airport Flight Path', 'Valley Agricultural Belt',
  'Industrial Park West', 'Community Waste Facility', 'Solar Array Station', 'BioGas Processing Unit',
  'Water Treatment Plant', 'Paper Mill Operations', 'Textile Factory District', 'Mining Operations South',
];

const LOCATIONS = [
  { name: 'Downtown Core', lat: 28.6139, lng: 77.2090 },
  { name: 'Industrial District', lat: 28.6280, lng: 77.2195 },
  { name: 'Residential North', lat: 28.6350, lng: 77.2250 },
  { name: 'Harbor Area', lat: 28.5800, lng: 77.1800 },
  { name: 'Airport Zone', lat: 28.5550, lng: 77.1000 },
  { name: 'Agricultural Belt', lat: 28.6800, lng: 77.2800 },
  { name: 'Tech Park', lat: 28.6200, lng: 77.2150 },
  { name: 'Construction Corridor', lat: 28.6400, lng: 77.2300 },
];

const CITIES = [
  'Delhi', 'Mumbai', 'Bangalore', 'Chennai', 'Kolkata',
  'Hyderabad', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
];

export const generatePollutionSources = (count = 20) => {
  const now = Date.now();
  const sources = [];

  for (let i = 0; i < count; i++) {
    const type = randomChoice(Object.keys(SOURCE_TYPES));
    const typeConfig = SOURCE_TYPES[type];
    const location = randomChoice(LOCATIONS);
    const status = randomChoice(Object.keys(SOURCE_STATUS));
    const severity = randomChoice(Object.keys(SEVERITY_LEVELS));
    const lat = location.lat + randomFloat(-0.05, 0.05);
    const lng = location.lng + randomFloat(-0.05, 0.05);

    const pollutants = {};
    Object.keys(POLLUTANT_TYPES).forEach(p => {
      const config = POLLUTANT_TYPES[p];
      pollutants[p] = {
        value: randomFloat(5, config.whoLimit ? config.whoLimit * 3 : 200),
        unit: config.unit,
        whoLimit: config.whoLimit,
        exceedsLimit: config.whoLimit ? Math.random() > 0.5 : false,
      };
    });

    sources.push({
      id: `src-${i}`,
      name: randomChoice(SOURCE_NAMES),
      type,
      ...typeConfig,
      location: location.name,
      lat,
      lng,
      coordinates: `${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`,
      status,
      statusConfig: SOURCE_STATUS[status],
      severity,
      severityConfig: SEVERITY_LEVELS[severity],
      pollutants,
      windSpeed: randomFloat(2, 25),
      windDirection: randomChoice(WIND_DIRECTIONS),
      windDegrees: randomInt(0, 359),
      temperature: randomFloat(15, 42),
      humidity: randomFloat(20, 95),
      particulateMatter: randomFloat(10, 500),
      emissionRate: randomFloat(0.5, 50),
      radius: randomInt(500, 5000),
      affectedPopulation: randomInt(500, 100000),
      affectedAreas: randomSubset(Object.keys(AFFECTED_AREAS), randomInt(1, 3)),
      lastUpdated: new Date(now - randomInt(0, 3600000)).toISOString(),
      firstReported: new Date(now - randomInt(86400000, 30 * 86400000)).toISOString(),
      reportCount: randomInt(1, 25),
      nearestSchool: randomFloat(0.5, 10),
      nearestHospital: randomFloat(1, 15),
      historicalTrend: Array.from({ length: 24 }, () => randomFloat(10, 300)),
      alertLevel: randomChoice(['none', 'watch', 'warning', 'emergency']),
    });
  }

  return sources;
};

export const generateSourceTimeline = (sources) => {
  const timeline = [];
  const now = Date.now();
  const events = [
    'Source detected by monitoring station',
    'Pollution levels exceeded WHO limits',
    'Wind shift detected — potential spread',
    'Nearest school notified of advisory',
    'Emergency response team dispatched',
    'Emission reduction measures initiated',
    'Follow-up air quality sampling completed',
    'Community health advisory issued',
    'Source containment verified',
    'Monitoring frequency increased to hourly',
    'Cross-border pollution drift detected',
    'Mitigation措施 effective — levels dropping',
  ];

  sources.slice(0, 10).forEach((src, sIdx) => {
    const eventCount = randomInt(2, 6);
    for (let i = 0; i < eventCount; i++) {
      const hoursAgo = randomInt(1, 168);
      const ts = new Date(now - hoursAgo * 3600000);
      timeline.push({
        id: `tl-${sIdx}-${i}`,
        sourceId: src.id,
        sourceName: src.name,
        sourceType: src.type,
        event: randomChoice(events),
        severity: randomChoice(Object.keys(SEVERITY_LEVELS)),
        timestamp: ts.toISOString(),
        timeLabel: `${ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${ts.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
      });
    }
  });

  return timeline.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
};

export const generateSpreadSimulation = (source) => {
  const steps = [];
  let lat = source.lat;
  let lng = source.lng;
  const windLat = Math.cos(source.windDegrees * Math.PI / 180) * 0.002;
  const windLng = Math.sin(source.windDegrees * Math.PI / 180) * 0.002;

  for (let t = 0; t < 12; t++) {
    lat += windLat * (1 + t * 0.1);
    lng += windLng * (1 + t * 0.1);
    steps.push({
      time: t,
      lat,
      lng,
      concentration: Math.max(0, source.particulateMatter * Math.exp(-t * 0.2)),
      radius: source.radius * (1 + t * 0.5),
    });
  }
  return steps;
};

export const generateAlertSummary = (sources) => {
  const active = sources.filter(s => s.status === 'active').length;
  const critical = sources.filter(s => s.severity === 'critical' || s.severity === 'emergency').length;
  const totalPop = sources.reduce((sum, s) => sum + s.affectedPopulation, 0);
  const avgPM = sources.reduce((sum, s) => sum + s.particulateMatter, 0) / sources.length;

  return {
    activeSources: active,
    criticalAlerts: critical,
    totalAffectedPopulation: totalPop,
    avgParticulateMatter: avgPM.toFixed(1),
    sourcesByType: Object.keys(SOURCE_TYPES).map(t => ({
      type: t,
      ...SOURCE_TYPES[t],
      count: sources.filter(s => s.type === t).length,
    })).filter(t => t.count > 0),
    sourcesBySeverity: Object.keys(SEVERITY_LEVELS).map(s => ({
      severity: s,
      ...SEVERITY_LEVELS[s],
      count: sources.filter(src => src.severity === s).length,
    })),
    topPollutedSources: [...sources].sort((a, b) => b.particulateMatter - a.particulateMatter).slice(0, 5),
  };
};

export const generateWeeklyTrend = (weeks = 8) => {
  const data = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    data.push({
      week: `W${weeks - i}`,
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      activeSources: randomInt(5, 20),
      avgPM25: randomFloat(20, 150),
      avgPM10: randomFloat(30, 200),
      alerts: randomInt(2, 15),
      resolved: randomInt(1, 10),
      populationExposed: randomInt(10000, 100000),
    });
  }
  return data;
};

export { CITIES };
