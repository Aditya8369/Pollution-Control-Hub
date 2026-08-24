import {
  RISK_CATEGORIES,
  VULNERABLE_GROUPS,
  HEALTH_OUTCOMES,
  RECOMMENDATION_LEVELS,
  POLLUTANT_HEALTH_EFFECTS,
  AQI_BANDS,
  getAQIBand,
} from './healthRiskTypes';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomSubset = (arr, count) => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);

const CITIES = [
  { name: 'Delhi', lat: 28.6139, lng: 77.2090, baseAQI: 180 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, baseAQI: 120 },
  { name: 'Beijing', lat: 39.9042, lng: 116.4074, baseAQI: 160 },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792, baseAQI: 140 },
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125, baseAQI: 200 },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357, baseAQI: 150 },
  { name: 'Jakarta', lat: -6.2088, lng: 106.8456, baseAQI: 130 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, baseAQI: 80 },
  { name: 'London', lat: 51.5074, lng: -0.1278, baseAQI: 60 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, baseAQI: 40 },
];

export const generatePersonalRiskProfile = () => {
  const groups = randomSubset(Object.keys(VULNERABLE_GROUPS), randomInt(0, 3));
  const conditions = randomSubset(Object.keys(RISK_CATEGORIES), randomInt(1, 3));

  return {
    id: 'profile-1',
    name: 'Sample User',
    age: randomInt(18, 70),
    vulnerableGroups: groups,
    conditions,
    riskMultiplier: groups.reduce((m, g) => m * (VULNERABLE_GROUPS[g]?.multiplier || 1), 1),
    baselineHealth: randomChoice(['excellent', 'good', 'fair', 'poor']),
    outdoorExposure: randomFloat(1, 12),
    indoorProtection: randomChoice(['none', 'basic', 'moderate', 'advanced']),
  };
};

export const generateCityRiskData = () => {
  return CITIES.map(city => {
    const aqi = city.baseAQI + randomInt(-30, 30);
    const band = getAQIBand(aqi);
    const recommendation = RECOMMENDATION_LEVELS[band.recommendation];

    return {
      ...city,
      aqi,
      band,
      recommendation,
      pm25: randomFloat(5, aqi * 0.8),
      pm10: randomFloat(10, aqi * 1.2),
      no2: randomFloat(5, aqi * 0.4),
      o3: randomFloat(20, aqi * 0.6),
      so2: randomFloat(2, aqi * 0.2),
      co: randomFloat(0.5, aqi * 0.05),
      riskScore: randomFloat(0.1, 0.95),
      vulnerablePopulation: randomInt(50000, 2000000),
      hospitalAdmissions: randomInt(10, 500),
      respiratoryCases: randomInt(100, 5000),
      cardiovascularCases: randomInt(50, 2000),
    };
  });
};

export const generateHealthOutcomesByPollutant = () => {
  return Object.entries(POLLUTANT_HEALTH_EFFECTS).map(([key, config]) => ({
    pollutant: key,
    ...config,
    currentLevel: randomFloat(config.threshold_low * 0.5, config.threshold_high * 1.5),
    exceedsThreshold: Math.random() > 0.4,
    affectedPopulation: randomInt(10000, 500000),
    estimatedCases: randomInt(50, 5000),
    riskLevel: Math.random() > 0.6 ? 'high' : Math.random() > 0.3 ? 'moderate' : 'low',
  }));
};

export const generateVulnerableGroupBreakdown = () => {
  return Object.entries(VULNERABLE_GROUPS).map(([key, config]) => ({
    group: key,
    ...config,
    population: randomInt(50000, 1000000),
    riskLevel: randomChoice(['low', 'moderate', 'high', 'critical']),
    avgExposure: randomFloat(1, 16),
    symptomsReported: randomInt(100, 10000),
    hospitalizations: randomInt(10, 500),
  }));
};

export const generateDailyRiskTimeline = (days = 7) => {
  const data = [];
  const now = new Date();

  for (let d = days - 1; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const baseAQI = 80 + randomInt(-30, 100);
    const band = getAQIBand(baseAQI);

    data.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
      aqi: baseAQI,
      band: band.label,
      color: band.color,
      respiratoryRisk: randomFloat(0.1, 0.9),
      cardiovascularRisk: randomFloat(0.05, 0.7),
      neurologicalRisk: randomFloat(0.02, 0.5),
      overallRisk: randomFloat(0.1, 0.85),
      outdoorSafety: Math.max(0, 100 - baseAQI * 0.8),
      indoorSafety: randomFloat(60, 95),
    });
  }
  return data;
};

export const generateHourlyAQI = (hours = 24) => {
  const data = [];
  for (let h = 0; h < hours; h++) {
    const hourAQI = 60 + Math.sin(h / 24 * Math.PI * 2) * 40 + randomInt(-15, 15);
    data.push({
      hour: `${String(h).padStart(2, '0')}:00`,
      aqi: Math.max(10, Math.min(500, hourAQI)),
      band: getAQIBand(Math.max(10, Math.min(500, hourAQI))).label,
    });
  }
  return data;
};

export const generateRecommendations = (aqi, profile) => {
  const band = getAQIBand(aqi);
  const baseRec = RECOMMENDATION_LEVELS[band.recommendation];
  const multiplier = profile?.riskMultiplier || 1;
  const adjustedAQI = aqi * multiplier;

  const allRecs = [
    { category: 'outdoor', label: 'Outdoor Activities', priority: adjustedAQI > 150 ? 'avoid' : adjustedAQI > 100 ? 'limit' : 'safe', description: adjustedAQI > 150 ? 'Avoid all outdoor exertion' : adjustedAQI > 100 ? 'Reduce prolonged outdoor activities' : 'Normal outdoor activities are safe' },
    { category: 'indoor', label: 'Indoor Air Quality', priority: adjustedAQI > 200 ? 'critical' : adjustedAQI > 100 ? 'important' : 'normal', description: adjustedAQI > 200 ? 'Seal windows, run HEPA purifiers on high' : adjustedAQI > 100 ? 'Close windows, use air purifiers' : 'Good time to ventilate your home' },
    { category: 'mask', label: 'Mask Usage', priority: adjustedAQI > 200 ? 'required' : adjustedAQI > 100 ? 'recommended' : 'optional', description: adjustedAQI > 200 ? 'Wear N95/KN95 masks outdoors' : adjustedAQI > 100 ? 'Consider wearing masks during outdoor activities' : 'No mask needed for most people' },
    { category: 'exercise', label: 'Exercise', priority: adjustedAQI > 150 ? 'indoor_only' : adjustedAQI > 100 ? 'reduced' : 'normal', description: adjustedAQI > 150 ? 'Switch to indoor exercises only' : adjustedAQI > 100 ? 'Reduce intensity and duration' : 'Normal exercise routine is fine' },
    { category: 'children', label: 'Children & Elderly', priority: adjustedAQI > 100 ? 'restrict' : 'normal', description: adjustedAQI > 100 ? 'Keep children and elderly indoors' : 'No special restrictions needed' },
    { category: 'hydration', label: 'Hydration', priority: adjustedAQI > 150 ? 'increase' : 'normal', description: adjustedAQI > 150 ? 'Drink extra water to help flush toxins' : 'Maintain normal hydration' },
  ];

  if (profile?.conditions?.includes('respiratory')) {
    allRecs.push({ category: 'medication', label: 'Medication', priority: 'check', description: 'Ensure rescue inhaler/medication is accessible. Consult doctor if symptoms worsen.' });
  }

  return allRecs;
};

export const generateRiskTrend = (weeks = 8) => {
  const data = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    data.push({
      week: `W${weeks - i}`,
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      avgAQI: randomInt(50, 200),
      respiratoryRisk: randomFloat(0.2, 0.8),
      cardiovascularRisk: randomFloat(0.1, 0.6),
      vulnerableExposed: randomInt(100000, 500000),
      hospitalAdmissions: randomInt(50, 300),
      recommendation: randomChoice(['safe', 'moderate', 'unhealthy_sensitive', 'unhealthy']),
    });
  }
  return data;
};
