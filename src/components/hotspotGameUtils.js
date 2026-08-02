/** @param {any} arr */
export function shuffleArray(arr) {
  // Fisher–Yates: an unbiased, uniform shuffle. The `sort(() => Math.random() - 0.5)`
  // idiom is not uniform — under V8's sort it skews the order heavily.
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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