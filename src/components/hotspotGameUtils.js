/** @param {any} arr */
export function shuffleArray(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** @param {any} points */
export function getHighestAQI(points) {
  return points.reduce((max, point) =>
    point.aqi > max.aqi ? point : max
  );
}

const HIGH_SCORE_KEY = "hotspot-scout-high-score";

export function getHighScore() {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch {
    return 0;
  }
}

/** @param {number} score */
export function saveHighScore(score) {
  try {
    const current = getHighScore();
    if (score > current) {
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
      return score;
    }
    return current;
  } catch {
    return score;
  }
}