/**
 * Renders the `**bold**` convention as React nodes.
 *
 * `AnalyticsInsights` used to do this by writing HTML:
 *
 *   dangerouslySetInnerHTML={{
 *     __html: insight.description.replace(/\*\*(.*?)\*\*\/g, '<strong>$1</strong>')
 *   }}
 *
 * The `replace` only rewrites the `**` markers, but the *whole* string is then
 * handed to `innerHTML`, so every other character in it is interpreted as markup
 * too. `insight.description` is built by interpolating the location name, which
 * comes from the geocoder's answer to text the visitor typed — third-party data
 * on a path to `innerHTML`, which is the definition of an XSS sink (#1053).
 *
 * Producing nodes instead means React escapes the text between the markers, and
 * the bold segments, the way it escapes everything else in the component. There
 * is no string of HTML at any point, so there is nothing to get the escaping of
 * wrong. `CommunityHub` reached the same conclusion after #497, and its comment
 * now reads "component never uses dangerouslySetInnerHTML".
 */

/** Matches a `**...**` span. Lazy, so `**a** and **b**` is two spans, not one. */
const BOLD_PATTERN = /\*\*([\s\S]+?)\*\*/g;

/**
 * Splits `text` into plain strings and `<strong>` elements.
 *
 * Unmatched markers are left as literal text rather than guessed at: a lone `**`
 * in a sentence is far more likely to be punctuation than an unclosed tag, and
 * the alternative is bolding the entire rest of the string.
 *
 * @param {unknown} text
 * @returns {import('react').ReactNode[]} Empty when there is nothing to render.
 */
export function renderBoldMarkup(text) {
  // A non-string is not an error worth throwing over. The previous code called
  // `.replace` straight on the value, so an insight pushed without a description
  // took the whole panel down with a TypeError.
  if (typeof text !== 'string' || text.length === 0) return [];

  /** @type {import('react').ReactNode[]} */
  const nodes = [];
  let lastIndex = 0;
  let key = 0;

  // A fresh regex per call: BOLD_PATTERN is global, and `lastIndex` persists
  // between calls on a shared instance, so the second insight would start
  // matching from wherever the first one left off.
  const pattern = new RegExp(BOLD_PATTERN.source, 'g');

  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    nodes.push(<strong key={`bold-${key++}`}>{match[1]}</strong>);
    lastIndex = match.index + match[0].length;

    // `**` with nothing between it matches zero-width in some engines; step on
    // so the loop cannot spin.
    if (match[0].length === 0) pattern.lastIndex++;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}
