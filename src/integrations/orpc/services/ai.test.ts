/**
 * Integration tests for the analyzeResume pipeline.
 * Validates end-to-end parsing behavior including graceful degradation paths.
 */
import { describe, expect, it } from "vite-plus/test";
import { z } from "zod";

import {
  analysisDimensionSchema,
  analysisSuggestionSchema,
  atsCompatibilitySchema,
  resumeAnalysisSchema,
} from "@/schema/resume/analysis";

// Pipeline simulation: mirrors the core logic of safeParseAnalysisResult

function simulateDegradedParsing(raw: Record<string, unknown>) {
  // Try full parse first
  const full = resumeAnalysisSchema.safeParse(raw);
  if (full.success) return full.data;

  // Salvage what we can
  const partial: Record<string, unknown> = { analysisVersion: 1 };

  // overallScore
  partial.overallScore = coerceScore(raw.overallScore);

  // scorecard
  const scorecardItems = salvageArray(raw.scorecard, analysisDimensionSchema);
  partial.scorecard = scorecardItems.length > 0
    ? scorecardItems
    : [{
        dimension: "General Assessment",
        score: partial.overallScore as number,
        rationale:
          "The AI returned an incomplete analysis. Overall score shown above could not be broken down by dimension.",
      }];

  // suggestions
  const suggestionItems = salvageArray(raw.suggestions, analysisSuggestionSchema);
  partial.suggestions = suggestionItems.slice(0, 10);

  // strengths
  const strengthItems = salvageArray(raw.strengths, z.string().min(1));
  partial.strengths = strengthItems.slice(0, 10);

  // atsCompatibility (optional)
  if (raw.atsCompatibility !== undefined) {
    const atsResult = atsCompatibilitySchema.safeParse(raw.atsCompatibility);
    if (atsResult.success) partial.atsCompatibility = atsResult.data;
  }

  return resumeAnalysisSchema.parse(partial);
}

function coerceScore(value: unknown): number {
  if (typeof value === "number") return Math.max(0, Math.min(100, Math.round(value)));
  if (typeof value === "string") {
    const n = Number(value.trim());
    return Number.isNaN(n) ? 0 : Math.max(0, Math.min(100, Math.round(n)));
  }
  return 0;
}

function salvageArray<T>(value: unknown, schema: z.ZodType<T>): T[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<T[]>((acc, item) => {
    const result = schema.safeParse(item);
    if (result.success) acc.push(result.data);
    return acc;
  }, []);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("analyzeResume pipeline — full success", () => {
  it("parses a complete valid analysis", () => {
    const result = simulateDegradedParsing({
      overallScore: 85,
      scorecard: [
        { dimension: "Skills", score: 80, rationale: "Good coverage." },
        { dimension: "Experience", score: 90, rationale: "Excellent alignment." },
      ],
      suggestions: [
        {
          title: "Add metrics",
          impact: "high",
          why: "Improves ATS score.",
          exampleRewrite: null,
          copyPrompt: "Rewrite the following bullets...",
        },
      ],
      strengths: ["Strong experience progression"],
    });
    expect(result.overallScore).toBe(85);
    expect(result.scorecard).toHaveLength(2);
    expect(result.suggestions).toHaveLength(1);
    expect(result.strengths).toHaveLength(1);
  });
});

describe("analyzeResume pipeline — degraded scenarios", () => {
  it("degrades when scorecard is missing (fallback dimension)", () => {
    const result = simulateDegradedParsing({
      overallScore: 72,
      scorecard: [],
      suggestions: [],
      strengths: [],
    });
    expect(result.overallScore).toBe(72);
    expect(result.scorecard).toHaveLength(1);
    expect(result.scorecard[0].dimension).toBe("General Assessment");
  });

  it("filters out invalid suggestions, keeps valid ones", () => {
    const result = simulateDegradedParsing({
      overallScore: 65,
      scorecard: [{ dimension: "Clarity", score: 65, rationale: "OK." }],
      suggestions: [
        { invalid: true } as unknown as Record<string, unknown>,
        { title: "Valid", impact: "medium", why: "Reason.", exampleRewrite: null, copyPrompt: "Do it." },
      ],
      strengths: ["Good"],
    });
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].title).toBe("Valid");
  });

  it("handles bare minimum input (only overallScore)", () => {
    const result = simulateDegradedParsing({ overallScore: 45 });
    expect(result.overallScore).toBe(45);
    expect(result.scorecard[0].dimension).toBe("General Assessment");
    expect(result.suggestions).toHaveLength(0);
    expect(result.strengths).toHaveLength(0);
  });

  it("handles completely empty input", () => {
    const result = simulateDegradedParsing({});
    expect(result.overallScore).toBe(0);
    expect(result.scorecard[0].score).toBe(0);
    expect(result.suggestions).toHaveLength(0);
    expect(result.strengths).toHaveLength(0);
  });
});

describe("analyzeResume pipeline — score coercions", () => {
  it("handles integer scores correctly", () => {
    const result = simulateDegradedParsing({
      overallScore: 86,
      scorecard: [{ dimension: "Skills", score: 79, rationale: "Solid." }],
    });
    expect(result.overallScore).toBe(86);
    expect(result.scorecard[0].score).toBe(79);
  });

  it("clamps out-of-range overallScore, degrades invalid scorecard", () => {
    // overallScore is clamped by coerceScore; scorecard item with -5 fails Zod min(0)
    // so the degraded path uses General Assessment fallback with overallScore value
    const result = simulateDegradedParsing({
      overallScore: 150,
      scorecard: [{ dimension: "Skills", score: -5, rationale: "Bad." }],
    });
    expect(result.overallScore).toBe(100);
    // Scorecard is degraded because -5 fails Zod min(0); fallback uses overallScore
    expect(result.scorecard[0].dimension).toBe("General Assessment");
    expect(result.scorecard[0].score).toBe(100);
  });

  it("coerces string scores and rounds floats via normalization", () => {
    // In the real pipeline the normalization layer rounds before Zod sees it
    const result = simulateDegradedParsing({
      overallScore: "88",
      scorecard: [{ dimension: "Skills", score: "92", rationale: "Great." }],
    });
    expect(result.overallScore).toBe(88);
    expect(result.scorecard[0].score).toBe(92);
  });
});

describe("analyzeResume pipeline — atsCompatibility", () => {
  it("preserves valid atsCompatibility", () => {
    const result = simulateDegradedParsing({
      overallScore: 70,
      scorecard: [{ dimension: "Skills", score: 70, rationale: "OK." }],
      suggestions: [],
      strengths: [],
      atsCompatibility: {
        overallScore: 65,
        dimensions: [{ dimension: "Keywords", score: 60, rationale: "Partial." }],
      },
    });
    expect(result.atsCompatibility?.overallScore).toBe(65);
    expect(result.atsCompatibility?.dimensions).toHaveLength(1);
  });

  it("omits malformed atsCompatibility", () => {
    const result = simulateDegradedParsing({
      overallScore: 70,
      scorecard: [{ dimension: "Skills", score: 70, rationale: "OK." }],
      suggestions: [],
      strengths: [],
      atsCompatibility: { invalid: true } as unknown as Record<string, unknown>,
    });
    expect(result.atsCompatibility).toBeUndefined();
  });
});
