import { describe, it, expect } from "vitest";
import { pct } from "./analyticsFormat";

describe("pct", () => {
  it("reports a normal rate", () => {
    expect(pct(38, 100)).toBe("38%");
    expect(pct(1, 3)).toBe("33%");
  });

  // The distinction the dashboard depends on: "nobody reached this step
  // yet" is not the same claim as "everybody who reached it dropped out".
  // Showing 0% for an absent denominator would invent a finding from no data.
  it("shows an em dash rather than 0% when there is no denominator", () => {
    expect(pct(0, 0)).toBe("—");
    expect(pct(5, 0)).toBe("—");
  });

  it("reports a genuine zero rate as 0%", () => {
    expect(pct(0, 40)).toBe("0%");
  });

  it("handles a full-conversion step", () => {
    expect(pct(12, 12)).toBe("100%");
  });
});
