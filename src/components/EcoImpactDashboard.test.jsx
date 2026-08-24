import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import EcoImpactDashboard from "./EcoImpactDashboard";

// jsdom doesn't implement ResizeObserver, which recharts' <ResponsiveContainer>
// requires to measure its container. This stub is scoped to this file only —
// it's not something every test in the suite needs, just chart-rendering ones.
beforeEach(() => {
    global.ResizeObserver = class ResizeObserver {
        observe() { }
        unobserve() { }
        disconnect() { }
    };
});

beforeEach(() => {
    localStorage.clear();
});

afterEach(() => {
    cleanup();
});

describe("EcoImpactDashboard", () => {
    it("shows the empty state when no trips have been logged this month", () => {
        render(<EcoImpactDashboard />);
        expect(screen.getByText(/log your first eco-friendly trip/i)).toBeInTheDocument();
        expect(screen.getByTestId("stat-cycling")).toHaveTextContent("0");
        expect(screen.getByTestId("stat-transit")).toHaveTextContent("0");
        expect(screen.getByTestId("stat-car-avoided")).toHaveTextContent("0");
    });

    it("logs a cycling trip and updates the stats", () => {
        render(<EcoImpactDashboard />);

        fireEvent.change(screen.getByLabelText(/distance in kilometers/i), { target: { value: "8" } });
        fireEvent.click(screen.getByRole("button", { name: /log trip/i }));

        expect(screen.getByTestId("stat-cycling")).toHaveTextContent("1");
        expect(screen.getByTestId("eco-trip-logged-note")).toBeInTheDocument();
    });

    it("logs a public transport trip under the transit stat, not cycling", () => {
        render(<EcoImpactDashboard />);

        fireEvent.change(screen.getByLabelText(/log a trip/i), { target: { value: "publicTransport" } });
        fireEvent.change(screen.getByLabelText(/distance in kilometers/i), { target: { value: "10" } });
        fireEvent.click(screen.getByRole("button", { name: /log trip/i }));

        expect(screen.getByTestId("stat-transit")).toHaveTextContent("1");
        expect(screen.getByTestId("stat-cycling")).toHaveTextContent("0");
    });

    it("shows non-zero CO2 and distance-avoided estimates after logging a trip", () => {
        render(<EcoImpactDashboard />);

        fireEvent.change(screen.getByLabelText(/distance in kilometers/i), { target: { value: "20" } });
        fireEvent.click(screen.getByRole("button", { name: /log trip/i }));

        expect(screen.getByTestId("stat-co2-avoided").textContent).toMatch(/[1-9]/);
        expect(screen.getByTestId("stat-distance-avoided")).toHaveTextContent("20");
    });

    it("accumulates counts across multiple logged trips", () => {
        render(<EcoImpactDashboard />);

        fireEvent.click(screen.getByRole("button", { name: /log trip/i }));
        fireEvent.click(screen.getByRole("button", { name: /log trip/i }));
        fireEvent.click(screen.getByRole("button", { name: /log trip/i }));

        expect(screen.getByTestId("stat-cycling")).toHaveTextContent("3");
    });
});