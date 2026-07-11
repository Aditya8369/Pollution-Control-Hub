import {
  Bus,
  Zap,
  Factory,
  Flame,
  TreePine,
  Crosshair,
  ChefHat,
  Car,
  Sun,
  Footprints,
  Sprout,
  CloudFog,
  Siren
} from 'lucide-react';

export const ACTIONS = [
  {
    id: 'public_transport',
    name: 'Promote Public Transport',
    description: 'Provide free electric bus passes and expand subway frequency.',
    category: 'transport',
    icon: Bus,
    reductions: {
      pm2_5: 15,
      nitrogen_dioxide: 25,
      pm10: 10
    }
  },
  {
    id: 'ev_subsidies',
    name: 'EV Incentives & Mandates',
    description: 'Subsidize electric vehicles and install city-wide charging grids.',
    category: 'transport',
    icon: Zap,
    reductions: {
      nitrogen_dioxide: 35,
      pm2_5: 10,
      carbon_monoxide: 20
    }
  },
  {
    id: 'factory_filters',
    name: 'Industrial Smog Scrubbers',
    description: 'Mandate electrostatic precipitators and gas scrubbers on all smokestacks.',
    category: 'industry',
    icon: Factory,
    reductions: {
      pm10: 30,
      pm2_5: 25,
      nitrogen_dioxide: 15
    }
  },
  {
    id: 'waste_ban',
    name: 'Ban Open Waste Burning',
    description: 'Enforce strict fines on burning trash and agricultural crop residue.',
    category: 'waste',
    icon: Flame,
    reductions: {
      pm2_5: 20,
      pm10: 20,
      carbon_monoxide: 15
    }
  },
  {
    id: 'urban_forestry',
    name: 'Urban Green Canopy',
    description: 'Plant millions of native trees and expand rooftop gardens to filter air.',
    category: 'nature',
    icon: TreePine,
    reductions: {
      pm2_5: 12,
      ozone: 15,
      nitrogen_dioxide: 8
    }
  },
  {
    id: 'anti_smog_guns',
    name: 'Deploy Anti-Smog Guns',
    description: 'Spray fine water mist from high-rise points to settle airborne dust.',
    category: 'technology',
    icon: Crosshair,
    reductions: {
      pm10: 35,
      pm2_5: 15
    }
  },
  {
    id: 'clean_cooking',
    name: 'Clean Cooking Initiative',
    description: 'Replace biomass cookstoves with LPG or induction stoves in suburbs.',
    category: 'residential',
    icon: ChefHat,
    reductions: {
      pm2_5: 18,
      carbon_monoxide: 30,
      pm10: 10
    }
  },
  {
    id: 'carpool_mandate',
    name: 'Carpool & Odd-Even Scheme',
    description: 'Restrict private vehicle usage on alternate days to cut peak traffic.',
    category: 'transport',
    icon: Car,
    reductions: {
      nitrogen_dioxide: 20,
      pm2_5: 15,
      ozone: 10
    }
  },
  {
    id: 'solar_transition',
    name: 'Solar Grid Transition',
    description: 'Shut down coal-fired thermal plants near the city and switch to solar.',
    category: 'energy',
    icon: Sun,
    reductions: {
      pm2_5: 22,
      pm10: 15,
      nitrogen_dioxide: 20,
      carbon_monoxide: 10
    }
  },
  {
    id: 'pedestrian_zones',
    name: 'Car-Free Pedestrian Zones',
    description: 'Convert major commercial streets into walking-only zones with bike sharing.',
    category: 'urban',
    icon: Footprints,
    reductions: {
      nitrogen_dioxide: 18,
      pm2_5: 8,
      carbon_monoxide: 12
    }
  }
];

export const MISSIONS = [
  {
    id: 'easy_rescue',
    name: 'City Green Start',
    difficulty: 'Easy',
    description: 'Deploy key policies to improve air quality. A gentle introduction to environmental policy.',
    targetImprovement: 15, // percent
    allowedSteps: 4,
    timerDuration: 60, // seconds
    icon: Sprout,
    simulatedCurrent: {
      pm2_5: 65,
      pm10: 95,
      nitrogen_dioxide: 50,
      ozone: 40,
      carbon_monoxide: 800,
      us_aqi: 155 // Unhealthy
    }
  },
  {
    id: 'medium_smog',
    name: 'Smog Buster Mission',
    difficulty: 'Medium',
    description: 'A thick winter smog is trapping pollutants. You need swift action to clear the skies!',
    targetImprovement: 30, // percent
    allowedSteps: 3,
    timerDuration: 45, // seconds
    icon: CloudFog,
    simulatedCurrent: {
      pm2_5: 140,
      pm10: 180,
      nitrogen_dioxide: 90,
      ozone: 60,
      carbon_monoxide: 1800,
      us_aqi: 195 // Unhealthy
    }
  },
  {
    id: 'hard_crisis',
    name: 'Industrial Zone Crisis',
    difficulty: 'Hard',
    description: 'Coal plants and industrial burning have triggered an extreme hazardous alert. Act fast with limited moves!',
    targetImprovement: 45, // percent
    allowedSteps: 2,
    timerDuration: 30, // seconds
    icon: Siren,
    simulatedCurrent: {
      pm2_5: 280,
      pm10: 380,
      nitrogen_dioxide: 180,
      ozone: 85,
      carbon_monoxide: 3200,
      us_aqi: 330 // Hazardous
    }
  }
];
