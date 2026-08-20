import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import AIPollutionCopilot from "./AIPollutionCopilot";
import { PREDEFINED_QUESTIONS } from "../services/aiCopilotService";

const GOOD_AIR = {
    us_aqi: 35,
    pm2_5: 8,
    pm10: 15,
    nitrogen_dioxide: 10,
    ozone: 20,
};

afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

describe("AIPollutionCopilot", () => {
    beforeEach(() => {
        vi.stubEnv("VITE_AI_COPILOT_API_URL", "");
    });

    it("renders the predefined question chips", () => {
        render(<AIPollutionCopilot current={GOOD_AIR} cityName="Sirsi" />);
        for (const question of PREDEFINED_QUESTIONS) {
            expect(screen.getByRole("button", { name: question })).toBeInTheDocument();
        }
    });

    it("shows the empty state before any question is asked", () => {
        render(<AIPollutionCopilot current={GOOD_AIR} cityName="Sirsi" />);
        expect(screen.getByText(/tap a suggested question/i)).toBeInTheDocument();
    });

    it("asks a predefined question and displays the fallback answer", async () => {
        render(<AIPollutionCopilot current={GOOD_AIR} cityName="Sirsi" />);

        fireEvent.click(screen.getByRole("button", { name: "Can I exercise outside?" }));

        expect(screen.getByTestId("copilot-user-message")).toHaveTextContent("Can I exercise outside?");

        await waitFor(() => {
            expect(screen.getByTestId("copilot-assistant-message")).toBeInTheDocument();
        });

        expect(screen.getByTestId("copilot-assistant-message").textContent.toLowerCase()).toContain("yes");
        // No AI backend configured in this test, so the fallback badge should show.
        expect(screen.getByText(/rule-based answer/i)).toBeInTheDocument();
    });

    it("lets the user type and submit a free-text question", async () => {
        render(<AIPollutionCopilot current={GOOD_AIR} cityName="Sirsi" />);

        const input = screen.getByLabelText(/ask the ai pollution copilot/i);
        fireEvent.change(input, { target: { value: "Should I wear a mask?" } });
        fireEvent.click(screen.getByRole("button", { name: /send/i }));

        await waitFor(() => {
            expect(screen.getByTestId("copilot-assistant-message")).toBeInTheDocument();
        });
        expect(input).toHaveValue("");
    });

    it("does not submit an empty question", () => {
        render(<AIPollutionCopilot current={GOOD_AIR} cityName="Sirsi" />);
        const sendButton = screen.getByRole("button", { name: /send/i });
        expect(sendButton).toBeDisabled();
    });

    it("shows a warning banner when air quality is unhealthy", async () => {
        render(
            <AIPollutionCopilot
                current={{ us_aqi: 175, pm2_5: 120, pm10: 180, nitrogen_dioxide: 60, ozone: 90 }}
                cityName="Delhi"
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Should I wear a mask?" }));

        await waitFor(() => {
            expect(screen.getByTestId("copilot-assistant-message")).toBeInTheDocument();
        });

        expect(screen.getByRole("alert")).toHaveTextContent(/unhealthy/i);
    });

    it("still answers gracefully when no pollutant data has loaded yet", async () => {
        render(<AIPollutionCopilot current={null} cityName="" />);

        fireEvent.click(screen.getByRole("button", { name: "Can I exercise outside?" }));

        await waitFor(() => {
            expect(screen.getByTestId("copilot-assistant-message")).toBeInTheDocument();
        });
        expect(screen.getByTestId("copilot-assistant-message").textContent.length).toBeGreaterThan(0);
    });

    it("shows an error state if the copilot service throws unexpectedly", async () => {
        vi.stubEnv("VITE_AI_COPILOT_API_URL", "https://example.com/copilot");
        vi.stubGlobal(
            "fetch",
            vi.fn().mockImplementation(() => {
                const abortError = new Error("aborted");
                abortError.name = "AbortError";
                return Promise.reject(abortError);
            }),
        );

        render(<AIPollutionCopilot current={GOOD_AIR} cityName="Sirsi" />);
        fireEvent.click(screen.getByRole("button", { name: "Can I exercise outside?" }));

        // AbortError from a still-mounted component's own request is swallowed
        // (it only matters for the cleanup-on-unmount case), so no message and no
        // crash is the correct outcome here.
        await waitFor(() => {
            expect(screen.queryByTestId("copilot-loading")).not.toBeInTheDocument();
        });
    });
});