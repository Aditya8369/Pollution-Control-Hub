/**
 * Keyboard navigation for a roving-tabindex widget.
 *
 * A composite widget — a radiogroup, a toolbar, a tab list — is one tab stop, and
 * the arrow keys move within it. Both halves of that are load-bearing: giving
 * every item `tabIndex={-1}` without arrow handling makes the group unreachable,
 * and arrow handling without a tab stop makes it unreachable a different way.
 * `QuizSection` had the first half only, and computed its tab stop as
 * `selected === option`, so before the first answer no option was tabbable and the
 * whole quiz could not be played with a keyboard.
 *
 * @see https://www.w3.org/WAI/ARIA/apg/patterns/radio/
 */

/** Keys that move focus backwards within a group. */
const PREVIOUS_KEYS = new Set(['ArrowUp', 'ArrowLeft']);

/** Keys that move focus forwards within a group. */
const NEXT_KEYS = new Set(['ArrowDown', 'ArrowRight']);

/**
 * Which item in a group should carry the tab stop.
 *
 * Exactly one item is tabbable at all times: the active one, or the first item
 * when nothing is active yet. Returning 0 rather than -1 for "nothing selected"
 * is the whole fix — an index of -1 matches no item, which is how the group ended
 * up with no tab stop at all.
 *
 * @param {number} activeIndex - Index of the selected item, or -1 for none.
 * @param {number} count - Number of items in the group.
 * @returns {number} The index that should have `tabIndex={0}`, or -1 for an empty group.
 */
export function getTabStopIndex(activeIndex, count) {
  if (!Number.isFinite(count) || count <= 0) return -1;
  if (!Number.isFinite(activeIndex) || activeIndex < 0 || activeIndex >= count) return 0;
  return activeIndex;
}

/**
 * Where an arrow, Home or End key should move focus.
 *
 * Wraps at both ends, which is what the radiogroup pattern specifies — unlike a
 * listbox, a radiogroup has no "stop at the edge" behaviour.
 *
 * @param {string} key - A `KeyboardEvent.key` value.
 * @param {number} currentIndex - The index currently focused.
 * @param {number} count - Number of items in the group.
 * @returns {number|null} The index to move to, or null when the key isn't ours.
 */
export function getNextFocusIndex(key, currentIndex, count) {
  if (!Number.isFinite(count) || count <= 0) return null;

  const from = Number.isFinite(currentIndex) && currentIndex >= 0 && currentIndex < count
    ? currentIndex
    : 0;

  if (PREVIOUS_KEYS.has(key)) return (from - 1 + count) % count;
  if (NEXT_KEYS.has(key)) return (from + 1) % count;
  if (key === 'Home') return 0;
  if (key === 'End') return count - 1;

  return null;
}

/**
 * Whether a key is one this helper handles.
 *
 * Callers use it to decide whether to `preventDefault` — arrow keys otherwise
 * scroll the page out from under the widget.
 *
 * @param {string} key
 * @returns {boolean}
 */
export function isRovingKey(key) {
  return PREVIOUS_KEYS.has(key) || NEXT_KEYS.has(key) || key === 'Home' || key === 'End';
}
