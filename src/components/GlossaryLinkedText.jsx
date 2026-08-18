import { useMemo, useState, Fragment } from "react";
import PropTypes from "prop-types";
import { getGlossaryTermIndex } from "../utils/glossaryTermMatcher";

/**
 * Wraps the first mention of each recognized Glossary term inside `text` with
 * a small tooltip showing its definition, so readers can hover/tap for a quick
 * explanation without leaving the page. Only the first occurrence of each term
 * is linked (to avoid cluttering repeated mentions); everything else renders
 * as plain text.
 *
 * @param {{ text: string }} props
 */
export default function GlossaryLinkedText({ text }) {
    const [openTerm, setOpenTerm] = useState(null);

    const parts = useMemo(() => {
        const { lookup, pattern } = getGlossaryTermIndex();
        const re = new RegExp(pattern); // fresh copy — pattern is shared/cached and stateful (lastIndex)
        const seen = new Set();
        const segments = [];
        let lastIndex = 0;
        let match;

        while ((match = re.exec(text)) !== null) {
            const matchedText = match[0];
            const entry = lookup.get(matchedText.toLowerCase());

            if (!entry || seen.has(entry.term)) continue;
            seen.add(entry.term);

            segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
            segments.push({ type: "term", value: matchedText, entry });
            lastIndex = match.index + matchedText.length;
        }
        segments.push({ type: "text", value: text.slice(lastIndex) });
        return segments;
    }, [text]);

    return (
        <>
            {parts.map((part, i) =>
                part.type === "text" ? (
                    <Fragment key={i}>{part.value}</Fragment>
                ) : (
                    <span key={i} style={{ position: "relative", display: "inline" }}>
                        <button
                            type="button"
                            className="glossary-term-link"
                            onMouseEnter={() => setOpenTerm(part.entry.term)}
                            onMouseLeave={() => setOpenTerm(null)}
                            onFocus={() => setOpenTerm(part.entry.term)}
                            onBlur={() => setOpenTerm(null)}
                            onClick={() => setOpenTerm((prev) => (prev === part.entry.term ? null : part.entry.term))}
                        >
                            {part.value}
                        </button>
                        {openTerm === part.entry.term && (
                            <span role="tooltip" className="info-tooltip-bubble glossary-term-bubble">
                                <strong>{part.entry.term}</strong>: {part.entry.definition}
                            </span>
                        )}
                    </span>
                )
            )}
        </>
    );
}

GlossaryLinkedText.propTypes = {
    text: PropTypes.string.isRequired,
};