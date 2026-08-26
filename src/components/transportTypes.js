export const TRANSPORT_MODES = {
  walking: { label: 'Walking', icon: '🚶', color: '#22c55e', co2PerKm: 0, caloriesPerKm: 60, costPerKm: 0, avgSpeed: 5 },
  cycling: { label: 'Cycling', icon: '🚲', color: '#10b981', co2PerKm: 0, caloriesPerKm: 35, costPerKm: 0, avgSpeed: 15 },
  ebike: { label: 'E-Bike', icon: '⚡', color: '#06b6d4', co2PerKm: 0.01, caloriesPerKm: 15, costPerKm: 0.02, avgSpeed: 20 },
  bus: { label: 'Public Bus', icon: '🚌', color: '#3b82f6', co2PerKm: 0.089, caloriesPerKm: 0, costPerKm: 0.15, avgSpeed: 20 },
  metro: { label: 'Metro/Subway', icon: '🚇', color: '#8b5cf6', co2PerKm: 0.041, caloriesPerKm: 0, costPerKm: 0.2, avgSpeed: 35 },
  tram: { label: 'Tram', icon: '🚊', color: '#a855f7', co2PerKm: 0.029, caloriesPerKm: 0, costPerKm: 0.18, avgSpeed: 25 },
  car_petrol: { label: 'Car (Petrol)', icon: '🚗', color: '#f97316', co2PerKm: 0.192, caloriesPerKm: 0, costPerKm: 0.35, avgSpeed: 30 },
  car_diesel: { label: 'Car (Diesel)', icon: '🚙', color: '#f59e0b', co2PerKm: 0.171, caloriesPerKm: 0, costPerKm: 0.3, avgSpeed: 30 },
  car_hybrid: { label: 'Hybrid Car', icon: '🔋', color: '#84cc16', co2PerKm: 0.109, caloriesPerKm: 0, costPerKm: 0.25, avgSpeed: 30 },
  ev: { label: 'Electric Vehicle', icon: '⚡', color: '#10b981', co2PerKm: 0.053, caloriesPerKm: 0, costPerKm: 0.12, avgSpeed: 30 },
  motorcycle: { label: 'Motorcycle', icon: '🏍️', color: '#ef4444', co2PerKm: 0.103, caloriesPerKm: 0, costPerKm: 0.2, avgSpeed: 35 },
  scooter: { label: 'E-Scooter', icon: '🛴', color: '#22d3ee', co2PerKm: 0.015, caloriesPerKm: 5, costPerKm: 0.1, avgSpeed: 18 },
  rickshaw: { label: 'Auto Rickshaw', icon: '🛺', color: '#fbbf24', co2PerKm: 0.15, caloriesPerKm: 0, costPerKm: 0.25, avgSpeed: 20 },
  carpool: { label: 'Carpool', icon: '👥', color: '#6366f1', co2PerKm: 0.064, caloriesPerKm: 0, costPerKm: 0.15, avgSpeed: 28 },
};

export const EMISSION_CATEGORIES = {
  transport: { label: 'Transport', icon: '🚗', color: '#ef4444', percentage: 27 },
  industry: { label: 'Industry', icon: '🏭', color: '#f97316', percentage: 21 },
  power: { label: 'Power Generation', icon: '⚡', color: '#f59e0b', percentage: 25 },
  buildings: { label: 'Buildings', icon: '🏢', color: '#8b5cf6', percentage: 18 },
  agriculture: { label: 'Agriculture', icon: '🌾', color: '#22c55e', percentage: 9 },
};

export const AIR_QUALITY_ZONES = [
  { id: 'downtown', name: 'Downtown Core', aqi: 145, traffic: 'heavy' },
  { id: 'highway_n', name: 'North Highway', aqi: 120, traffic: 'moderate' },
  { id: 'suburb_e', name: 'East Suburbs', aqi: 75, traffic: 'light' },
  { id: 'industrial_s', name: 'South Industrial', aqi: 180, traffic: 'heavy' },
  { id: 'university', name: 'University District', aqi: 90, traffic: 'moderate' },
  { id: 'park_area', name: 'Green Park Zone', aqi: 55, traffic: 'light' },
  { id: 'harbor', name: 'Harbor District', aqi: 110, traffic: 'moderate' },
  { id: 'airport', name: 'Airport Corridor', aqi: 130, traffic: 'heavy' },
];

export const ALTERNATIVE_FUELS = {
  electricity: { label: 'Electricity', icon: '⚡', color: '#10b981', co2Reduction: 50, costComparison: -30 },
  hydrogen: { label: 'Hydrogen', icon: '💧', color: '#3b82f6', co2Reduction: 70, costComparison: 20 },
  cng: { label: 'CNG', icon: '🔵', color: '#06b6d4', co2Reduction: 25, costComparison: -10 },
  ethanol: { label: 'Ethanol', icon: '🌽', color: '#84cc16', co2Reduction: 20, costComparison: 5 },
  biodiesel: { label: 'Biodiesel', icon: '🌿', color: '#22c55e', co2Reduction: 30, costComparison: 15 },
};

export const CITY_DISTRICTS = [
  { name: 'Central Business', population: 120000, area: 15, bikeLanes: 12, evChargers: 45, transitStops: 80 },
  { name: 'North Residential', population: 180000, area: 35, bikeLanes: 8, evChargers: 20, transitStops: 60 },
  { name: 'South Industrial', population: 45000, area: 25, bikeLanes: 3, evChargers: 5, transitStops: 25 },
  { name: 'East Suburbs', population: 160000, area: 50, bikeLanes: 15, evChargers: 30, transitStops: 45 },
  { name: 'West Tech Park', population: 90000, area: 20, bikeLanes: 20, evChargers: 60, transitStops: 35 },
  { name: 'Harbor Zone', population: 30000, area: 18, bikeLanes: 5, evChargers: 8, transitStops: 20 },
];

export const formatEmissions = (kg) => {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)}t CO₂`;
  return `${kg.toFixed(1)} kg CO₂`;
};

export const formatDuration = (minutes) => {
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

export const formatDistance = (km) => {
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)} km`;
};
