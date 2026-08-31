import { aqiToCigarettes, pm25ToCigarettes } from "../utils/cigaretteEquivalent";

/**
 * Surface the "cigarettes/day" equivalent of the current air quality — a
 * visceral way to read an AQI number. Pass either `aqi` or a raw `pm25`
 * concentration. Renders nothing when the equivalent rounds to zero (clean
 * air) so it never shows a meaningless "0 cigarettes".
 *
 * @param {{ aqi?: number, pm25?: number }} params
 */
export default function CigaretteEquivalent({ aqi, pm25 }) {
  const cigarettes =
    typeof pm25 === "number" ? pm25ToCigarettes(pm25) : aqiToCigarettes(aqi);

  if (!cigarettes) return null;

  const label = cigarettes === 1 ? "cigarette" : "cigarettes";

  return (
    <div className="cigarette-equivalent-card" data-testid="cigarette-equivalent">
      <span className="cigarette-equivalent-icon" aria-hidden="true">
        🚬
      </span>
      <span className="cigarette-equivalent-text">
        ≈ <strong>{cigarettes}</strong> {label}/day
      </span>
    </div>
  );
}
