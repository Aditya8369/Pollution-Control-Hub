export const SOURCE_TYPES = {
  industrial: { label: 'Industrial', icon: '🏭', color: '#ef4444', description: 'Factories, refineries, manufacturing plants' },
  vehicular: { label: 'Vehicular', icon: '🚗', color: '#f59e0b', description: 'Traffic, fleet vehicles, transport' },
  residential: { label: 'Residential', icon: '🏠', color: '#8b5cf6', description: 'Heating, cooking, waste burning' },
  agricultural: { label: 'Agricultural', icon: '🌾', color: '#22c55e', description: 'Crop burning, fertilizers, livestock' },
  construction: { label: 'Construction', icon: '🏗️', color: '#3b82f6', description: 'Dust, debris, equipment emissions' },
  power_plant: { label: 'Power Plant', icon: '⚡', color: '#ec4899', description: 'Coal, gas, nuclear facilities' },
  waste: { label: 'Waste Management', icon: '🗑️', color: '#06b6d4', description: 'Landfills, incineration, open burning' },
  natural: { label: 'Natural', icon: '🌋', color: '#10b981', description: 'Wildfires, volcanic, dust storms' },
};

export const POLLUTANT_TYPES = {
  pm25: { label: 'PM2.5', unit: 'µg/m³', color: '#ef4444', whoLimit: 15 },
  pm10: { label: 'PM10', unit: 'µg/m³', color: '#f59e0b', whoLimit: 45 },
  no2: { label: 'NO₂', unit: 'µg/m³', color: '#8b5cf6', whoLimit: 25 },
  so2: { label: 'SO₂', unit: 'µg/m³', color: '#3b82f6', whoLimit: 40 },
  co: { label: 'CO', unit: 'mg/m³', color: '#06b6d4', whoLimit: 4 },
  o3: { label: 'O₃', unit: 'µg/m³', color: '#10b981', whoLimit: 100 },
  voc: { label: 'VOCs', unit: 'ppb', color: '#ec4899', whoLimit: null },
  nh3: { label: 'NH₃', unit: 'µg/m³', color: '#f97316', whoLimit: null },
};

export const SEVERITY_LEVELS = {
  low: { label: 'Low', color: '#22c55e', bgColor: 'bg-green-100 text-green-700', icon: '🟢' },
  moderate: { label: 'Moderate', color: '#f59e0b', bgColor: 'bg-amber-100 text-amber-700', icon: '🟡' },
  high: { label: 'High', color: '#f97316', bgColor: 'bg-orange-100 text-orange-700', icon: '🟠' },
  critical: { label: 'Critical', color: '#ef4444', bgColor: 'bg-red-100 text-red-700', icon: '🔴' },
  emergency: { label: 'Emergency', color: '#dc2626', bgColor: 'bg-red-200 text-red-800', icon: '🚨' },
};

export const SOURCE_STATUS = {
  active: { label: 'Active', color: '#ef4444', icon: '🔴' },
  monitored: { label: 'Monitored', color: '#f59e0b', icon: '🟡' },
  contained: { label: 'Contained', color: '#3b82f6', icon: '🔵' },
  resolved: { label: 'Resolved', color: '#22c55e', icon: '🟢' },
};

export const WIND_DIRECTIONS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];

export const AFFECTED_AREAS = {
  residential: { label: 'Residential Zone', population: '50K-200K' },
  commercial: { label: 'Commercial District', population: '10K-50K' },
  industrial: { label: 'Industrial Zone', population: '5K-20K' },
  rural: { label: 'Rural Area', population: '1K-10K' },
  school: { label: 'School Zone', population: '500-2K' },
  hospital: { label: 'Medical District', population: '1K-5K' },
};

export const REMEDIATION_ACTIONS = [
  { id: 'shutdown', label: 'Temporary Shutdown', severity: 'critical', timeframe: 'Immediate' },
  { id: 'reduce_output', label: 'Reduce Output by 50%', severity: 'high', timeframe: '24 hours' },
  { id: 'filter_install', label: 'Install Emission Filters', severity: 'moderate', timeframe: '1-2 weeks' },
  { id: 'monitor_increase', label: 'Increase Monitoring', severity: 'low', timeframe: 'Ongoing' },
  { id: 'relocate', label: 'Relate Activity', severity: 'critical', timeframe: '1 week' },
  { id: 'public_alert', label: 'Public Health Alert', severity: 'high', timeframe: 'Immediate' },
  { id: 'traffic_divert', label: 'Traffic Diversion', severity: 'moderate', timeframe: '4 hours' },
  { id: 'dust_suppress', label: 'Dust Suppression', severity: 'low', timeframe: '2 hours' },
];

export const formatTimestamp = (ts) => {
  const d = new Date(ts);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const formatCoordinate = (lat, lng) => {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lngDir = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}`;
};

export const getWindDirectionLabel = (degrees) => {
  const idx = Math.round(degrees / 22.5) % 16;
  return WIND_DIRECTIONS[idx];
};

export const getSourceTypeConfig = (type) => SOURCE_TYPES[type] || SOURCE_TYPES.industrial;
export const getSeverityConfig = (severity) => SEVERITY_LEVELS[severity] || SEVERITY_LEVELS.low;
