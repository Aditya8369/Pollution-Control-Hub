import { EMISSION_FACTORS } from '../constants/emissions';

export { EMISSION_FACTORS };

// Each category now has several tips (not just one), tagged with an
// `impactArea` (transport / homeEnergy / diet) so the UI can group and the
// selection logic can pick more than one per category (issue #835, step 1).
const REDUCTION_TIPS_MAP = {
  vehicle: [
    {
      id: 'tip-vehicle-carpool',
      category: 'Vehicle Travel',
      impactArea: 'transport',
      title: 'Carpool or Combine Trips',
      tip: 'Carpool 2-3 days a week for your commute, or combine multiple short errands into one trip to cut idle-engine time.',
      impact: 'Saves ~40-100 kg CO₂e/month'
    },
    {
      id: 'tip-vehicle-maintenance',
      category: 'Vehicle Travel',
      impactArea: 'transport',
      title: 'Keep Your Vehicle Efficient',
      tip: 'Keep tire pressure at the recommended level and get regular servicing — a poorly tuned engine can burn 10-20% more fuel.',
      impact: 'Saves ~10-25 kg CO₂e/month'
    },
    {
      id: 'tip-vehicle-ev',
      category: 'Vehicle Travel',
      impactArea: 'transport',
      title: 'Consider an EV for Your Next Vehicle',
      tip: 'Switching from a petrol or diesel car to an electric vehicle cuts per-km emissions by roughly 70% on an average grid.',
      impact: 'Saves ~100-300 kg CO₂e/month'
    }
  ],
  electricity: [
    {
      id: 'tip-electricity-appliances',
      category: 'Electricity Usage',
      impactArea: 'homeEnergy',
      title: 'Switch to Efficient Appliances',
      tip: 'Replace old appliances with 5-star BEE rated models and switch remaining bulbs to LED — lighting alone can be 10-15% of home electricity use.',
      impact: 'Saves ~30-70 kg CO₂e/month'
    },
    {
      id: 'tip-electricity-ac',
      category: 'Electricity Usage',
      impactArea: 'homeEnergy',
      title: 'Optimize Cooling & Heating',
      tip: 'Set air conditioners to 24-26°C instead of the coldest setting, and turn them off when a room is unoccupied.',
      impact: 'Saves ~20-50 kg CO₂e/month'
    },
    {
      id: 'tip-electricity-standby',
      category: 'Electricity Usage',
      impactArea: 'homeEnergy',
      title: 'Cut Standby Power Draw',
      tip: 'Unplug chargers and switch off power strips for devices on standby — phantom loads can add up to 5-10% of a monthly bill.',
      impact: 'Saves ~5-15 kg CO₂e/month'
    }
  ],
  lpg: [
    {
      id: 'tip-lpg-cooking',
      category: 'LPG Usage',
      impactArea: 'homeEnergy',
      title: 'Efficient Cooking Habits',
      tip: 'Use pressure cookers, cover pans while boiling water, and soak pulses before cooking to reduce LPG consumption.',
      impact: 'Saves ~10-20 kg CO₂e/month'
    },
    {
      id: 'tip-lpg-maintenance',
      category: 'LPG Usage',
      impactArea: 'homeEnergy',
      title: 'Maintain Your Burner & Cylinder',
      tip: 'Clean burner heads regularly and check for leaks — a clogged burner can waste 10%+ more gas to cook the same meal.',
      impact: 'Saves ~5-10 kg CO₂e/month'
    }
  ],
  flights: [
    {
      id: 'tip-flights-direct',
      category: 'Air Travel',
      impactArea: 'transport',
      title: 'Choose Direct Flights',
      tip: 'Direct flights avoid the extra fuel burned during additional takeoffs and landings on connecting routes.',
      impact: 'Saves ~150-600 kg CO₂e per flight avoided'
    },
    {
      id: 'tip-flights-video',
      category: 'Air Travel',
      impactArea: 'transport',
      title: 'Replace Trips with Video Calls',
      tip: 'For non-urgent business travel, a video call can replace a short-haul round trip entirely.',
      impact: 'Saves ~150-300 kg CO₂e per trip avoided'
    }
  ],
  publicTransit: [
    {
      id: 'tip-transit-sustain',
      category: 'Public Transport',
      impactArea: 'transport',
      title: 'Keep Up Sustainable Commuting',
      tip: 'Public transit is already one of the cleanest modes of transport — you\'re already ahead of most commuters here.',
      impact: 'Maintains low commute emissions'
    },
    {
      id: 'tip-transit-active',
      category: 'Public Transport',
      impactArea: 'transport',
      title: 'Walk or Cycle the Last Mile',
      tip: 'Consider walking or cycling for short distances instead of a connecting bus or auto-rickshaw leg.',
      impact: 'Saves ~5-15 kg CO₂e/month'
    }
  ]
};

// Diet & lifestyle isn't a calculator input yet, but the issue explicitly asks
// for tips categorized by impact area including diet — these rotate in as a
// bonus tip alongside the targeted ones below.
const DIET_TIPS = [
  {
    id: 'tip-diet-plantbased',
    category: 'Diet & Lifestyle',
    impactArea: 'diet',
    title: 'Add More Plant-Based Meals',
    tip: 'Red meat and dairy have some of the highest carbon footprints per calorie — swapping in a few plant-based meals a week adds up.',
    impact: 'Saves ~50-150 kg CO₂e/month'
  },
  {
    id: 'tip-diet-local',
    category: 'Diet & Lifestyle',
    impactArea: 'diet',
    title: 'Buy Local & Seasonal Produce',
    tip: 'Food transported long distances or grown out of season out of climate-controlled storage carries a much higher footprint.',
    impact: 'Saves ~10-30 kg CO₂e/month'
  },
  {
    id: 'tip-diet-waste',
    category: 'Diet & Lifestyle',
    impactArea: 'diet',
    title: 'Reduce Food Waste',
    tip: 'Roughly a third of food produced globally is wasted — planning meals and storing leftovers properly cuts this significantly.',
    impact: 'Saves ~15-40 kg CO₂e/month'
  }
];

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
    { key: 'vehicle', label: 'Car / Bike Travel', monthlyKg: Math.round(vehicleEmissions * 10) / 10, unit: 'kg CO₂e/month' },
    { key: 'electricity', label: 'Home Electricity', monthlyKg: Math.round(electricityEmissions * 10) / 10, unit: 'kg CO₂e/month' },
    { key: 'lpg', label: 'LPG Cooking Gas', monthlyKg: Math.round(lpgEmissions * 10) / 10, unit: 'kg CO₂e/month' },
    { key: 'publicTransit', label: 'Public Transit', monthlyKg: Math.round(publicTransitEmissions * 10) / 10, unit: 'kg CO₂e/month' },
    { key: 'flights', label: 'Flights', monthlyKg: Math.round(flightEmissions * 10) / 10, unit: 'kg CO₂e/month' }
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
  const topCategories = sorted.slice(0, 3);

  // The single highest emission source gets 2 tips instead of 1, so advice
  // concentrates on the area that will make the biggest difference for this
  // user, while the next two categories still get one targeted tip each.
  const targetedTips = topCategories.flatMap((item, index) => {
    const pool = REDUCTION_TIPS_MAP[item.key] || [];
    const count = index === 0 ? 2 : 1;
    return pool.slice(0, count);
  });

  if (targetedTips.length === 0) {
    targetedTips.push({
      id: 'tip-general',
      category: 'General',
      impactArea: 'general',
      title: 'Adopt Sustainable Habits',
      tip: 'Input your monthly travel and energy numbers above to see your exact carbon footprint and targeted reduction steps.',
      impact: 'Builds awareness & reduces environmental impact'
    });
  }

  // Diet isn't a calculator input yet, but every impact area the issue asks
  // for (transport, home energy, diet) should be represented — rotate through
  // the diet tips deterministically based on the footprint so it's stable
  // across re-renders for the same inputs.
  const totalKg = breakdown.reduce((sum, item) => sum + item.monthlyKg, 0);
  const dietTip = DIET_TIPS[Math.floor(totalKg) % DIET_TIPS.length];

  return [...targetedTips, dietTip];
}