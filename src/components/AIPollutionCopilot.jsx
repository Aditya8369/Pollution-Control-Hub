import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
    askPollutionCopilot,
    PREDEFINED_QUESTIONS,
} from "../services/aiCopilotService";

/**
 * @typedef {Object} ChatMessage
 * @property {string} id
 * @property {'user'|'assistant'} role
 * @property {string} text
 * @property {'ai'|'fallback'} [source] - Only set on assistant messages.
 * @property {string[]} [warnings] - Only set on assistant messages.
 */

/**
 * Chat-style AI assistant that answers plain-language questions about
 * current pollution conditions ("Can I go for a morning run today?"),
 * grounded in the live AQI/pollutant/weather data already loaded elsewhere
 * in the app.
 *
 * @param {{
 *   current: { us_aqi?: number, pm2_5?: number, pm10?: number, nitrogen_dioxide?: number, ozone?: number } | null | undefined,
 *   cityName?: string,
 *   temperature?: number | null,
 *   humidity?: number | null,
 * }} props
 */
export default function AIPollutionCopilot({ current, cityName, temperature, humidity }) {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortRef = useRef(null);
    const listEndRef = useRef(null);

    useEffect(() => {
        if (typeof listEndRef.current?.scrollIntoView === "function") {
            listEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    }, [messages, isLoading]);

    useEffect(() => {
        return () => {
            abortRef.current?.abort();
        };
    }, []);

    const context = {
        aqi: current?.us_aqi ?? null,
        pm2_5: current?.pm2_5 ?? null,
        pm10: current?.pm10 ?? null,
        no2: current?.nitrogen_dioxide ?? null,
        o3: current?.ozone ?? null,
        temperature: temperature ?? null,
        humidity: humidity ?? null,
        location: cityName || "",
    };

    async function handleAsk(question) {
        const trimmed = question.trim();
        if (!trimmed || isLoading) return;

        setError(null);
        setDraft("");
        const userMessage = { id: `u-${Date.now()}`, role: "user", text: trimmed };
        setMessages((prev) => [...prev, userMessage]);
        setIsLoading(true);

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const result = await askPollutionCopilot(trimmed, context, controller.signal);
            setMessages((prev) => [
                ...prev,
                {
                    id: `a-${Date.now()}`,
                    role: "assistant",
                    text: result.answer,
                    source: result.source,
                    warnings: result.warnings,
                },
            ]);
        } catch (err) {
            if (err?.name === "AbortError") return;
            setError(t("aiCopilot.error", "Something went wrong answering that. Please try again."));
        } finally {
            setIsLoading(false);
        }
    }

    function handleSubmit(event) {
        event.preventDefault();
        handleAsk(draft);
    }

    return (
        <section data-testid="ai-pollution-copilot" className="panel ai-copilot">
            <div className="panel-head">
                <h2>{t("aiCopilot.title", "🧠 AI Pollution Copilot")}</h2>
                <p>{t("aiCopilot.subtitle", "Ask a question in plain language about today's air quality.")}</p>
            </div>

            <div className="ai-copilot-predefined" role="group" aria-label={t("aiCopilot.predefinedLabel", "Suggested questions")}>
                {PREDEFINED_QUESTIONS.map((question) => (
                    <button
                        key={question}
                        type="button"
                        className="ai-copilot-chip"
                        onClick={() => handleAsk(question)}
                        disabled={isLoading}
                    >
                        {question}
                    </button>
                ))}
            </div>

            <div className="ai-copilot-messages" role="log" aria-live="polite">
                {messages.length === 0 && !isLoading && (
                    <p className="ai-copilot-empty">
                        {t("aiCopilot.empty", "Tap a suggested question above, or type your own below.")}
                    </p>
                )}

                {messages.map((message) => (
                    <div
                        key={message.id}
                        data-testid={message.role === "user" ? "copilot-user-message" : "copilot-assistant-message"}
                        className={`ai-copilot-message ${message.role}`}
                    >
                        {message.role === "assistant" && message.warnings && message.warnings.length > 0 && (
                            <div className="ai-copilot-warning" role="alert">
                                ⚠️ {message.warnings.join(", ")}
                            </div>
                        )}
                        <p>{message.text}</p>
                        {message.role === "assistant" && message.source === "fallback" && (
                            <small className="ai-copilot-source-note">
                                {t("aiCopilot.fallbackNote", "Rule-based answer (AI service not configured)")}
                            </small>
                        )}
                    </div>
                ))}

                {isLoading && (
                    <div className="ai-copilot-message assistant ai-copilot-loading" data-testid="copilot-loading">
                        <span className="ai-copilot-typing-dot" aria-hidden="true" />
                        <span className="ai-copilot-typing-dot" aria-hidden="true" />
                        <span className="ai-copilot-typing-dot" aria-hidden="true" />
                        <span className="sr-only">{t("aiCopilot.thinking", "Thinking...")}</span>
                    </div>
                )}

                {error && (
                    <div className="ai-copilot-error" role="alert" data-testid="copilot-error">
                        {error}
                    </div>
                )}

                <div ref={listEndRef} />
            </div>

            <form className="ai-copilot-input-row" onSubmit={handleSubmit}>
                <input
                    type="text"
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder={t("aiCopilot.inputPlaceholder", "Ask about today's air quality...")}
                    aria-label={t("aiCopilot.inputAriaLabel", "Ask the AI Pollution Copilot")}
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading || !draft.trim()}>
                    {t("aiCopilot.send", "Send")}
                </button>
            </form>
        </section>
    );
}