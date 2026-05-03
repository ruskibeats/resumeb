import { describe, expect, it } from "vite-plus/test";

import { coerceScore, stripHiddenItems } from "./analysis";

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

// ---------------------------------------------------------------------------
// stripHiddenItems
// ---------------------------------------------------------------------------

describe("stripHiddenItems", () => {
  const makeResume = (overrides?: Record<string, unknown>) => ({
    summary: { content: "Test summary", hidden: false },
    picture: { url: "https://example.com/photo.jpg", hidden: false },
    sections: {
      experience: {
        hidden: false,
        items: [
          { id: "1", hidden: false, company: "Acme" },
          { id: "2", hidden: true, company: "Hidden Co" },
          { id: "3", hidden: false, company: "Visible Co" },
        ],
      },
      education: {
        hidden: true,
        items: [{ id: "4", hidden: false, school: "MIT" }],
      },
      skills: {
        hidden: false,
        items: [
          { id: "5", hidden: true, name: "Hidden Skill" },
          { id: "6", hidden: false, name: "Visible Skill" },
        ],
      },
    },
    ...overrides,
  });

  it("removes hidden items from visible sections", () => {
    const result = stripHiddenItems(makeResume());
    const exp = result.sections.experience;
    expect(exp.items).toHaveLength(2);
    expect(exp.items!.map((i) => (i as Record<string, string>).company)).toEqual(["Acme", "Visible Co"]);
  });

  it("removes entire hidden sections", () => {
    const result = stripHiddenItems(makeResume());
    expect(result.sections.education).toBeUndefined();
  });

  it("keeps visible sections and items intact", () => {
    const result = stripHiddenItems(makeResume());
    expect(result.sections.experience).toBeDefined();
    expect(result.sections.skills).toBeDefined();
    const skillItems = result.sections.skills.items;
    expect(skillItems).toHaveLength(1);
    expect(skillItems![0] as unknown as { name: string }).toMatchObject({ name: "Visible Skill" });
  });

  it("strips hidden top-level summary content", () => {
    const result = stripHiddenItems(makeResume({ summary: { content: "Hidden", hidden: true } }));
    expect(result.summary?.content).toBe("");
  });

  it("keeps visible summary content", () => {
    const result = stripHiddenItems(makeResume());
    expect(result.summary?.content).toBe("Test summary");
  });

  it("does not mutate the original data", () => {
    const original = makeResume();
    const copy = JSON.parse(JSON.stringify(original));
    stripHiddenItems(original);
    expect(original).toEqual(copy);
  });

  it("strips hidden custom sections", () => {
    const data = makeResume({
      customSections: [
        { id: "c1", hidden: false, items: [{ id: "i1", hidden: false, name: "Visible" }] },
        { id: "c2", hidden: true, items: [{ id: "i2", hidden: false, name: "Hidden" }] },
      ],
    });
    const result = stripHiddenItems(data);
    expect(result.customSections).toHaveLength(1);
    expect(result.customSections![0].id).toBe("c1");
  });

  it("strips hidden items within custom sections", () => {
    const data = makeResume({
      customSections: [
        {
          id: "c1",
          hidden: false,
          items: [
            { id: "i1", hidden: false, name: "Keep" },
            { id: "i2", hidden: true, name: "Remove" },
          ],
        },
      ],
    });
    const result = stripHiddenItems(data);
    expect(result.customSections![0].items).toHaveLength(1);
    expect(result.customSections![0].items![0].id).toBe("i1");
  });
});
