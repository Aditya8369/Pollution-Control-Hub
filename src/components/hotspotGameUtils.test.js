import { describe, it, expect } from "vitest";
import { shuffleArray } from "./hotspotGameUtils";

describe("shuffleArray", () => {
  it("returns a permutation with the same elements and length", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffleArray(input);
    expect(out).toHaveLength(input.length);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
  });

  it("does not mutate the input array", () => {
    const input = ["a", "b", "c"];
    const copy = [...input];
    shuffleArray(input);
    expect(input).toEqual(copy);
  });

  it("is approximately uniform (no position is strongly favoured)", () => {
    // Fisher–Yates should place each element in each position with ~equal
    // frequency. A biased shuffle (sort comparator) fails this handily.
    const n = 5;
    const runs = 12000;
    const counts = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < runs; r++) {
      const out = shuffleArray([0, 1, 2, 3, 4]);
      out.forEach((val, pos) => {
        counts[val][pos]++;
      });
    }
    const expected = runs / n; // 2400
    for (let v = 0; v < n; v++) {
      for (let p = 0; p < n; p++) {
        // Allow a generous ±25% band so the test isn't flaky.
        expect(counts[v][p]).toBeGreaterThan(expected * 0.75);
        expect(counts[v][p]).toBeLessThan(expected * 1.25);
      }
    }
  });
});
