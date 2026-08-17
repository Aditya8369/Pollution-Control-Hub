import { useState } from "react";
import PropTypes from "prop-types";

/**
 * Small info icon that reveals an explanatory tooltip on hover, focus, or tap.
 * Use next to stats or terms that aren't self-explanatory (e.g. "Inhaled PM2.5 Dose").
 *
 * @param {{ text: string }} props
 */
export default function InfoTooltip({ text }) {
    const [visible, setVisible] = useState(false);

    return (
        <span
            style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}
        >
            <button
                type="button"
                className="info-tooltip-trigger"
                aria-label={text}
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
                onFocus={() => setVisible(true)}
                onBlur={() => setVisible(false)}
                onClick={() => setVisible((prev) => !prev)}
            >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="11" x2="12" y2="16" />
                    <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
            </button>
            {visible && (
                <span role="tooltip" className="info-tooltip-bubble">
                    {text}
                </span>
            )}
        </span>
    );
}

InfoTooltip.propTypes = {
    text: PropTypes.string.isRequired,
};