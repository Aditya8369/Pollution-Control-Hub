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
    const pattern = new RegExp(`\\b(${escaped.join("|")})\\b`, "gi");

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