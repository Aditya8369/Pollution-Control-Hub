export const REPORT_TYPES = {
  monthly: { label: 'Monthly Report', icon: '📅', color: '#6366f1', description: 'Comprehensive monthly pollution summary' },
  quarterly: { label: 'Quarterly Review', icon: '📊', color: '#8b5cf6', description: 'Quarterly trend analysis and comparisons' },
  annual: { label: 'Annual Report', icon: '📋', color: '#10b981', description: 'Yearly environmental impact assessment' },
  incident: { label: 'Incident Report', icon: '🚨', color: '#ef4444', description: 'Specific pollution incident analysis' },
  compliance: { label: 'Compliance Report', icon: '✅', color: '#22c55e', description: 'Regulatory compliance status' },
  community: { label: 'Community Impact', icon: '🏘️', color: '#f59e0b', description: 'Community-level impact assessment' },
};

export const SECTIONS = {
  executive_summary: { label: 'Executive Summary', icon: '📝', order: 1 },
  air_quality: { label: 'Air Quality Data', icon: '🌬️', order: 2 },
  water_quality: { label: 'Water Quality', icon: '💧', order: 3 },
  noise_pollution: { label: 'Noise Levels', icon: '🔊', order: 4 },
  health_impact: { label: 'Health Impact', icon: '❤️', order: 5 },
  economic_impact: { label: 'Economic Impact', icon: '💰', order: 6 },
  recommendations: { label: 'Recommendations', icon: '💡', order: 7 },
  compliance: { label: 'Compliance Status', icon: '📋', order: 8 },
  appendices: { label: 'Data Appendices', icon: '📎', order: 9 },
};

export const POLLUTANT_PARAMETERS = {
  pm25: { label: 'PM2.5', unit: 'µg/m³', annualStandard: 12, dailyStandard: 35, color: '#ef4444' },
  pm10: { label: 'PM10', unit: 'µg/m³', annualStandard: 50, dailyStandard: 150, color: '#f59e0b' },
  no2: { label: 'NO₂', unit: 'ppb', annualStandard: 53, dailyStandard: 100, color: '#8b5cf6' },
  so2: { label: 'SO₂', unit: 'ppb', annualStandard: 75, dailyStandard: 150, color: '#3b82f6' },
  co: { label: 'CO', unit: 'ppm', annualStandard: 9, dailyStandard: 9, color: '#06b6d4' },
  o3: { label: 'O₃', unit: 'ppb', annualStandard: 70, dailyStandard: 70, color: '#10b981' },
  lead: { label: 'Lead', unit: 'µg/m³', annualStandard: 0.15, dailyStandard: 0.15, color: '#ec4899' },
  benzene: { label: 'Benzene', unit: 'ppb', annualStandard: null, dailyStandard: null, color: '#f97316' },
};

export const WATER_PARAMETERS = {
  ph: { label: 'pH', unit: '', min: 6.5, max: 8.5, color: '#6366f1' },
  dissolved_oxygen: { label: 'DO', unit: 'mg/L', min: 5, max: null, color: '#10b981' },
  bod: { label: 'BOD', unit: 'mg/L', min: null, max: 3, color: '#f59e0b' },
  cod: { label: 'COD', unit: 'mg/L', min: null, max: 10, color: '#ef4444' },
  tss: { label: 'TSS', unit: 'mg/L', min: null, max: 30, color: '#8b5cf6' },
  nitrates: { label: 'Nitrates', unit: 'mg/L', min: null, max: 45, color: '#3b82f6' },
  coliform: { label: 'Fecal Coliform', unit: 'CFU/100mL', min: null, max: 200, color: '#ec4899' },
};

export const NOISE_LEVELS = {
  residential_day: { label: 'Residential (Day)', limit: 55, unit: 'dB(A)', color: '#6366f1' },
  residential_night: { label: 'Residential (Night)', limit: 45, unit: 'dB(A)', color: '#8b5cf6' },
  commercial: { label: 'Commercial', limit: 70, unit: 'dB(A)', color: '#f59e0b' },
  industrial: { label: 'Industrial', limit: 75, unit: 'dB(A)', color: '#ef4444' },
};

export const COMPLIANCE_STATUSES = {
  compliant: { label: 'Compliant', color: '#22c55e', icon: '✅' },
  non_compliant: { label: 'Non-Compliant', color: '#ef4444', icon: '❌' },
  marginal: { label: 'Marginal', color: '#f59e0b', icon: '⚠️' },
  pending_review: { label: 'Pending Review', color: '#3b82f6', icon: '🔄' },
  improvement_plan: { label: 'Improvement Plan', color: '#8b5cf6', icon: '📋' },
};

export const IMPACT_SECTORS = {
  health: { label: 'Public Health', icon: '❤️', color: '#ef4444', weight: 0.25 },
  environment: { label: 'Environment', icon: '🌿', color: '#22c55e', weight: 0.20 },
  economy: { label: 'Economy', icon: '💰', color: '#f59e0b', weight: 0.20 },
  social: { label: 'Social Impact', icon: '👥', color: '#8b5cf6', weight: 0.15 },
  infrastructure: { label: 'Infrastructure', icon: '🏗️', color: '#3b82f6', weight: 0.10 },
  ecosystem: { label: 'Ecosystem', icon: '🦅', color: '#10b981', weight: 0.10 },
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

export const formatNumber = (num) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};
