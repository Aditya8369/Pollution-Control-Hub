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