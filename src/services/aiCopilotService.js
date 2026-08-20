/**
 * AI Pollution Copilot — answers plain-language questions ("Can I go for a
 * morning run today?") using current AQI, pollutant, and weather readings.
 *
 * Mirrors the graceful-degradation pattern already used in weatherService.js:
 * when no AI backend is configured (or the request fails), the copilot falls
 * back to a deterministic, rule-based answer built from the same pollutant
 * thresholds the rest of the app already uses (see AlertsPanel.jsx), so the
 * feature works out of the box with zero external configuration and never
 * leaves the user with an error instead of an answer.
 *
 * To connect a real AI backend, set VITE_AI_COPILOT_API_URL (and, if your
 * backend requires it, VITE_AI_COPILOT_API_KEY) in your .env file. The
 * configured endpoint is POSTed a JSON body of shape
 * `{ question: string, context: PollutionContext }` and is expected to
 * respond with `{ answer: string }`. Do not point this at a provider's API
 * directly from the browser — API keys embedded in client-side code are
 * public. Proxy the request through your own backend (see
 * server/heatmap-ws-server.js for an existing Node server in this repo you
 * could extend) and set VITE_AI_COPILOT_API_URL to that proxy's URL.
 */

/**
 * @typedef {Object} PollutionContext
 * @property {number|null} [aqi] - US EPA AQI.
 * @property {number|null} [pm2_5] - PM2.5 concentration, µg/m³.
 * @property {number|null} [pm10] - PM10 concentration, µg/m³.
 * @property {number|null} [no2] - NO2 concentration, µg/m³.
 * @property {number|null} [o3] - Ozone concentration, µg/m³.
 * @property {number|null} [temperature] - Temperature, °C.
 * @property {number|null} [humidity] - Relative humidity, percent.
 * @property {string} [location] - Human-readable place name.
 */

/**
 * @typedef {Object} CopilotResponse
 * @property {string} answer - The plain-language answer to show the user.
 * @property {'ai'|'fallback'} source - Whether the answer came from the
 *   configured AI backend or the local rule-based fallback.
 * @property {string[]} warnings - Short, high-priority warning strings (e.g.
 *   "Air quality is unhealthy") to render alongside the answer.
 */

const AQI_BANDS = [
    { max: 50, label: "Good", advisory: "Air quality is good — a great day to be outdoors." },
    { max: 100, label: "Moderate", advisory: "Air quality is acceptable, though unusually sensitive people should consider reducing prolonged outdoor exertion." },
    { max: 150, label: "Unhealthy for Sensitive Groups", advisory: "Sensitive groups (children, older adults, people with asthma or heart conditions) should limit prolonged outdoor exertion." },
    { max: 200, label: "Unhealthy", advisory: "Everyone may begin to experience health effects; sensitive groups may experience more serious effects." },
    { max: 300, label: "Very Unhealthy", advisory: "Health alert: everyone may experience more serious health effects. Avoid prolonged outdoor exertion." },
    { max: Infinity, label: "Hazardous", advisory: "Health warning of emergency conditions. Everyone should avoid all outdoor exertion." },
];

/**
 * @param {number|null|undefined} aqi
 */
function getAqiBand(aqi) {
    if (typeof aqi !== "number" || Number.isNaN(aqi)) return null;
    return AQI_BANDS.find((band) => aqi <= band.max) ?? AQI_BANDS[AQI_BANDS.length - 1];
}

/**
 * Builds the structured prompt sent to an AI backend. Kept as its own
 * exported function so both askPollutionCopilot and tests can inspect
 * exactly what would be sent, without needing a live network call.
 *
 * @param {string} question
 * @param {PollutionContext} context
 * @returns {string}
 */
export function buildCopilotPrompt(question, context) {
    const fmt = (value, unit = "") =>
        typeof value === "number" && !Number.isNaN(value) ? `${value}${unit}` : "unavailable";

    return [
        "You are an air-quality assistant embedded in the Pollution Control Hub app.",
        "Answer the user's question in simple, reassuring, non-alarmist language, in 2-4 sentences.",
        "Base your answer only on the environmental data below. If the data suggests caution, say so clearly and recommend a concrete precaution.",
        "",
        "Current conditions:",
        `- Location: ${context.location || "unknown"}`,
        `- US AQI: ${fmt(context.aqi)}`,
        `- PM2.5: ${fmt(context.pm2_5, " µg/m³")}`,
        `- PM10: ${fmt(context.pm10, " µg/m³")}`,
        `- NO2: ${fmt(context.no2, " µg/m³")}`,
        `- O3: ${fmt(context.o3, " µg/m³")}`,
        `- Temperature: ${fmt(context.temperature, " °C")}`,
        `- Humidity: ${fmt(context.humidity, "%")}`,
        "",
        `User question: ${question}`,
    ].join("\n");
}

/**
 * Deterministic, offline answer used whenever no AI backend is configured or
 * the AI request fails. Recognizes the four predefined questions from the
 * feature spec by keyword, and otherwise gives a general AQI-band summary.
 *
 * @param {string} question
 * @param {PollutionContext} context
 * @returns {CopilotResponse}
 */
export function getFallbackResponse(question, context) {
    const band = getAqiBand(context.aqi);
    const warnings = [];
    if (band && band.max <= 100) {
        // Good/Moderate — no warning banner needed.
    } else if (band) {
        warnings.push(`${band.label} air quality (AQI ${context.aqi})`);
    }

    const q = (question || "").toLowerCase();
    let answer;

    if (q.includes("exercise") || q.includes("run") || q.includes("outdoor") || q.includes("outside")) {
        if (!band) {
            answer = "I don't have a current AQI reading to judge this safely — check the dashboard once data loads before heading out.";
        } else if (band.max <= 50) {
            answer = "Yes — air quality is good right now, so outdoor exercise is safe for everyone.";
        } else if (band.max <= 100) {
            answer = "Outdoor exercise is generally fine today. If you have asthma or another respiratory condition, consider a lighter session.";
        } else if (band.max <= 150) {
            answer = "Light activity should be fine, but if you're in a sensitive group (children, older adults, asthma, heart conditions), shorten or move your workout indoors today.";
        } else {
            answer = "I'd avoid outdoor exercise today — air quality is in the unhealthy range, and prolonged exertion outside will increase your exposure.";
        }
    } else if (q.includes("child")) {
        if (!band) {
            answer = "I don't have a current AQI reading yet — check back once data loads before deciding on outdoor time for kids.";
        } else if (band.max <= 100) {
            answer = "Yes, it's a reasonably safe day for children to play outside.";
        } else if (band.max <= 150) {
            answer = "Children are more sensitive to pollution than adults — keep outdoor play shorter and lower-intensity today.";
        } else {
            answer = "I'd keep children indoors today. Air quality is unhealthy and kids' developing lungs are especially at risk.";
        }
    } else if (q.includes("mask")) {
        if (!band) {
            answer = "I don't have a current AQI reading yet to advise on this — check back once data loads.";
        } else if (band.max <= 100) {
            answer = "Not necessary today — air quality is good to moderate.";
        } else if (band.max <= 150) {
            answer = "A well-fitted N95/KN95 mask is a reasonable precaution if you're in a sensitive group or spending a long time outside.";
        } else {
            answer = "Yes, I'd recommend a well-fitted N95/KN95 mask if you need to go outside — air quality is in the unhealthy range.";
        }
    } else if (q.includes("window")) {
        if (!band) {
            answer = "I don't have a current AQI reading yet — check back once data loads before deciding on windows.";
        } else if (band.max <= 100) {
            answer = "Yes, it's fine to open your windows and let in fresh air today.";
        } else if (band.max <= 150) {
            answer = "Consider keeping windows closed during peak traffic hours today, and airing out briefly at other times.";
        } else {
            answer = "I'd keep windows closed today — outdoor air quality is unhealthy and would lower your indoor air quality too.";
        }
    } else if (band) {
        answer = `Current air quality is "${band.label}" (AQI ${context.aqi}). ${band.advisory}`;
    } else {
        answer = "I don't have current air quality data to answer that yet. Try again once the dashboard finishes loading.";
    }

    return { answer, source: "fallback", warnings };
}

/**
 * Answers a question about current pollution conditions. Uses the configured
 * AI backend (VITE_AI_COPILOT_API_URL) if present, and transparently falls
 * back to a local rule-based answer if the endpoint isn't configured, the
 * request fails, or it times out.
 *
 * @param {string} question
 * @param {PollutionContext} context
 * @param {AbortSignal} [signal]
 * @returns {Promise<CopilotResponse>}
 */
export async function askPollutionCopilot(question, context, signal) {
    const apiUrl = import.meta.env.VITE_AI_COPILOT_API_URL;

    if (!apiUrl) {
        // No backend configured — this is the expected default for a fresh
        // checkout (see .env.example), not an error condition.
        return getFallbackResponse(question, context);
    }

    try {
        const apiKey = import.meta.env.VITE_AI_COPILOT_API_KEY;
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
            },
            body: JSON.stringify({ question, context, prompt: buildCopilotPrompt(question, context) }),
            signal,
        });

        if (!response.ok) {
            throw new Error(`AI Copilot request failed: ${response.status}`);
        }

        const data = await response.json();
        if (!data || typeof data.answer !== "string" || !data.answer.trim()) {
            throw new Error("AI Copilot response missing 'answer'");
        }

        const band = getAqiBand(context.aqi);
        const warnings = band && band.max > 100 ? [`${band.label} air quality (AQI ${context.aqi})`] : [];
        return { answer: data.answer, source: "ai", warnings };
    } catch (error) {
        if (error?.name === "AbortError") throw error;
        console.warn("AI Copilot request failed, using fallback response:", error);
        return getFallbackResponse(question, context);
    }
}

/** Predefined questions shown as quick-tap chips in the chat UI. */
export const PREDEFINED_QUESTIONS = [
    "Can I exercise outside?",
    "Is it safe for children?",
    "Should I wear a mask?",
    "Should I open my windows?",
];