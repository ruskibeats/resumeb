import { describe, expect, it } from "vite-plus/test";

import { coerceScore } from "./analysis";

describe("coerceScore", () => {
  // --- Numbers ---
  it("passes through a valid integer", () => {
    expect(coerceScore(85)).toBe(85);
  });

  it("rounds a float", () => {
    expect(coerceScore(84.7)).toBe(85);
  });

  it("clamps to 0-100 range — below 0", () => {
    expect(coerceScore(-10)).toBe(0);
  });

  it("clamps to 0-100 range — above 100", () => {
    expect(coerceScore(150)).toBe(100);
  });

  it("clamps a float below 0", () => {
    expect(coerceScore(-5.5)).toBe(0);
  });

  it("clamps a float above 100", () => {
    expect(coerceScore(105.3)).toBe(100);
  });

  // --- Strings ---
  it("coerces a numeric string", () => {
    expect(coerceScore("85")).toBe(85);
  });

  it("coerces a numeric string with decimal", () => {
    expect(coerceScore("78.3")).toBe(78);
  });

  it("coerces a string above 100", () => {
    expect(coerceScore("120")).toBe(100);
  });

  it("coerces a string below 0", () => {
    expect(coerceScore("-5")).toBe(0);
  });

  it("handles empty string", () => {
    expect(coerceScore("")).toBe(0);
  });

  it("handles 'null' string", () => {
    expect(coerceScore("null")).toBe(0);
  });

  it("handles 'undefined' string", () => {
    expect(coerceScore("undefined")).toBe(0);
  });

  it("handles non-numeric string", () => {
    expect(coerceScore("abc")).toBe(0);
  });

  it("handles whitespace padding", () => {
    expect(coerceScore("  90  ")).toBe(90);
  });

  // --- Edge cases ---
  it("returns 0 for null", () => {
    expect(coerceScore(null)).toBe(0);
  });

  it("returns 0 for undefined", () => {
    expect(coerceScore(undefined)).toBe(0);
  });

  it("returns 0 for boolean", () => {
    expect(coerceScore(true)).toBe(0);
  });

  it("returns 0 for object", () => {
    expect(coerceScore({})).toBe(0);
  });

  it("returns 0 for array", () => {
    expect(coerceScore([])).toBe(0);
  });

  // --- Boundary cases ---
  it("handles exact 0", () => {
    expect(coerceScore(0)).toBe(0);
  });

  it("handles exact 100", () => {
    expect(coerceScore(100)).toBe(100);
  });

  it("handles string '0'", () => {
    expect(coerceScore("0")).toBe(0);
  });

  it("handles string '100'", () => {
    expect(coerceScore("100")).toBe(100);
  });
});
