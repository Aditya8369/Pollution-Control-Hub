/**
 * Tests for src/utils/glossaryTermMatcher.js -- Issue #1112
 *
 * Covers:
 *   - All 7 known affected terms (symbols, Unicode, parentheses)
 *   - Normal alphanumeric terms continue to match
 *   - Partial-word matches are NOT introduced
 *   - Longest-variant wins over shorter substring
 *   - Case-insensitive matching
 *
 * The real glossary.json is mocked with a controlled fixture so these tests
 * are independent of future data changes and run without file I/O.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Controlled glossary fixture -- covers all scenarios under test
// ---------------------------------------------------------------------------
const MOCK_GLOSSARY = [
    // Normal alphanumeric terms
    { term: "AQI",               fullForm: "Air Quality Index",          definition: "d" },
    { term: "PM2.5",             fullForm: null,                          definition: "d" },
    { term: "NO2",               fullForm: "Nitrogen Dioxide",            definition: "d" },
    { term: "Smog",              fullForm: null,                          definition: "d" },

    // Issue #1112 -- terms with symbols / Unicode / parentheses
    // 1. microg/m3  -- starts AND ends with non-word characters
    { term: "\u00b5g/m\u00b3",  fullForm: "Micrograms per Cubic Meter",  definition: "d" },

    // 2. Lead (Pb) -- term ends with ")"
    { term: "Lead (Pb)",         fullForm: "Atmospheric Lead",            definition: "d" },

    // 3. Particulate Matter (PM) -- fullForm ends with ")"
    { term: "Particulate Matter", fullForm: "Particulate Matter (PM)",   definition: "d" },

    // 4. Black Carbon (BC) -- fullForm ends with ")"
    { term: "Black Carbon",      fullForm: "Black Carbon (BC)",           definition: "d" },

    // 5. Battery Electric Vehicle (BEV) -- fullForm ends with ")"
    { term: "Electric Vehicle",  fullForm: "Battery Electric Vehicle (BEV)", definition: "d" },

    // 6. Fine Particulate Matter (<=2.5 um) -- fullForm ends ")", contains <= and micro
    { term: "PM2.5-fine",        fullForm: "Fine Particulate Matter (\u22642.5 \u00b5m)", definition: "d2" },

    // 7. Coarse Particulate Matter (<=10 um) -- fullForm ends ")", contains <= and micro
    { term: "PM10",              fullForm: "Coarse Particulate Matter (\u226410 \u00b5m)", definition: "d" },
];

vi.mock("../data/glossary.json", () => ({ default: MOCK_GLOSSARY }));

// Must be imported AFTER the mock is registered so it picks up the stub.
let getGlossaryTermIndex;
beforeEach(async () => {
    vi.resetModules();
    vi.mock("../data/glossary.json", () => ({ default: MOCK_GLOSSARY }));
    ({ getGlossaryTermIndex } = await import("./glossaryTermMatcher.js"));
});

// ---------------------------------------------------------------------------
// Helper: collect all match group[1] values (the term, without lookarounds)
// ---------------------------------------------------------------------------
function allMatches(text) {
    const { pattern } = getGlossaryTermIndex();
    const re = new RegExp(pattern);
    const hits = [];
    let m;
    while ((m = re.exec(text)) !== null) {
        hits.push(m[1]);
    }
    return hits;
}

// ---------------------------------------------------------------------------
// 1. Issue #1112 -- regression suite for all 7 known affected terms
// ---------------------------------------------------------------------------
describe("Issue #1112 -- terms with symbols / Unicode / parentheses", () => {
    it("matches microg/m3 when surrounded by spaces", () => {
        expect(allMatches("Concentration of 15 \u00b5g/m\u00b3 recorded today.")).toContain("\u00b5g/m\u00b3");
    });

    it("matches microg/m3 at start of string", () => {
        expect(allMatches("\u00b5g/m\u00b3 is the standard unit.")).toContain("\u00b5g/m\u00b3");
    });

    it("matches microg/m3 at end of string", () => {
        expect(allMatches("WHO limit is 15 \u00b5g/m\u00b3")).toContain("\u00b5g/m\u00b3");
    });

    it("matches 'Lead (Pb)' when followed by a space", () => {
        expect(allMatches("Lead (Pb) causes neurological damage.")).toContain("Lead (Pb)");
    });

    it("matches 'Lead (Pb)' at end of string", () => {
        expect(allMatches("The primary pollutant here is Lead (Pb)")).toContain("Lead (Pb)");
    });

    it("matches 'Particulate Matter (PM)' in a sentence", () => {
        expect(allMatches("Particulate Matter (PM) comes in many sizes.")).toContain("Particulate Matter (PM)");
    });

    it("matches 'Black Carbon (BC)' in a sentence", () => {
        expect(allMatches("Black Carbon (BC) absorbs solar radiation.")).toContain("Black Carbon (BC)");
    });

    it("matches 'Battery Electric Vehicle (BEV)' in a sentence", () => {
        expect(allMatches("A Battery Electric Vehicle (BEV) has zero tailpipe emissions.")).toContain("Battery Electric Vehicle (BEV)");
    });

    it("matches Fine Particulate Matter (<=2.5 um) in a sentence", () => {
        expect(
            allMatches("Particles classified as Fine Particulate Matter (\u22642.5 \u00b5m) are most harmful.")
        ).toContain("Fine Particulate Matter (\u22642.5 \u00b5m)");
    });

    it("matches Coarse Particulate Matter (<=10 um) in a sentence", () => {
        expect(
            allMatches("Road dust contributes to Coarse Particulate Matter (\u226410 \u00b5m) readings.")
        ).toContain("Coarse Particulate Matter (\u226410 \u00b5m)");
    });
});

// ---------------------------------------------------------------------------
// 2. Normal alphanumeric terms must still match
// ---------------------------------------------------------------------------
describe("Normal alphanumeric terms -- existing behaviour preserved", () => {
    it("matches AQI surrounded by spaces", () => {
        expect(allMatches("Today's AQI is 42.")).toContain("AQI");
    });

    it("matches AQI at start of string", () => {
        expect(allMatches("AQI above 150 is Unhealthy.")).toContain("AQI");
    });

    it("matches AQI at end of string", () => {
        expect(allMatches("The reading was given as AQI")).toContain("AQI");
    });

    it("matches PM2.5 in a sentence", () => {
        expect(allMatches("PM2.5 levels peaked at noon.")).toContain("PM2.5");
    });

    it("matches NO2 in a sentence", () => {
        expect(allMatches("High NO2 near the highway.")).toContain("NO2");
    });

    it("matches Smog in a sentence", () => {
        expect(allMatches("Smog covered the city.")).toContain("Smog");
    });

    it("is case-insensitive for alphanumeric terms", () => {
        const hits = allMatches("today's aqi reading was low");
        expect(hits.map((h) => h.toLowerCase())).toContain("aqi");
    });

    it("is case-insensitive for multi-word terms", () => {
        const hits = allMatches("air quality index explained");
        expect(hits.map((h) => h.toLowerCase())).toContain("air quality index");
    });
});

// ---------------------------------------------------------------------------
// 3. Partial-word guard -- must NOT match inside a larger alphanumeric word
// ---------------------------------------------------------------------------
describe("Partial-word guard -- no spurious matches inside words", () => {
    it("does NOT match AQI inside 'subAQIreading'", () => {
        expect(allMatches("subAQIreading")).not.toContain("AQI");
    });

    it("does NOT match AQI when preceded by a letter ('prefixAQI')", () => {
        expect(allMatches("prefixAQI")).not.toContain("AQI");
    });

    it("does NOT match AQI when followed by a letter ('AQIsuffix')", () => {
        expect(allMatches("AQIsuffix")).not.toContain("AQI");
    });

    it("does NOT match PM2.5 when followed immediately by a letter ('PM2.5x')", () => {
        expect(allMatches("PM2.5x pollutant")).not.toContain("PM2.5");
    });

    it("does NOT match Smog inside 'Smoggy'", () => {
        expect(allMatches("Smoggy conditions")).not.toContain("Smog");
    });

    it("matches AQI when sandwiched between parentheses '(AQI)'", () => {
        expect(allMatches("(AQI) scale")).toContain("AQI");
    });

    it("matches PM2.5 when followed by a comma", () => {
        expect(allMatches("PM2.5, NO2 were both elevated.")).toContain("PM2.5");
    });

    it("matches PM2.5 when followed by a period", () => {
        expect(allMatches("Levels were high for PM2.5.")).toContain("PM2.5");
    });
});

// ---------------------------------------------------------------------------
// 4. Longest-match wins over shorter overlapping variant
// ---------------------------------------------------------------------------
describe("Longest-match precedence", () => {
    it("prefers 'Black Carbon (BC)' over bare 'Black Carbon' when the full form is present", () => {
        const hits = allMatches("Black Carbon (BC) is a short-lived pollutant.");
        expect(hits).toContain("Black Carbon (BC)");
        expect(hits.filter((h) => h === "Black Carbon")).toHaveLength(0);
    });

    it("prefers Fine Particulate Matter (<=2.5 um) over any shorter substrings", () => {
        const hits = allMatches("Fine Particulate Matter (\u22642.5 \u00b5m) is classified here.");
        expect(hits).toContain("Fine Particulate Matter (\u22642.5 \u00b5m)");
    });
});

// ---------------------------------------------------------------------------
// 5. Index shape -- lookup map keys are correctly lowercased
// ---------------------------------------------------------------------------
describe("getGlossaryTermIndex -- lookup map integrity", () => {
    it("contains a lowercased key for each term", () => {
        const { lookup } = getGlossaryTermIndex();
        expect(lookup.has("aqi")).toBe(true);
        expect(lookup.has("pm2.5")).toBe(true);
        expect(lookup.has("\u00b5g/m\u00b3")).toBe(true);
        expect(lookup.has("lead (pb)")).toBe(true);
    });

    it("contains a lowercased key for each fullForm", () => {
        const { lookup } = getGlossaryTermIndex();
        expect(lookup.has("air quality index")).toBe(true);
        expect(lookup.has("micrograms per cubic meter")).toBe(true);
        expect(lookup.has("black carbon (bc)")).toBe(true);
    });

    it("maps a term key to its entry object", () => {
        const { lookup } = getGlossaryTermIndex();
        const entry = lookup.get("aqi");
        expect(entry).toBeDefined();
        expect(entry.term).toBe("AQI");
    });
});