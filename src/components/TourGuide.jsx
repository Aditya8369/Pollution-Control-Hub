import introJs from 'intro.js';
import 'intro.js/minified/introjs.min.css';

const TOUR_COMPLETED_KEY = 'pollution_hub_tour_completed';

export function startTour(onComplete) {
  introJs().setOptions({
    steps: [
      {
        element: document.querySelector('#dashboard-header'),
        intro: 'Welcome to Pollution Control Hub! Here you can monitor real-time air quality metrics.',
      },
      {
        element: document.querySelector('#alerts-panel'),
        intro: 'Configure your custom pollution thresholds and view history here.',
      },
      {
        element: document.querySelector('#help-tour-btn'),
        intro: 'You can restart this interactive walkthrough anytime from the Help menu.',
      }
    ],
    showBullets: true,
    exitOnOverlayClick: false,
  }).onexit(() => {
    // Store completion flag per user in localStorage
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    if (onComplete) onComplete();
  }).start();
}

export function hasCompletedTour() {
  return localStorage.getItem(TOUR_COMPLETED_KEY) === 'true';
}
