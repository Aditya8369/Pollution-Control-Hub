import glossaryData from "../data/glossary.json";

// Builds a single case-insensitive alternation regex from every glossary term
// (and full form, e.g. "Air Quality Index" alongside "AQI"), longest variant
// first so multi-word terms match before a shorter term that happens to be a
// substring of them.
function buildTermIndex() {
    const lookup = new Map(); // lowercased variant -> glossary entry
    const variants = [];

    glossaryData.forEach((entry) => {
        const forms = new Set([entry.term, entry.fullForm].filter(Boolean));
        forms.forEach((form) => {
            const key = form.toLowerCase();
            if (!lookup.has(key)) {
                lookup.set(key, entry);
                variants.push(form);
            }
        });
    });

    variants.sort((a, b) => b.length - a.length);
    const escaped = variants.map((v) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    // \b fails for terms that start or end with non-word characters (Unicode
    // symbols, parentheses, slashes, etc.) because \b is a transition between
    // \w and \W — it never fires when the term boundary character is itself \W.
    //
    // Using negative lookbehind/lookahead against the ASCII word-character set
    // [A-Za-z0-9_] gives the same partial-word guard for alphanumeric terms
    // while also matching correctly when the term starts or ends with a symbol,
    // Unicode character, or punctuation (e.g. "µg/m³", "Lead (Pb)").
    const pattern = new RegExp(`(?<![A-Za-z0-9_])(${escaped.join("|")})(?![A-Za-z0-9_])`, "gi");

    return { lookup, pattern };
}

let cached = null;

/**
 * Returns the shared glossary term index, building it once and caching it —
 * glossary.json doesn't change at runtime, so every caller can reuse the same
 * lookup map and pattern.
 *
 * @returns {{ lookup: Map<string, object>, pattern: RegExp }}
 */
export function getGlossaryTermIndex() {
    if (!cached) cached = buildTermIndex();
    return cached;
}