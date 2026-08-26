import { TRANSPORT_MODES, AIR_QUALITY_ZONES, CITY_DISTRICTS, ALTERNATIVE_FUELS } from './transportTypes';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const generateCommuteRoutes = (count = 20) => {
  const origins = ['Home — North Residential', 'Home — East Suburbs', 'Apartment — Downtown', 'Villa — West Tech Park', 'Hostel — University'];
  const destinations = ['Office — Central Business', 'Factory — South Industrial', 'Campus — University', 'Tech Park — West Tech', 'Harbor — Port Area'];

  return Array.from({ length: count }, (_, i) => {
    const distance = randomFloat(2, 35);
    const mode = randomChoice(Object.keys(TRANSPORT_MODES));
    const modeConfig = TRANSPORT_MODES[mode];
    const duration = (distance / modeConfig.avgSpeed) * 60;

    return {
      id: `route-${i}`,
      origin: randomChoice(origins),
      destination: randomChoice(destinations),
      distance,
      duration,
      mode,
      ...modeConfig,
      co2Emissions: distance * modeConfig.co2PerKm,
      cost: distance * modeConfig.costPerKm,
      caloriesBurned: distance * modeConfig.caloriesPerKm,
      date: new Date(Date.now() - randomInt(0, 30) * 86400000).toISOString().split('T')[0],
    };
  });
};

export const generateModeDistribution = () => {
  const modes = Object.entries(TRANSPORT_MODES).map(([key, config]) => ({
    mode: key,
    ...config,
    trips: randomInt(50, 500),
    totalKm: randomFloat(200, 5000),
    avgDuration: randomFloat(15, 60),
    avgCO2: randomFloat(0.5, 8),
    trend: randomChoice(['increasing', 'stable', 'decreasing']),
  }));
  return modes.sort((a, b) => b.trips - a.trips);
};

export const generateWeeklyEmissions = (weeks = 12) => {
  return Array.from({ length: weeks }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (weeks - 1 - i) * 7);
    return {
      week: `W${weeks - i}`,
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      transportCO2: randomFloat(800, 2500),
      powerCO2: randomFloat(600, 1800),
      industryCO2: randomFloat(400, 1200),
      totalCO2: randomFloat(2000, 5500),
      greenTrips: randomInt(200, 1500),
      conventionalTrips: randomInt(500, 3000),
      savingsKg: randomFloat(100, 800),
    };
  });
};

export const generateDistrictInfrastructure = () => {
  return CITY_DISTRICTS.map(d => ({
    ...d,
    bikeLaneKm: d.bikeLanes * randomFloat(0.8, 1.5),
    evChargerDensity: d.evChargers / d.area,
    transitCoverage: randomFloat(40, 95),
    avgCommute: randomFloat(15, 45),
    bikeShare: randomInt(5, 50),
    greenScore: randomInt(30, 90),
    airQualityIndex: randomInt(40, 200),
    populationDensity: Math.round(d.population / d.area),
  }));
};

export const generateAirQualityImpact = () => {
  return AIR_QUALITY_ZONES.map(z => ({
    ...z,
    pm25: randomFloat(10, 150),
    no2: randomFloat(5, 80),
    trafficVolume: randomInt(1000, 50000),
    evPercentage: randomFloat(2, 35),
    greenTransportShare: randomFloat(15, 65),
    healthImpact: z.aqi > 150 ? 'high' : z.aqi > 100 ? 'moderate' : 'low',
  }));
};

export const generateAlternativeFuelData = () => {
  return Object.entries(ALTERNATIVE_FUELS).map(([key, config]) => ({
    fuel: key,
    ...config,
    adoptionRate: randomFloat(5, 40),
    stations: randomInt(10, 200),
    annualGrowth: randomFloat(10, 50),
    vehicles: randomInt(500, 20000),
  }));
};

export const generateTransportGoals = () => [
  { id: 'g1', label: 'Green Mode Share', current: randomFloat(20, 55), target: 60, unit: '%', icon: '🚲' },
  { id: 'g2', label: 'EV Adoption', current: randomFloat(5, 25), target: 30, unit: '%', icon: '⚡' },
  { id: 'g3', label: 'CO₂ Reduction', current: randomFloat(10, 35), target: 40, unit: '%', icon: '🌍' },
  { id: 'g4', label: 'Bike Lane Coverage', current: randomFloat(15, 50), target: 80, unit: 'km', icon: '🛤️' },
  { id: 'g5', label: 'Transit Ridership', current: randomFloat(20000, 80000), target: 100000, unit: 'riders', icon: '🚇' },
  { id: 'g6', label: 'Air Quality Index', current: randomFloat(60, 150), target: 50, unit: 'AQI', icon: '🌬️' },
];

export const generateTripComparison = (distance) => {
  return Object.entries(TRANSPORT_MODES).map(([key, config]) => ({
    mode: key,
    ...config,
    duration: (distance / config.avgSpeed) * 60,
    co2: distance * config.co2PerKm,
    cost: distance * config.costPerKm,
    calories: distance * config.caloriesPerKm,
    healthScore: config.caloriesPerKm > 30 ? 'excellent' : config.caloriesPerKm > 10 ? 'good' : 'low',
  })).sort((a, b) => a.co2 - b.co2);
};
