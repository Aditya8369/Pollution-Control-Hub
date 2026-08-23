import {
  REPORT_TYPES,
  SECTIONS,
  POLLUTANT_PARAMETERS,
  WATER_PARAMETERS,
  COMPLIANCE_STATUSES,
  IMPACT_SECTORS,
} from './reportTypes';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min, max, decimals = 1) => parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomSubset = (arr, count) => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);

const CITIES = ['Delhi', 'Mumbai', 'Beijing', 'Lagos', 'Dhaka', 'Cairo', 'Jakarta', 'LA', 'London', 'Sydney'];

export const generateReportList = (count = 12) => {
  const reports = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const type = randomChoice(Object.keys(REPORT_TYPES));
    const city = randomChoice(CITIES);
    const daysAgo = randomInt(0, 365);
    const date = new Date(now - daysAgo * 86400000);

    reports.push({
      id: `rpt-${i}`,
      title: `${city} ${REPORT_TYPES[type].label}`,
      type,
      typeConfig: REPORT_TYPES[type],
      city,
      date: date.toISOString().split('T')[0],
      dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: randomChoice(['compliant', 'non_compliant', 'marginal', 'pending_review', 'improvement_plan']),
      overallScore: randomInt(45, 95),
      sectionsCompleted: randomInt(5, 9),
      totalSections: 9,
      author: randomChoice(['Environmental Agency', 'City Council', 'Independent Auditor', 'Community Board']),
      pages: randomInt(15, 80),
      citations: randomInt(10, 50),
    });
  }

  return reports.sort((a, b) => new Date(b.date) - new Date(a.date));
};

export const generateAirQualityData = () => {
  const data = [];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  months.forEach((month, i) => {
    const entry = { month };
    Object.entries(POLLUTANT_PARAMETERS).forEach(([key, config]) => {
      const base = config.annualStandard ? config.annualStandard * 1.2 : 50;
      entry[key] = randomFloat(base * 0.3, base * 2);
      entry[`${key}_standard`] = config.dailyStandard || config.annualStandard || base;
      entry[`${key}_exceeds`] = entry[key] > entry[`${key}_standard`];
    });
    data.push(entry);
  });
  return data;
};

export const generateWaterQualityData = () => {
  return Object.entries(WATER_PARAMETERS).map(([key, config]) => {
    const value = config.min
      ? randomFloat(config.min * 0.8, (config.max || config.min * 1.5) * 1.1)
      : randomFloat((config.max || 10) * 0.3, (config.max || 10) * 1.5);

    const exceeds = config.max ? value > config.max : config.min ? value < config.min : false;

    return {
      parameter: key,
      ...config,
      value: parseFloat(value.toFixed(2)),
      standard: config.max || config.min,
      exceeds,
      status: exceeds ? 'non_compliant' : 'compliant',
    };
  });
};

export const generateNoiseData = () => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return hours.map(h => {
    const isNight = h < 6 || h >= 22;
    const isRush = (h >= 7 && h <= 9) || (h >= 17 && h <= 19);
    const baseLevel = isNight ? 35 : isRush ? 75 : 55;
    return {
      hour: `${String(h).padStart(2, '0')}:00`,
      level: randomFloat(baseLevel - 10, baseLevel + 15),
      residential_limit: isNight ? 45 : 55,
      commercial_limit: 70,
      isNight,
    };
  });
};

export const generateHealthImpactData = () => ({
  totalExposedPopulation: randomInt(500000, 5000000),
  respiratoryCases: randomInt(1000, 20000),
  cardiovascularCases: randomInt(500, 5000),
  hospitalAdmissions: randomInt(100, 2000),
  prematureDeaths: randomInt(10, 500),
  lostWorkDays: randomInt(10000, 100000),
  healthcareCost: randomInt(1000000, 50000000),
  qualityOfLifeImpact: randomFloat(2, 8),
  vulnerableGroupImpact: {
    children: { affected: randomInt(100000, 1000000), riskLevel: randomChoice(['moderate', 'high', 'critical']) },
    elderly: { affected: randomInt(50000, 500000), riskLevel: randomChoice(['moderate', 'high', 'critical']) },
    outdoorWorkers: { affected: randomInt(20000, 200000), riskLevel: randomChoice(['high', 'critical']) },
    asthmatics: { affected: randomInt(30000, 300000), riskLevel: randomChoice(['high', 'critical']) },
  },
  trends: {
    respiratoryCasesChange: randomFloat(-15, 25),
    hospitalAdmissionsChange: randomFloat(-20, 30),
    prematureDeathsChange: randomFloat(-10, 20),
  },
});

export const generateEconomicImpactData = () => ({
  totalCost: randomInt(50000000, 500000000),
  healthcareCost: randomInt(10000000, 100000000),
  lostProductivity: randomInt(20000000, 200000000),
  propertyValueImpact: randomInt(5000000, 50000000),
  tourismLoss: randomInt(2000000, 30000000),
  environmentalRemediation: randomInt(10000000, 100000000),
  greenJobsCreated: randomInt(500, 10000),
  investmentInCleanTech: randomInt(10000000, 200000000),
  costPerCapita: randomInt(100, 2000),
  gdpImpact: randomFloat(-2, -0.1),
  sectorBreakdown: Object.entries(IMPACT_SECTORS).map(([key, config]) => ({
    sector: key,
    ...config,
    cost: randomInt(1000000, 50000000),
    change: randomFloat(-20, 15),
  })),
  monthlyTrend: Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    cost: randomInt(2000000, 40000000),
    savings: randomInt(500000, 5000000),
  })),
});

export const generateComplianceData = () => {
  return Object.entries(POLLUTANT_PARAMETERS).map(([key, config]) => {
    const current = randomFloat(config.annualStandard * 0.4, config.annualStandard * 1.8);
    const exceeds = config.annualStandard ? current > config.annualStandard : false;
    const status = exceeds
      ? (current > config.annualStandard * 1.5 ? 'non_compliant' : 'marginal')
      : (current > config.annualStandard * 0.8 ? 'marginal' : 'compliant');

    return {
      parameter: key,
      ...config,
      currentValue: parseFloat(current.toFixed(2)),
      annualStandard: config.annualStandard,
      compliance: exceeds ? 'non_compliant' : 'compliant',
      status,
      statusConfig: COMPLIANCE_STATUSES[status],
      trend: randomChoice(['improving', 'stable', 'worsening']),
      percentOfStandard: config.annualStandard ? parseFloat((current / config.annualStandard * 100).toFixed(1)) : null,
    };
  });
};

export const generateRecommendations = (complianceData) => {
  const nonCompliant = complianceData.filter(c => c.status === 'non_compliant' || c.status === 'marginal');
  const recs = [];

  nonCompliant.forEach(c => {
    recs.push({
      id: `rec-${c.parameter}`,
      priority: c.status === 'non_compliant' ? 'high' : 'medium',
      category: 'emission_reduction',
      title: `Reduce ${c.label} emissions`,
      description: `Current levels at ${c.currentValue} ${c.unit} exceed the standard of ${c.annualStandard} ${c.unit}. Implement targeted reduction measures.`,
      estimatedCost: randomInt(100000, 5000000),
      timeframe: randomChoice(['3 months', '6 months', '1 year', '2 years']),
      expectedReduction: `${randomInt(20, 50)}%`,
      impact: randomChoice(['high', 'medium']),
    });
  });

  recs.push({
    id: 'rec-monitoring',
    priority: 'medium',
    category: 'monitoring',
    title: 'Enhance monitoring network',
    description: 'Install additional monitoring stations in high-risk areas to improve data coverage and early warning capabilities.',
    estimatedCost: randomInt(500000, 3000000),
    timeframe: '6 months',
    expectedReduction: 'Improved data accuracy by 40%',
    impact: 'medium',
  });

  recs.push({
    id: 'rec-community',
    priority: 'medium',
    category: 'community',
    title: 'Community awareness program',
    description: 'Launch public awareness campaigns about health risks and protective measures during high pollution episodes.',
    estimatedCost: randomInt(50000, 500000),
    timeframe: '3 months',
    expectedReduction: 'Increased community preparedness',
    impact: 'medium',
  });

  return recs;
};

export const generateReportSummary = (reports) => ({
  totalReports: reports.length,
  compliantReports: reports.filter(r => r.status === 'compliant').length,
  nonCompliantReports: reports.filter(r => r.status === 'non_compliant').length,
  avgScore: Math.round(reports.reduce((s, r) => s + r.overallScore, 0) / reports.length),
  reportsByType: Object.keys(REPORT_TYPES).map(t => ({
    type: t,
    ...REPORT_TYPES[t],
    count: reports.filter(r => r.type === t).length,
  })),
  recentReports: reports.slice(0, 5),
});
