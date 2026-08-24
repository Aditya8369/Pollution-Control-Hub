export const RISK_CATEGORIES = {
  respiratory: { label: 'Respiratory', icon: '🫁', color: '#ef4444', description: 'Asthma, COPD, lung disease' },
  cardiovascular: { label: 'Cardiovascular', icon: '❤️', color: '#ec4899', description: 'Heart disease, stroke, hypertension' },
  neurological: { label: 'Neurological', icon: '🧠', color: '#8b5cf6', description: 'Cognitive decline, headaches' },
  developmental: { label: 'Developmental', icon: '👶', color: '#f59e0b', description: 'Child growth, fetal development' },
  reproductive: { label: 'Reproductive', icon: '🧬', color: '#06b6d4', description: 'Fertility, pregnancy complications' },
  cancer: { label: 'Cancer Risk', icon: '⚠️', color: '#dc2626', description: 'Long-term carcinogenic exposure' },
  mental_health: { label: 'Mental Health', icon: '🧘', color: '#10b981', description: 'Stress, anxiety, depression' },
  immune: { label: 'Immune System', icon: '🛡️', color: '#3b82f6', description: 'Immune suppression, infections' },
};

export const VULNERABLE_GROUPS = {
  children: { label: 'Children (0-14)', icon: '👶', multiplier: 1.5, description: 'Higher breathing rate per body weight' },
  elderly: { label: 'Elderly (65+)', icon: '👴', multiplier: 1.4, description: 'Reduced respiratory and cardiac reserve' },
  pregnant: { label: 'Pregnant Women', icon: '🤰', multiplier: 1.3, description: 'Fetal development sensitivity' },
  asthmatic: { label: 'Asthmatics', icon: '🫁', multiplier: 1.8, description: 'Triggered by pollutant exposure' },
  outdoor_workers: { label: 'Outdoor Workers', icon: '🔧', multiplier: 1.6, description: 'Extended exposure duration' },
  cardiovascular: { label: 'Heart Disease', icon: '❤️', multiplier: 1.5, description: 'Exacerbated by particulate matter' },
  immunocompromised: { label: 'Immunocompromised', icon: '🛡️', multiplier: 1.4, description: 'Reduced defense against toxins' },
};

export const EXPOSURE_DURATIONS = {
  acute: { label: 'Acute (1-24h)', hours: 24, color: '#ef4444', icon: '⚡' },
 短期: { label: 'Short-term (1-7 days)', hours: 168, color: '#f59e0b', icon: '📅' },
  subchronic: { label: 'Subchronic (1-6 months)', hours: 4380, color: '#8b5cf6', icon: '📆' },
  chronic: { label: 'Chronic (1+ years)', hours: 8760, color: '#6366f1', icon: '🗓️' },
};

export const HEALTH_OUTCOMES = {
  minimal: { label: 'Minimal Risk', color: '#22c55e', score: 0, description: 'No noticeable health effects' },
  mild: { label: 'Mild Effects', color: '#84cc16', score: 1, description: 'Minor irritation, temporary symptoms' },
  moderate: { label: 'Moderate Risk', color: '#f59e0b', score: 2, description: 'Aggravation of existing conditions' },
  significant: { label: 'Significant Risk', color: '#f97316', score: 3, description: 'New symptoms, medical attention advised' },
  severe: { label: 'Severe Risk', color: '#ef4444', score: 4, description: 'Emergency medical attention required' },
  critical: { label: 'Critical/Life-Threatening', color: '#dc2626', score: 5, description: 'Immediate hospitalization needed' },
};

export const RECOMMENDATION_LEVELS = {
  safe: { label: 'Safe', color: '#22c55e', bgColor: '#dcfce7', icon: '✅', actions: ['Normal activities', 'Enjoy outdoor exercise'] },
  moderate: { label: 'Moderate', color: '#f59e0b', bgColor: '#fef3c7', icon: '⚠️', actions: ['Limit prolonged outdoor exertion', 'Close windows', 'Use air purifiers indoors'] },
  unhealthy_sensitive: { label: 'Unhealthy for Sensitive Groups', color: '#f97316', bgColor: '#ffedd5', icon: '🟠', actions: ['Sensitive groups stay indoors', 'Reduce outdoor activities', 'Wear N95 masks outdoors'] },
  unhealthy: { label: 'Unhealthy', color: '#ef4444', bgColor: '#fee2e2', icon: '🔴', actions: ['Everyone reduce outdoor activities', 'Keep windows closed', 'Use air filtration', 'Avoid traffic areas'] },
  very_unhealthy: { label: 'Very Unhealthy', color: '#9333ea', bgColor: '#f3e8ff', icon: '🟣', actions: ['Avoid all outdoor activities', 'Seal windows and doors', 'Run air purifiers on high', 'Seek medical advice if symptomatic'] },
  hazardous: { label: 'Hazardous', color: '#7f1d1d', bgColor: '#991b1b', icon: '🚨', actions: ['Stay indoors at all times', 'Emergency protocols', 'Evacuate if advised', 'Hospitalize vulnerable individuals'] },
};

export const AQI_BANDS = [
  { min: 0, max: 50, label: 'Good', color: '#22c55e', recommendation: 'safe' },
  { min: 51, max: 100, label: 'Moderate', color: '#f59e0b', recommendation: 'moderate' },
  { min: 101, max: 150, label: 'Unhealthy (SG)', color: '#f97316', recommendation: 'unhealthy_sensitive' },
  { min: 151, max: 200, label: 'Unhealthy', color: '#ef4444', recommendation: 'unhealthy' },
  { min: 201, max: 300, label: 'Very Unhealthy', color: '#9333ea', recommendation: 'very_unhealthy' },
  { min: 301, max: 500, label: 'Hazardous', color: '#7f1d1d', recommendation: 'hazardous' },
];

export const POLLUTANT_HEALTH_EFFECTS = {
  pm25: {
    label: 'PM2.5',
    risks: ['Penetrates deep into lungs', 'Enters bloodstream', 'Aggravates asthma', 'Increases heart attack risk'],
    threshold_low: 12,
    threshold_high: 55.4,
  },
  pm10: {
    label: 'PM10',
    risks: ['Irritates airways', 'Worsens bronchitis', 'Reduces lung function', 'Triggers allergies'],
    threshold_low: 54,
    threshold_high: 154,
  },
  no2: {
    label: 'NO₂',
    risks: ['Inflames airways', 'Increases infection risk', 'Worsens asthma', 'Damages lung tissue'],
    threshold_low: 53,
    threshold_high: 100,
  },
  o3: {
    label: 'O₃ (Ozone)',
    risks: ['Chest pain', 'Coughing', 'Throat irritation', 'Aggravates COPD'],
    threshold_low: 55,
    threshold_high: 70,
  },
  so2: {
    label: 'SO₂',
    risks: ['Aggravates asthma', 'Constricts airways', 'Increases hospital admissions', 'Respiratory inflammation'],
    threshold_low: 35,
    threshold_high: 75,
  },
  co: {
    label: 'CO',
    risks: ['Reduces oxygen delivery', 'Headaches', 'Dizziness', 'Cardiac stress at high levels'],
    threshold_low: 4.4,
    threshold_high: 9.4,
  },
};

export const getAQIBand = (aqi) => {
  return AQI_BANDS.find(b => aqi >= b.min && aqi <= b.max) || AQI_BANDS[AQI_BANDS.length - 1];
};

export const getRiskScore = (aqi, groupMultiplier = 1) => {
  const base = Math.min(aqi / 500, 1);
  return Math.min(base * groupMultiplier, 1);
};

export const formatDuration = (hours) => {
  if (hours < 24) return `${hours}h`;
  if (hours < 168) return `${Math.round(hours / 24)} days`;
  if (hours < 720) return `${Math.round(hours / 168)} weeks`;
  return `${Math.round(hours / 720)} months`;
};
