import { eventBus } from '../core/events';

export const BADGES = [
  {
    id: 'first_report',
    name: 'First Report',
    description: 'Post your first community report about local pollution.',
    icon: '📣',
  },
  {
    id: 'streak_master',
    name: 'Streak Master',
    description: 'Achieve a streak of 3 correct guesses in the Hotspot Scout game.',
    icon: '🔥',
  },
  {
    id: 'aqi_expert',
    name: 'AQI Expert',
    description: 'Successfully complete an AQI Mission or get a perfect score in a quiz.',
    icon: '🎓',
  },
  {
    id: 'route_explorer',
    name: 'Route Explorer',
    description: 'Plan a clean commute route using the Clean Route Planner.',
    icon: '🚲',
  }
];

export function getAchievementsState() {
  try {
    const stored = localStorage.getItem('pollution_hub_achievements');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse achievements', e);
  }
  return {
    unlocked: []
  };
}

export function saveAchievementsState(state) {
  try {
    localStorage.setItem('pollution_hub_achievements', JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save achievements', e);
  }
}
