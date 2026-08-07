export const EMISSION_FACTORS = {
  vehicle: {
    petrol: 0.192,
    diesel: 0.171,
    ev: 0.053,
    motorbike: 0.082
  },
  electricity: 0.82,
  lpg: 42.5,
  publicTransit: 0.045,
  flights: {
    shortHaul: 150,
    longHaul: 600
  }
};

const REDUCTION_TIPS_MAP = {
  vehicle: {
    id: 'tip-vehicle',
    category: 'Vehicle Travel',
    title: 'Optimize Daily Commutes',
    tip: 'Carpool 2 days a week or use public transit for long commutes. Keeping tire pressure optimal improves fuel efficiency.',
    impact: 'Saves up to 40-100 kg CO₂e/month'
  },
  electricity: {
    id: 'tip-electricity',
    category: 'Electricity Usage',
    title: 'Improve Household Energy Efficiency',
    tip: 'Switch to 5-star BEE rated appliances and LED lighting. Turn off ACs when not in use or set temperature to 24-26°C.',
    impact: 'Saves up to 30-70 kg CO₂e/month'
  },
  lpg: {
    id: 'tip-lpg',
    category: 'LPG Usage',
    title: 'Efficient Cooking Habits',
    tip: 'Use pressure cookers, cover pans while boiling water, and soak pulses before cooking to reduce LPG consumption.',
    impact: 'Saves 10-20 kg CO₂e/month'
  },
  flights: {
    id: 'tip-flights',
    category: 'Air Travel',
    title: 'Mindful Flight Travel',
    tip: 'Choose direct flights whenever possible or replace non-urgent business trips with video calls.',
    impact: 'Saves 150-600 kg CO₂e per flight avoided'
  },
  publicTransit: {
    id: 'tip-transit',
    category: 'Public Transport',
    title: 'Keep Up Sustainable Commuting',
    tip: 'Public transit is already one of the cleanest modes of transport. Consider walking or cycling for short distances.',
    impact: 'Maintains low commute emissions'
  }
};

export function calculateCarbonFootprint(inputs = {}) {
  let vehicleType = inputs.vehicleType;

if (!EMISSION_FACTORS.vehicle[vehicleType]) {
  console.warn(
    `Unknown vehicle type "${vehicleType}". Falling back to "petrol".`
  );

  vehicleType = "petrol";
}
  const vehicleKm = Math.max(0, Number(inputs.vehicleKm) || 0);
  const electricityKwh = Math.max(0, Number(inputs.electricityKwh) || 0);
  const lpgCylinders = Math.max(0, Number(inputs.lpgCylinders) || 0);
  const publicTransitKm = Math.max(0, Number(inputs.publicTransitKm) || 0);
  const shortFlights = Math.max(0, Number(inputs.shortFlights) || 0);
  const longFlights = Math.max(0, Number(inputs.longFlights) || 0);

  const vehicleEmissions = vehicleKm * EMISSION_FACTORS.vehicle[vehicleType];
  const electricityEmissions = electricityKwh * EMISSION_FACTORS.electricity;
  const lpgEmissions = lpgCylinders * EMISSION_FACTORS.lpg;
  const publicTransitEmissions = publicTransitKm * EMISSION_FACTORS.publicTransit;
  const flightEmissions = ((shortFlights * EMISSION_FACTORS.flights.shortHaul) + (longFlights * EMISSION_FACTORS.flights.longHaul)) / 12;

  const totalMonthlyKg = vehicleEmissions + electricityEmissions + lpgEmissions + publicTransitEmissions + flightEmissions;
  const totalAnnualTonnes = (totalMonthlyKg * 12) / 1000;

  const breakdown = [
    { key: 'vehicle', label: 'Car / Bike Travel', monthlyKg: Math.round(vehicleEmissions * 10) / 10 },
    { key: 'electricity', label: 'Home Electricity', monthlyKg: Math.round(electricityEmissions * 10) / 10 },
    { key: 'lpg', label: 'LPG Cooking Gas', monthlyKg: Math.round(lpgEmissions * 10) / 10 },
    { key: 'publicTransit', label: 'Public Transit', monthlyKg: Math.round(publicTransitEmissions * 10) / 10 },
    { key: 'flights', label: 'Flights', monthlyKg: Math.round(flightEmissions * 10) / 10 }
  ];

  return {
    totalMonthlyKg: Math.round(totalMonthlyKg * 10) / 10,
    totalAnnualTonnes: Math.round(totalAnnualTonnes * 100) / 100,
    impactLevel: getImpactLevel(totalMonthlyKg),
    breakdown,
    reductionTips: getReductionTips(breakdown),
    benchmarks: {
      indiaAvgMonthlyKg: 158,
      globalTargetMonthlyKg: 167,
      globalAvgMonthlyKg: 333
    }
  };
}

export function getImpactLevel(monthlyKg) {
  if (monthlyKg < 200) {
    return {
      level: 'Low',
      color: '#16a34a',
      badgeClass: 'impact-badge-low',
      description: 'Great job! Your carbon emissions are below average and align with global climate targets.'
    };
  }
  if (monthlyKg <= 500) {
    return {
      level: 'Moderate',
      color: '#d97706',
      badgeClass: 'impact-badge-moderate',
      description: 'Your carbon footprint is moderate. Making small adjustments in transit or energy can help lower it.'
    };
  }
  return {
    level: 'High',
    color: '#dc2626',
    badgeClass: 'impact-badge-high',
    description: 'Your emissions are above average. Review the targeted reduction tips below to start cutting emissions.'
  };
}

export function getReductionTips(breakdown) {
  const sorted = [...breakdown].filter((item) => item.monthlyKg > 0).sort((a, b) => b.monthlyKg - a.monthlyKg);
  const tips = sorted.slice(0, 3).map((item) => REDUCTION_TIPS_MAP[item.key]).filter(Boolean);

  if (tips.length === 0) {
    tips.push({
      id: 'tip-general',
      category: 'General',
      title: 'Adopt Sustainable Habits',
      tip: 'Input your monthly travel and energy numbers above to see your exact carbon footprint and targeted reduction steps.',
      impact: 'Builds awareness & reduces environmental impact'
    });
  }

  return tips;
}
