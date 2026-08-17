export function calculateCarbon(input) {
  if (input === null || input === undefined) {
    throw new Error('Input cannot be null or undefined');
  }

  return Number(input);
}

export default function CarbonCalculator(input) {
  return calculateCarbon(input);
}
