import {
  WASTE_CATEGORIES,
  FACILITY_TYPES,
  WASTE_STATUS,
  ZONES,
  COLLECTION_SCHEDULES,
  EMISSION_FACTORS,
} from './wasteTypes';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

export const generateFacilities = (count = 15) => {
  return Array.from({ length: count }, (_, i) => {
    const type = randomChoice(Object.keys(FACILITY_TYPES));
    const zone = randomChoice(ZONES);
    const typeConfig = FACILITY_TYPES[type];

    return {
      id: `fac-${i}`,
      name: `${typeConfig.label} ${zone.name} #${i + 1}`,
      type,
      ...typeConfig,
      zone: zone.id,
      zoneName: zone.name,
      capacity: randomInt(50, 500),
      currentLoad: randomFloat(20, 95),
      status: randomChoice(['operational', 'maintenance', 'overcapacity']),
      dailyThroughput: randomFloat(5, 80),
      latitude: randomFloat(28.5, 28.7, 4),
      longitude: randomFloat(77.0, 77.3, 4),
      established: randomInt(2000, 2023),
      employees: randomInt(10, 200),
    };
  });
};

export const generateWasteStream = (count = 50) => {
  const now = Date.now();
  const statuses = Object.keys(WASTE_STATUS);

  return Array.from({ length: count }, (_, i) => {
    const category = randomChoice(Object.keys(WASTE_CATEGORIES));
    const catConfig = WASTE_CATEGORIES[category];
    const zone = randomChoice(ZONES);
    const status = randomChoice(statuses);
    const daysAgo = randomInt(0, 30);
    const collectedAt = new Date(now - daysAgo * 86400000);

    return {
      id: `ws-${i}`,
      category,
      ...catConfig,
      zone: zone.id,
      zoneName: zone.name,
      status,
      statusConfig: WASTE_STATUS[status],
      weight: randomFloat(0.1, 50),
      volume: randomFloat(0.5, 200),
      collectedAt: collectedAt.toISOString(),
      collectedDate: `${collectedAt.getMonth() + 1}/${collectedAt.getDate()}`,
      facility: randomChoice(Object.keys(FACILITY_TYPES)),
      estimatedRecyclingRate: category === 'plastic' ? randomFloat(20, 60) : category === 'glass' ? randomFloat(70, 95) : randomFloat(10, 80),
      contaminationRate: randomFloat(1, 25),
    };
  });
};

export const generateZoneStats = () => {
  return ZONES.map(zone => {
    const dailyWaste = randomFloat(20, 200);
    const recyclingRate = randomFloat(15, 65);
    const perCapitaWaste = randomFloat(0.3, 1.5);

    return {
      ...zone,
      dailyWaste,
      recyclingRate,
      compostingRate: randomFloat(5, 30),
      perCapitaWaste,
      collectionEfficiency: randomFloat(85, 99),
      missedCollections: randomInt(0, 10),
      reportsFiled: randomInt(2, 25),
      lastCollection: `${randomInt(1, 7)} days ago`,
      compliance: randomChoice(['compliant', 'marginal', 'non_compliant']),
    };
  });
};

export const generateWeeklyData = (weeks = 12) => {
  const data = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i * 7);
    data.push({
      week: `W${weeks - i}`,
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      totalCollected: randomFloat(500, 1500),
      recycled: randomFloat(100, 500),
      composted: randomFloat(50, 200),
      landfilled: randomFloat(200, 700),
      incinerated: randomFloat(50, 200),
      diversionRate: randomFloat(25, 65),
      collectionCost: randomInt(20000, 80000),
      recyclingRevenue: randomInt(5000, 30000),
      emissions: randomFloat(100, 500),
    });
  }
  return data;
};

export const generateCategoryBreakdown = () => {
  return Object.entries(WASTE_CATEGORIES).map(([key, config]) => ({
    category: key,
    ...config,
    dailyTons: randomFloat(10, 200),
    weeklyTons: randomFloat(50, 1000),
    monthlyTons: randomFloat(200, 4000),
    recyclingRate: key === 'organic' ? randomFloat(40, 80) : key === 'electronic' ? randomFloat(10, 30) : randomFloat(15, 70),
    trend: randomChoice(['increasing', 'stable', 'decreasing']),
  }));
};

export const generateEmissionsData = () => ({
  totalAnnualEmissions: randomFloat(5000, 25000),
  methaneFromLandfills: randomFloat(2000, 10000),
  incinerationEmissions: randomFloat(1000, 5000),
  transportEmissions: randomFloat(500, 3000),
  avoidedEmissionsRecycling: randomFloat(1000, 8000),
  avoidedEmissionsComposting: randomFloat(500, 3000),
  netEmissions: randomFloat(3000, 15000),
  emissionReductionTrend: randomFloat(-15, 10),
  carbonCreditsGenerated: randomInt(100, 2000),
  greenEnergyProduced: randomFloat(1, 20),
  monthlyEmissions: Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    landfill: randomFloat(200, 800),
    incineration: randomFloat(80, 400),
    transport: randomFloat(40, 250),
    offset: randomFloat(50, 300),
  })),
});

export const generateCostData = () => ({
  totalAnnualCost: randomInt(5000000, 25000000),
  collectionCost: randomInt(2000000, 10000000),
  processingCost: randomInt(1000000, 5000000),
  disposalCost: randomInt(500000, 3000000),
  recyclingRevenue: randomInt(500000, 3000000),
  compostRevenue: randomInt(100000, 1000000),
  fineRevenue: randomInt(50000, 500000),
  costPerTon: randomFloat(80, 250),
  costPerCapita: randomFloat(20, 120),
  budgetUtilization: randomFloat(70, 95),
  monthlyCosts: Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    cost: randomInt(300000, 2500000),
    revenue: randomInt(50000, 300000),
  })),
});

export const generateAlerts = (count = 10) => {
  const alerts = [
    'Overflowing bin at Central District #12',
    'Missed collection in North Residential Zone',
    'High contamination rate at East Industrial sorting',
    'Landfill capacity at 85% — expansion needed',
    'Illegal dumping reported in West Suburbs',
    'Composting facility odor complaint from University Area',
    'Recycling center conveyor belt malfunction',
    'Hazardous waste spill near Harbor District',
    'E-waste backlog exceeding processing capacity',
    'Collection truck breakdown — route 7 delayed',
  ];

  return alerts.slice(0, count).map((text, i) => ({
    id: `alert-${i}`,
    text,
    severity: randomChoice(['low', 'medium', 'high', 'critical']),
    zone: randomChoice(ZONES).name,
    timestamp: new Date(Date.now() - randomInt(0, 168) * 3600000).toISOString(),
    acknowledged: Math.random() > 0.6,
  }));
};
