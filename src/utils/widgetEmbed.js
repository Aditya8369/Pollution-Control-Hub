/**
 * Building the HTML snippet the widget generator hands to a site owner.
 *
 * This lives outside the component for two reasons. The snippet is the product —
 * whatever it says is what runs on somebody else's page — and a template literal
 * buried in JSX cannot be asserted on. Every option the UI exposes has to survive
 * into the markup, which is the part that was going wrong: `showPollutants` was a
 * labelled control that changed the preview and appeared nowhere in the output.
 */

export const WIDGET_SCRIPT_URL = 'https://pollution-control-hub.vercel.app/widget.js';

/**
 * The class the loader hooks onto.
 *
 * Deliberately a class and not an id. The snippet used to hardcode
 * `id="pollution-hub-widget"`, so anyone embedding two badges — a city comparison,
 * a regional dashboard — produced duplicate ids on their page, and any
 * `getElementById` loader would only ever find the first.
 */
export const WIDGET_CLASS = 'pollution-hub-widget';

export const WIDGET_SIZES = ['small', 'medium', 'large'];
export const WIDGET_THEMES = ['dark', 'light'];

// The values the panel starts on. Kept explicit rather than "first in the list",
// so that reordering either array cannot silently change what an unrecognised
// value falls back to.
export const DEFAULT_SIZE = 'medium';
export const DEFAULT_THEME = 'dark';

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes a value for interpolation into a double-quoted HTML attribute.
 *
 * `cityName` reaches the generator from the location search, so it is API-sourced
 * text rather than a fixed list. A name containing a double quote closed the
 * attribute early and turned the remainder of the snippet into markup — in a
 * snippet the user is being told to paste into their own site.
 *
 * `&` is replaced first; doing it later would double-escape the entities
 * introduced by the other replacements.
 *
 * @param {any} value
 * @returns {string}
 */
export function escapeHtmlAttribute(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

/**
 * A coordinate that is safe to put in an attribute, or null if it isn't one.
 *
 * @param {any} value
 * @returns {number|null}
 */
function coordinate(value) {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * One value from a fixed set, falling back to `fallback` when it isn't in the set.
 *
 * @param {any} value
 * @param {string[]} allowed
 * @param {string} fallback
 * @returns {string}
 */
function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

/**
 * @typedef {Object} WidgetConfig
 * @property {string} [cityName]
 * @property {number} [lat]
 * @property {number} [lon]
 * @property {string} [theme] - 'dark' or 'light'.
 * @property {string} [size] - 'small', 'medium' or 'large'.
 * @property {boolean} [showPollutants] - Whether the embedded widget shows the breakdown.
 */

/**
 * The attributes the embedded container carries, as ordered pairs.
 *
 * Separated from the string building so tests can assert on the configuration
 * rather than on quoting and whitespace.
 *
 * @param {WidgetConfig} config
 * @returns {[string, string][]}
 */
export function widgetAttributes(config = {}) {
  const { cityName = '', lat, lon, theme, size, showPollutants = true } = config;

  /** @type {[string, string][]} */
  const attributes = [['data-city', String(cityName ?? '')]];

  const latitude = coordinate(lat);
  const longitude = coordinate(lon);
  if (latitude !== null) attributes.push(['data-lat', String(latitude)]);
  if (longitude !== null) attributes.push(['data-lon', String(longitude)]);

  attributes.push(['data-theme', oneOf(theme, WIDGET_THEMES, DEFAULT_THEME)]);
  attributes.push(['data-size', oneOf(size, WIDGET_SIZES, DEFAULT_SIZE)]);
  // The control that was missing from the output entirely.
  attributes.push(['data-pollutants', showPollutants ? 'true' : 'false']);

  return attributes;
}

/**
 * The full snippet: container plus loader script.
 *
 * @param {WidgetConfig} config
 * @returns {string}
 */
export function buildEmbedSnippet(config = {}) {
  const attributes = widgetAttributes(config)
    .map(([name, value]) => `${name}="${escapeHtmlAttribute(value)}"`)
    .join(' ');

  return (
    `<div class="${WIDGET_CLASS}" ${attributes}></div>\n` +
    `<script src="${WIDGET_SCRIPT_URL}" async></script>`
  );
}
