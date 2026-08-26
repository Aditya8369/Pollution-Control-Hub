export const WASTE_CATEGORIES = {
  organic: { label: 'Organic', icon: '🍂', color: '#22c55e', description: 'Food scraps, yard waste, biodegradable', decomposition: '2-6 months' },
  plastic: { label: 'Plastic', icon: '🧴', color: '#3b82f6', description: 'Bottles, packaging, containers', decomposition: '450+ years' },
  paper: { label: 'Paper/Cardboard', icon: '📦', color: '#f59e0b', description: 'Newspapers, boxes, documents', decomposition: '2-6 months' },
  glass: { label: 'Glass', icon: '🫙', color: '#8b5cf6', description: 'Bottles, jars, windows', decomposition: '1M+ years' },
  metal: { label: 'Metal', icon: '🥫', color: '#6366f1', description: 'Cans, foil, scrap metal', decomposition: '200-500 years' },
  electronic: { label: 'E-Waste', icon: '💻', color: '#ec4899', description: 'Electronics, batteries, cables', decomposition: 'Never (toxic)' },
  hazardous: { label: 'Hazardous', icon: '☢️', color: '#ef4444', description: 'Chemicals, paint, medical waste', decomposition: 'Varies (toxic)' },
  construction: { label: 'Construction', icon: '🏗️', color: '#f97316', description: 'Debris, concrete, wood, drywall', decomposition: 'Varies' },
  textile: { label: 'Textile', icon: '👕', color: '#06b6d4', description: 'Clothing, fabrics, leather', decomposition: '1-5 years' },
  mixed: { label: 'Mixed/Residual', icon: '🗑️', color: '#94a3b8', description: 'Non-recyclable mixed waste', decomposition: 'Varies' },
};

export const FACILITY_TYPES = {
  landfill: { label: 'Landfill', icon: '🏔️', color: '#6b7280', description: 'Waste disposal site' },
  recycling: { label: 'Recycling Center', icon: '♻️', color: '#22c55e', description: 'Materials recovery facility' },
  compost: { label: 'Composting Facility', icon: '🌱', color: '#84cc16', description: 'Organic waste processing' },
  incinerator: { label: 'Incineration Plant', icon: '🔥', color: '#ef4444', description: 'Waste-to-energy facility' },
  transfer: { label: 'Transfer Station', icon: '🚛', color: '#f59e0b', description: 'Waste sorting and transfer' },
  hazardous: { label: 'Hazardous Disposal', icon: '☢️', color: '#dc2626', description: 'Specialized hazardous waste' },
  ewaste: { label: 'E-Waste Facility', icon: '💻', color: '#ec4899', description: 'Electronic waste recycling' },
};

export const WASTE_STATUS = {
  collected: { label: 'Collected', color: '#3b82f6', icon: '🚛' },
  in_transit: { label: 'In Transit', color: '#f59e0b', icon: '🔄' },
  processing: { label: 'Processing', color: '#8b5cf6', icon: '⚙️' },
  disposed: { label: 'Disposed', color: '#6b7280', icon: '✅' },
  recycled: { label: 'Recycled', color: '#22c55e', icon: '♻️' },
  composted: { label: 'Composted', color: '#84cc16', icon: '🌱' },
  pending: { label: 'Pending Pickup', color: '#94a3b8', icon: '⏳' },
};

export const COLLECTION_SCHEDULES = {
  daily: { label: 'Daily', frequency: 7 },
  twice_weekly: { label: 'Twice Weekly', frequency: 2 },
  weekly: { label: 'Weekly', frequency: 1 },
  biweekly: { label: 'Bi-weekly', frequency: 0.5 },
  monthly: { label: 'Monthly', frequency: 0.25 },
};

export const ZONES = [
  { id: 'central', name: 'Central District', population: 250000, type: 'commercial' },
  { id: 'north', name: 'North Residential', population: 180000, type: 'residential' },
  { id: 'south', name: 'South Residential', population: 160000, type: 'residential' },
  { id: 'east_industrial', name: 'East Industrial', population: 45000, type: 'industrial' },
  { id: 'west_suburb', name: 'West Suburbs', population: 120000, type: 'residential' },
  { id: 'airport', name: 'Airport Zone', population: 15000, type: 'commercial' },
  { id: 'university', name: 'University Area', population: 60000, type: 'mixed' },
  { id: 'harbor', name: 'Harbor District', population: 30000, type: 'industrial' },
];

export const DIVERSION_TARGETS = {
  2025: { target: 50, label: '50% diversion rate by 2025' },
  2030: { target: 75, label: '75% diversion rate by 2030' },
  2035: { target: 90, label: 'Zero waste goal by 2035' },
};

export const EMISSION_FACTORS = {
  landfill_methane: 0.5,
  incineration_co2: 1.0,
  recycling_savings: -0.8,
  composting_savings: -0.3,
  transport_co2: 0.1,
};

export const formatTonnage = (tons) => {
  if (tons >= 1000) return `${(tons / 1000).toFixed(1)}K tons`;
  return `${tons.toFixed(1)} tons`;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(amount);
};

export const getWeekLabel = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};
