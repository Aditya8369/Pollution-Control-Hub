import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AlertRulesEngine from "./AlertRulesEngine";
import {
  readRules,
  writeRules,
  createRule,
  updateRule,
  deleteRule,
  toggleRule,
  evaluateRules,
  POLLUTANT_OPTIONS,
  OPERATORS,
  TIME_WINDOWS,
  THROTTLE_OPTIONS,
  PRESET_RULES,
} from "../services/alertRulesService";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, opts) => (typeof opts === "string" ? opts : opts?.defaultValue || key),
  }),
}));

// ---------------------------------------------------------------------------
// Service tests
// ---------------------------------------------------------------------------
describe("alertRulesService", () => {
  beforeEach(() => {
    // Clear localStorage
    try { localStorage.clear(); } catch { /* ignore */ }
  });

  describe("CRUD operations", () => {
    it("creates a rule with generated ID", () => {
      const rule = createRule({ name: "Test Rule", threshold: 120 });
      expect(rule.id).toMatch(/^rule_/);
      expect(rule.name).toBe("Test Rule");
      expect(rule.threshold).toBe(120);
      expect(rule.enabled).toBe(true);
    });

    it("persists and reads rules", () => {
      createRule({ name: "Rule 1" });
      createRule({ name: "Rule 2" });
      const rules = readRules();
      expect(rules.length).toBe(2);
      expect(rules[0].name).toBe("Rule 1");
      expect(rules[1].name).toBe("Rule 2");
    });

    it("updates a rule by ID", () => {
      const rule = createRule({ name: "Original" });
      const updated = updateRule(rule.id, { name: "Updated", threshold: 200 });
      expect(updated.name).toBe("Updated");
      expect(updated.threshold).toBe(200);
      expect(readRules().find((r) => r.id === rule.id).name).toBe("Updated");
    });

    it("returns null when updating non-existent rule", () => {
      expect(updateRule("nonexistent", { name: "X" })).toBeNull();
    });

    it("deletes a rule by ID", () => {
      const rule = createRule({ name: "Delete Me" });
      expect(deleteRule(rule.id)).toBe(true);
      expect(readRules().find((r) => r.id === rule.id)).toBeUndefined();
    });

    it("returns false when deleting non-existent rule", () => {
      expect(deleteRule("nonexistent")).toBe(false);
    });

    it("toggles rule enabled state", () => {
      const rule = createRule({ name: "Toggle Me", enabled: true });
      const toggled = toggleRule(rule.id);
      expect(toggled.enabled).toBe(false);
      const toggledAgain = toggleRule(rule.id);
      expect(toggledAgain.enabled).toBe(true);
    });
  });

  describe("evaluateRules", () => {
    it("triggers rule when threshold is met", () => {
      createRule({ name: "High AQI", pollutant: "us_aqi", operator: "above", threshold: 100, timeWindow: "any", throttleHours: 0, enabled: true });
      const current = { us_aqi: 150, pm2_5: 40, pm10: 60, nitrogen_dioxide: 25, ozone: 35, carbon_monoxide: 0.8 };
      const { triggered } = evaluateRules(current);
      expect(triggered.length).toBe(1);
      expect(triggered[0].name).toBe("High AQI");
    });

    it("does not trigger when threshold not met", () => {
      createRule({ name: "High AQI", pollutant: "us_aqi", operator: "above", threshold: 200, timeWindow: "any", throttleHours: 0, enabled: true });
      const current = { us_aqi: 150 };
      const { triggered } = evaluateRules(current);
      expect(triggered.length).toBe(0);
    });

    it("does not trigger disabled rules", () => {
      createRule({ name: "Disabled", pollutant: "us_aqi", operator: "above", threshold: 50, timeWindow: "any", throttleHours: 0, enabled: false });
      const current = { us_aqi: 150 };
      const { triggered } = evaluateRules(current);
      expect(triggered.length).toBe(0);
    });

    it("handles below operator", () => {
      createRule({ name: "Low AQI", pollutant: "us_aqi", operator: "below", threshold: 50, timeWindow: "any", throttleHours: 0, enabled: true });
      const current = { us_aqi: 30 };
      const { triggered } = evaluateRules(current);
      expect(triggered.length).toBe(1);
    });

    it("returns empty for null current", () => {
      const { triggered } = evaluateRules(null);
      expect(triggered).toEqual([]);
    });
  });

  describe("constants", () => {
    it("exports all expected arrays", () => {
      expect(POLLUTANT_OPTIONS.length).toBeGreaterThan(0);
      expect(OPERATORS.length).toBe(3);
      expect(TIME_WINDOWS.length).toBeGreaterThan(0);
      expect(THROTTLE_OPTIONS.length).toBeGreaterThan(0);
      expect(PRESET_RULES.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// Component tests
// ---------------------------------------------------------------------------
describe("AlertRulesEngine", () => {
  it("renders the panel with title", () => {
    render(<AlertRulesEngine current={{ us_aqi: 80 }} />);
    expect(screen.getByTestId("alert-rules-engine")).toBeTruthy();
    expect(screen.getByText(/Alert Rules Engine/)).toBeTruthy();
  });

  it("displays stats row", () => {
    render(<AlertRulesEngine current={{ us_aqi: 80 }} />);
    expect(screen.getByTestId("stats-row")).toBeTruthy();
  });

  it("displays rules list section", () => {
    render(<AlertRulesEngine current={{ us_aqi: 80 }} />);
    expect(screen.getByTestId("rules-list")).toBeTruthy();
  });

  it("displays presets section", () => {
    render(<AlertRulesEngine current={{ us_aqi: 80 }} />);
    expect(screen.getByTestId("presets-section")).toBeTruthy();
  });

  it("shows empty state when no rules", () => {
    render(<AlertRulesEngine current={{ us_aqi: 80 }} />);
    expect(screen.getByText(/No rules yet/)).toBeTruthy();
  });

  it("shows form when New Rule is clicked", () => {
    render(<AlertRulesEngine current={{ us_aqi: 80 }} />);
    fireEvent.click(screen.getByText(/New Rule/));
    expect(screen.getByTestId("rule-form")).toBeTruthy();
  });
});
