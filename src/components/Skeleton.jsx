import PropTypes from "prop-types";

/** 
 * Generic skeleton loading placeholder.
 *
 * @param {Object} props Component props.
 * @param {string} [props.className] Additional CSS classes.
 * @param {React.CSSProperties} [props.style] Inline styles applied to the skeleton.
 */ 
export default function Skeleton({ className = '', style = {} }) {
  return <div className={`skeleton ${className}`} style={style} />;
}

Skeleton.propTypes = {
  /**
   * Additional CSS classes applied to the skeleton.
   */
  className: PropTypes.string,

  /**
   * Inline styles for customizing the skeleton.
   */
  style: PropTypes.object,
};