import { describe, it, expect } from "vitest";
import { pm25ToCigarettes, aqiToCigarettes } from "./cigaretteEquivalent";

describe("pm25ToCigarettes", () => {
  it("maps the reference concentration to one cigarette", () => {
    expect(pm25ToCigarettes(22)).toBe(1);
  });

  it("scales linearly", () => {
    expect(pm25ToCigarettes(11)).toBe(0.5);
    expect(pm25ToCigarettes(220)).toBe(10);
  });

  it("rounds to one decimal", () => {
    expect(pm25ToCigarettes(35.4)).toBe(1.6);
  });

  it("returns 0 for non-positive, non-finite, or non-number input", () => {
    expect(pm25ToCigarettes(0)).toBe(0);
    expect(pm25ToCigarettes(-5)).toBe(0);
    expect(pm25ToCigarettes(NaN)).toBe(0);
    expect(pm25ToCigarettes("12")).toBe(0);
    expect(pm25ToCigarettes(undefined)).toBe(0);
  });
});

describe("aqiToCigarettes", () => {
  it("converts AQI via PM2.5", () => {
    expect(aqiToCigarettes(50)).toBe(0.5); // 12 µg/m³
    expect(aqiToCigarettes(100)).toBe(1.6); // 35.4 µg/m³
  });

  it("returns 0 at AQI 0", () => {
    expect(aqiToCigarettes(0)).toBe(0);
  });
});
