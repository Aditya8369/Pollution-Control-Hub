/**
 * Calculates the Pearson correlation coefficient between two arrays of numbers.
 */
export function calculatePearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0 || n !== y.length) return 0;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);

  const sumXSq = x.reduce((a, b) => a + b * b, 0);
  const sumYSq = y.reduce((a, b) => a + b * b, 0);

  const pSum = x.reduce((sum, xi, i) => sum + xi * y[i], 0);

  const num = pSum - (sumX * sumY) / n;
  const den = Math.sqrt((sumXSq - (sumX * sumX) / n) * (sumYSq - (sumY * sumY) / n));

  if (den === 0) return 0;
  return parseFloat((num / den).toFixed(2));
}

/**
 * Computes automated textual interpretations from correlation coefficients.
 */
export function getCorrelationStrengthKey(r: number): string {
  const absR = Math.abs(r);
  if (absR >= 0.7) return r > 0 ? 'strong_positive' : 'strong_negative';
  if (absR >= 0.4) return r > 0 ? 'moderate_positive' : 'moderate_negative';
  if (absR >= 0.1) return r > 0 ? 'weak_positive' : 'weak_negative';
  return 'insignificant';
}
