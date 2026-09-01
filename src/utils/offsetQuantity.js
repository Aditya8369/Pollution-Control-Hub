/**
 * Validation for the carbon-offset purchase quantity.
 *
 * The purchase dialog's `min="1"` and `max={availableTons}` were doing nothing: the
 * input is not inside a `<form>`, so constraint validation never runs and the
 * attributes only bound the spinner arrows. Anything typed went straight through
 * `Number(e.target.value)` into the price line and then into the request body — a
 * cleared field as 0, `-5` as a negative total, a bare `-` or `e` as `NaN`.
 *
 * `Total: $NaN` above an enabled "Confirm Purchase" button is the part that actually
 * matters. Whatever the API does with the value, the user is being asked to approve a
 * charge the page cannot state.
 *
 * These live apart from the component so the boundaries can be asserted directly
 * rather than through a modal.
 */

/** Largest quantity a single purchase may request, independent of stock. */
export const MAX_TONS_PER_PURCHASE = 100000;

/**
 * `Number` with the coercions that hide missing data removed.
 *
 * `Number(null)`, `Number('')`, `Number([])` and `Number(false)` are all `0`, which is
 * exactly the confusion these helpers exist to prevent: a project with no
 * `pricePerTon` would price at $0.00, and an unknown stock level would read as "0
 * tons available". Only numbers and non-empty numeric strings get through.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
function toFiniteNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * @typedef {Object} QuantityCheck
 * @property {boolean} valid
 * @property {number|null} tons - The parsed quantity, or null when it is unusable.
 * @property {string|null} error - Why it was rejected, phrased for display.
 */

/**
 * Parses and checks a quantity typed into the purchase dialog.
 *
 * Takes the raw string rather than a number, because `Number('')` is `0` and `Number`
 * of a partially typed `-` or `1e` is `NaN` — by the time the value is a number the
 * difference between "empty" and "zero" has already been lost.
 *
 * @param {string|number} raw - The field's current value.
 * @param {number|null|undefined} availableTons - Stock for the project, if known.
 * @returns {QuantityCheck}
 */
export function validateQuantity(raw, availableTons) {
  const text = typeof raw === 'number' ? String(raw) : String(raw ?? '').trim();

  if (text === '') {
    return { valid: false, tons: null, error: 'Enter how many tons you want to offset.' };
  }

  const tons = Number(text);

  if (!Number.isFinite(tons)) {
    return { valid: false, tons: null, error: 'Enter a number of tons.' };
  }

  if (tons <= 0) {
    return { valid: false, tons: null, error: 'Enter a quantity of at least 1 ton.' };
  }

  if (!Number.isInteger(tons)) {
    // Offsets are retired as whole credits; a fractional ton is not a thing that can
    // be bought, and rounding it silently would change what the user is charged.
    return { valid: false, tons: null, error: 'Offsets are sold in whole tons.' };
  }

  const stock = toFiniteNumber(availableTons);
  if (stock !== null && tons > stock) {
    return {
      valid: false,
      tons: null,
      error: stock === 1
        ? 'Only 1 ton is available from this project.'
        : `Only ${stock} tons are available from this project.`,
    };
  }

  if (tons > MAX_TONS_PER_PURCHASE) {
    return {
      valid: false,
      tons: null,
      error: `A single purchase is limited to ${MAX_TONS_PER_PURCHASE.toLocaleString()} tons.`,
    };
  }

  return { valid: true, tons, error: null };
}

/**
 * Formats a price in USD, or a dash when there is nothing sensible to state.
 *
 * Every path that could produce `NaN`, `Infinity` or a negative amount returns the dash
 * instead. A total is a claim about what someone is about to be charged; when the page
 * cannot make that claim it should say so rather than print `$NaN`.
 *
 * @param {unknown} amount
 * @returns {string}
 */
export function formatUsd(amount) {
  const value = toFiniteNumber(amount);
  if (value === null || value < 0) return '—';
  return `$${value.toFixed(2)}`;
}

/**
 * The line total for a purchase, or null when it cannot be computed.
 *
 * @param {number|null} tons
 * @param {unknown} pricePerTon
 * @returns {number|null}
 */
export function lineTotal(tons, pricePerTon) {
  const price = toFiniteNumber(pricePerTon);
  if (price === null || price < 0) return null;
  if (typeof tons !== 'number' || !Number.isFinite(tons) || tons <= 0) return null;
  return tons * price;
}

/**
 * A project's certification label, tolerant of a record that has none.
 *
 * `project.certification.replace('_', ' ')` threw inside `projects.map`, so a single
 * malformed record blanked the entire marketplace rather than one card.
 *
 * @param {unknown} certification
 * @returns {string|null} A display label, or null when there is nothing to show.
 */
export function certificationLabel(certification) {
  if (typeof certification !== 'string') return null;
  const label = certification.split('_').join(' ').trim();
  return label === '' ? null : label;
}
