import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
    buildCopilotPrompt,
    getFallbackResponse,
    askPollutionCopilot,
    PREDEFINED_QUESTIONS,
} from "./aiCopilotService";

const GOOD_CONTEXT = {
    aqi: 35,
    pm2_5: 8,
    pm10: 15,
    no2: 10,
    o3: 20,
    temperature: 24,
    humidity: 55,
    location: "Sirsi",
};

const UNHEALTHY_CONTEXT = {
    aqi: 175,
    pm2_5: 120,
    pm10: 180,
    no2: 60,
    o3: 90,
    temperature: 30,
    humidity: 40,
    location: "Delhi",
};

describe("aiCopilotService - buildCopilotPrompt", () => {
    it("includes the question and every pollutant field", () => {
        const prompt = buildCopilotPrompt("Can I exercise outside?", GOOD_CONTEXT);
        expect(prompt).toContain("Can I exercise outside?");
        expect(prompt).toContain("US AQI: 35");
        expect(prompt).toContain("PM2.5: 8 µg/m³");
        expect(prompt).toContain("PM10: 15 µg/m³");
        expect(prompt).toContain("NO2: 10 µg/m³");
        expect(prompt).toContain("O3: 20 µg/m³");
        expect(prompt).toContain("Temperature: 24 °C");
        expect(prompt).toContain("Humidity: 55%");
        expect(prompt).toContain("Sirsi");
    });

    it("marks missing fields as unavailable rather than throwing", () => {
        const prompt = buildCopilotPrompt("test", {});
        expect(prompt).toContain("US AQI: unavailable");
        expect(prompt).toContain("Location: unknown");
    });
});

describe("aiCopilotService - getFallbackResponse (predefined questions)", () => {
    it.each(PREDEFINED_QUESTIONS)("returns a non-empty fallback answer for %s in good air", (question) => {
        const result = getFallbackResponse(question, GOOD_CONTEXT);
        expect(result.source).toBe("fallback");
        expect(result.answer.length).toBeGreaterThan(0);
        expect(result.warnings).toEqual([]);
    });

    it.each(PREDEFINED_QUESTIONS)("returns a warning for %s in unhealthy air", (question) => {
        const result = getFallbackResponse(question, UNHEALTHY_CONTEXT);
        expect(result.source).toBe("fallback");
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toMatch(/Unhealthy/i);
    });

    it("recommends outdoor exercise is fine when AQI is good", () => {
        const result = getFallbackResponse("Can I exercise outside?", GOOD_CONTEXT);
        expect(result.answer.toLowerCase()).toContain("yes");
    });

    it("advises against outdoor exercise when AQI is unhealthy", () => {
        const result = getFallbackResponse("Can I exercise outside?", UNHEALTHY_CONTEXT);
        expect(result.answer.toLowerCase()).toContain("avoid");
    });

    it("recommends a mask in unhealthy air", () => {
        const result = getFallbackResponse("Should I wear a mask?", UNHEALTHY_CONTEXT);
        expect(result.answer.toLowerCase()).toContain("mask");
    });

    it("advises closing windows in unhealthy air", () => {
        const result = getFallbackResponse("Should I open my windows?", UNHEALTHY_CONTEXT);
        expect(result.answer.toLowerCase()).toContain("closed");
    });

    it("advises caution for children in unhealthy air", () => {
        const result = getFallbackResponse("Is it safe for children?", UNHEALTHY_CONTEXT);
        expect(result.answer.toLowerCase()).toMatch(/indoor|risk/);
    });

    it("falls back to a general AQI-band summary for an unrecognized question", () => {
        const result = getFallbackResponse("What's the weather like on Mars?", GOOD_CONTEXT);
        expect(result.answer).toContain("Good");
    });

    it("handles a missing AQI reading gracefully instead of throwing", () => {
        const result = getFallbackResponse("Can I exercise outside?", { location: "Nowhere" });
        expect(result.source).toBe("fallback");
        expect(result.answer.length).toBeGreaterThan(0);
        expect(result.warnings).toEqual([]);
    });
});

describe("aiCopilotService - askPollutionCopilot", () => {
    beforeEach(() => {
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("uses the local fallback when no AI backend URL is configured", async () => {
        vi.stubEnv("VITE_AI_COPILOT_API_URL", "");
        const fetchSpy = vi.fn();
        vi.stubGlobal("fetch", fetchSpy);

        const result = await askPollutionCopilot("Can I exercise outside?", GOOD_CONTEXT);

        expect(result.source).toBe("fallback");
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it("calls the configured AI backend and returns its answer when configured", async () => {
        vi.stubEnv("VITE_AI_COPILOT_API_URL", "https://example.com/copilot");
        const fetchSpy = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ answer: "It's a great day for a run." }),
        });
        vi.stubGlobal("fetch", fetchSpy);

        const result = await askPollutionCopilot("Can I exercise outside?", GOOD_CONTEXT);

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        expect(fetchSpy.mock.calls[0][0]).toBe("https://example.com/copilot");
        expect(result.source).toBe("ai");
        expect(result.answer).toBe("It's a great day for a run.");
    });

    it("falls back to the rule-based answer when the AI backend request fails", async () => {
        vi.stubEnv("VITE_AI_COPILOT_API_URL", "https://example.com/copilot");
        const fetchSpy = vi.fn().mockResolvedValue({ ok: false, status: 500 });
        vi.stubGlobal("fetch", fetchSpy);

        const result = await askPollutionCopilot("Can I exercise outside?", GOOD_CONTEXT);

        expect(result.source).toBe("fallback");
        expect(result.answer.length).toBeGreaterThan(0);
    });

    it("falls back to the rule-based answer when the AI backend throws (e.g. network error)", async () => {
        vi.stubEnv("VITE_AI_COPILOT_API_URL", "https://example.com/copilot");
        const fetchSpy = vi.fn().mockRejectedValue(new Error("network down"));
        vi.stubGlobal("fetch", fetchSpy);

        const result = await askPollutionCopilot("Should I wear a mask?", UNHEALTHY_CONTEXT);

        expect(result.source).toBe("fallback");
        expect(result.answer.toLowerCase()).toContain("mask");
    });

    it("falls back when the AI backend response is missing an answer field", async () => {
        vi.stubEnv("VITE_AI_COPILOT_API_URL", "https://example.com/copilot");
        const fetchSpy = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
        vi.stubGlobal("fetch", fetchSpy);

        const result = await askPollutionCopilot("Can I exercise outside?", GOOD_CONTEXT);

        expect(result.source).toBe("fallback");
    });

    it("re-throws AbortError instead of swallowing it into a fallback", async () => {
        vi.stubEnv("VITE_AI_COPILOT_API_URL", "https://example.com/copilot");
        const abortError = new Error("aborted");
        abortError.name = "AbortError";
        const fetchSpy = vi.fn().mockRejectedValue(abortError);
        vi.stubGlobal("fetch", fetchSpy);

        await expect(askPollutionCopilot("test", GOOD_CONTEXT)).rejects.toThrow("aborted");
    });
});