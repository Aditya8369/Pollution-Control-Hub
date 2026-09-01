import PropTypes from 'prop-types';

/**
 * Card and tile controls that a keyboard can actually operate.
 *
 * Five dashboards implemented their primary controls as `<div onClick={...}>`. A mouse
 * could operate them; nothing else could. They were not in the tab order, Enter and Space
 * did nothing, and a screen reader announced them as plain text with no hint that they did
 * anything at all — a WCAG 2.1.1 (Keyboard) failure, and a 4.1.2 (Name, Role, Value) one
 * for good measure. In each case the clickable div *was* the feature: selecting a weather
 * condition, an ocean region or a CO2 scenario, or expanding a card to reveal the health
 * guidance behind it. See #1140.
 *
 * Both components below render a real `<button>`. That is deliberate: tab order, Enter and
 * Space activation, the `button` role, focus styling and the disabled state all come from
 * the element rather than from hand-rolled `onKeyDown` handlers that have to be got right
 * five separate times.
 */

/**
 * The style that makes a `<button>` look like the `<div>` it replaces.
 *
 * A user-agent button brings its own background, border, padding, font and centred text.
 * Callers spread their own style after this one, so anything they set still wins.
 */
export const RESET_BUTTON_STYLE = {
  appearance: 'none',
  background: 'none',
  border: 0,
  margin: 0,
  padding: 0,
  font: 'inherit',
  color: 'inherit',
  textAlign: 'left',
  width: '100%',
  cursor: 'pointer',
};

/**
 * A card header that shows and hides the detail below it.
 *
 * `aria-expanded` is the part that a `<div>` could never provide: it tells a screen reader
 * user that there is detail here at all, and whether it is currently open.
 *
 * @param {object} props
 * @param {boolean} props.expanded - Whether the panel it controls is open.
 * @param {() => void} props.onToggle - Called on click, Enter and Space.
 * @param {string} props.label - Accessible name, e.g. "PM2.5 health details".
 * @param {string} [props.controls] - The id of the panel, when it has one.
 * @param {object} [props.style] - Inline style, applied over the reset.
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function DisclosureButton({
  expanded,
  onToggle,
  label,
  controls,
  style,
  className,
  children,
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={controls}
      aria-label={label}
      onClick={onToggle}
      className={className}
      style={{ ...RESET_BUTTON_STYLE, ...style }}
    >
      {children}
    </button>
  );
}

DisclosureButton.propTypes = {
  expanded: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  controls: PropTypes.string,
  style: PropTypes.object,
  className: PropTypes.string,
  children: PropTypes.node,
};

/**
 * One option in a single-choice set of cards or tiles.
 *
 * `aria-pressed` rather than listbox semantics: these are buttons that stay pressed, not a
 * `<select>` drawn as cards. Claiming `role="option"` would oblige the group to be a
 * listbox with arrow-key navigation and `aria-activedescendant`, which is a bigger promise
 * than any of these panels keep.
 *
 * @param {object} props
 * @param {boolean} props.selected - Whether this option is the chosen one.
 * @param {() => void} props.onSelect - Called on click, Enter and Space.
 * @param {string} props.label - Accessible name, e.g. "Ocean region: Arctic Ocean".
 * @param {object} [props.style] - Inline style, applied over the reset.
 * @param {string} [props.className]
 * @param {import('react').ReactNode} props.children
 */
export function SelectionButton({
  selected,
  onSelect,
  label,
  style,
  className,
  children,
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onSelect}
      className={className}
      style={{ ...RESET_BUTTON_STYLE, ...style }}
    >
      {children}
    </button>
  );
}

SelectionButton.propTypes = {
  selected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  label: PropTypes.string.isRequired,
  style: PropTypes.object,
  className: PropTypes.string,
  children: PropTypes.node,
};
