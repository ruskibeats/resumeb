import { describe, expect, it } from "vite-plus/test";

import {
  analysisDimensionSchema,
  analysisSuggestionSchema,
  atsCompatibilitySchema,
  resumeAnalysisSchema,
  storedResumeAnalysisSchema,
} from "./analysis";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function validAnalysis(overrides?: Record<string, unknown>) {
  return {
    overallScore: 78,
    scorecard: [
      {
        dimension: "Clarity & Specificity",
        score: 72,
        rationale: "Good use of action verbs but lacks concrete metrics.",
      },
    ],
    suggestions: [
      {
        title: "Quantify achievements",
        impact: "high" as const,
        why: "Adding numbers strengthens ATS compatibility.",
        evidence: "Current bullets say 'responsible for' without metrics.",
        affectedPaths: ["/sections/experience/items/0/description"],
        beforePreview: "Responsible for leading a team...",
        afterPreview: "Led a team of 5 engineers...",
        exampleRewrite: "Led a team of 5 engineers to deliver 3 releases.",
        copyPrompt: "Rewrite the following bullet to include metrics...",
        priority: "high" as const,
        effort: "low" as const,
        category: "quantification",
      },
    ],
    strengths: ["Clear career progression", "Strong technical skills"],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// analysisDimensionSchema
// ---------------------------------------------------------------------------

describe("analysisDimensionSchema", () => {
  it("accepts a valid dimension", () => {
    const result = analysisDimensionSchema.parse({
      dimension: "Skills Coverage",
      score: 85,
      rationale: "Strong coverage.",
    });
    expect(result.score).toBe(85);
  });

  it("coerces string score to number", () => {
    const result = analysisDimensionSchema.parse({
      dimension: "Skills Coverage",
      score: "85",
      rationale: "Strong coverage.",
    });
    expect(result.score).toBe(85);
  });

  it("rejects out-of-range score", () => {
    expect(() =>
      analysisDimensionSchema.parse({
        dimension: "Skills",
        score: 150,
        rationale: "Too high.",
      }),
    ).toThrow();
  });

  it("rejects missing dimension name", () => {
    expect(() =>
      analysisDimensionSchema.parse({
        score: 50,
        rationale: "Missing name.",
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// analysisSuggestionSchema
// ---------------------------------------------------------------------------

describe("analysisSuggestionSchema", () => {
  it("accepts a valid suggestion with all optional fields", () => {
    const result = analysisSuggestionSchema.parse({
      title: "Add metrics",
      impact: "high",
      why: "Improves ATS score.",
      exampleRewrite: "Led team of 5.",
      copyPrompt: "Rewrite bullets with metrics.",
      evidence: "Bullets lack numbers.",
      priority: "high",
      effort: "low",
      category: "ATS",
      affectedPaths: ["/sections/experience/items/0/description"],
      beforePreview: "Responsible for...",
      afterPreview: "Led 5 engineers...",
    });
    expect(result.title).toBe("Add metrics");
    expect(result.evidence).toBe("Bullets lack numbers.");
  });

  it("accepts a minimal suggestion (only required fields)", () => {
    const result = analysisSuggestionSchema.parse({
      title: "Add metrics",
      impact: "high",
      why: "Improves ATS score.",
      exampleRewrite: null,
      copyPrompt: "Rewrite bullets with metrics.",
    });
    expect(result.title).toBe("Add metrics");
    expect(result.evidence).toBeUndefined();
  });

  it("rejects invalid impact value", () => {
    expect(() =>
      analysisSuggestionSchema.parse({
        title: "Test",
        impact: "critical",
        why: "Reason.",
        exampleRewrite: "Fix.",
        copyPrompt: "Do it.",
      }),
    ).toThrow();
  });

  it("rejects missing title", () => {
    expect(() =>
      analysisSuggestionSchema.parse({
        impact: "high",
        why: "Reason.",
        exampleRewrite: null,
        copyPrompt: "Do it.",
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// atsCompatibilitySchema
// ---------------------------------------------------------------------------

describe("atsCompatibilitySchema", () => {
  it("accepts valid ATS data with dimensions", () => {
    const result = atsCompatibilitySchema.parse({
      overallScore: 72,
      summary: "Good keyword coverage.",
      dimensions: [
        {
          dimension: "Keyword Density",
          score: 65,
          rationale: "Missing 2 key terms.",
          issues: ["Missing 'AWS'"],
          suggestions: ["Add AWS skills"],
        },
      ],
      recommendations: ["Add a skills section at top"],
    });
    expect(result.overallScore).toBe(72);
    expect(result.dimensions).toHaveLength(1);
  });

  it("coerces string overallScore to number", () => {
    const result = atsCompatibilitySchema.parse({
      overallScore: "72",
    });
    expect(result.overallScore).toBe(72);
  });

  it("accepts minimal ATS object", () => {
    const result = atsCompatibilitySchema.parse({ overallScore: 50 });
    expect(result.overallScore).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// resumeAnalysisSchema
// ---------------------------------------------------------------------------

describe("resumeAnalysisSchema", () => {
  it("accepts a full valid analysis", () => {
    const result = resumeAnalysisSchema.parse(validAnalysis());
    expect(result.analysisVersion).toBe(1);
    expect(result.overallScore).toBe(78);
    expect(result.scorecard).toHaveLength(1);
    expect(result.suggestions).toHaveLength(1);
    expect(result.strengths).toHaveLength(2);
  });

  it("accepts analysis with string scores (coercion)", () => {
    const result = resumeAnalysisSchema.parse(
      validAnalysis({
        overallScore: "85",
        scorecard: [
          {
            dimension: "Impact",
            score: "90",
            rationale: "Great metrics.",
          },
        ],
      }),
    );
    expect(result.overallScore).toBe(85);
    expect(result.scorecard[0].score).toBe(90);
  });

  it("injects analysisVersion when missing", () => {
    // The fixture does not include analysisVersion; Zod default fills it
    const result = resumeAnalysisSchema.parse(validAnalysis());
    expect(result.analysisVersion).toBe(1);
  });

  it("rejects missing overallScore", () => {
    const { overallScore, ...rest } = validAnalysis();
    expect(() => resumeAnalysisSchema.parse(rest)).toThrow();
  });

  it("rejects empty scorecard", () => {
    expect(() =>
      resumeAnalysisSchema.parse(validAnalysis({ scorecard: [] })),
    ).toThrow();
  });

  it("rejects analysis over 10 suggestions", () => {
    const manySuggestions = Array.from({ length: 11 }, (_, i) => ({
      title: `Suggestion ${i}`,
      impact: "low" as const,
      why: `Reason ${i}.`,
      exampleRewrite: null,
      copyPrompt: `Prompt ${i}.`,
    }));
    expect(() =>
      resumeAnalysisSchema.parse(validAnalysis({ suggestions: manySuggestions })),
    ).toThrow();
  });

  it("rejects analysis over 10 strengths", () => {
    const manyStrengths = Array.from({ length: 11 }, (_, i) => `Strength ${i}`);
    expect(() =>
      resumeAnalysisSchema.parse(validAnalysis({ strengths: manyStrengths })),
    ).toThrow();
  });

  it("accepts atsCompatibility when present", () => {
    const result = resumeAnalysisSchema.parse(
      validAnalysis({
        atsCompatibility: {
          overallScore: 65,
          summary: "Moderate.",
          dimensions: [{ dimension: "Keywords", score: 60, rationale: "OK." }],
        },
      }),
    );
    expect(result.atsCompatibility?.overallScore).toBe(65);
  });

  it("omits atsCompatibility when missing (optional)", () => {
    const result = resumeAnalysisSchema.parse(validAnalysis());
    expect(result.atsCompatibility).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// storedResumeAnalysisSchema
// ---------------------------------------------------------------------------

describe("storedResumeAnalysisSchema", () => {
  const storedOverrides = {
    updatedAt: new Date("2025-01-01"),
    modelMeta: { provider: "openai", model: "gpt-4" },
    sourceJobUrl: "https://example.com/job",
    sourceJobTitle: "Engineer",
    sourceJobEmployer: "Acme",
  };

  it("accepts a valid stored analysis", () => {
    const result = storedResumeAnalysisSchema.parse({
      ...validAnalysis(),
      ...storedOverrides,
    });
    expect(result.updatedAt).toBeInstanceOf(Date);
    expect(result.modelMeta.provider).toBe("openai");
    expect(result.sourceJobTitle).toBe("Engineer");
  });

  it("accepts degraded: true", () => {
    const result = storedResumeAnalysisSchema.parse({
      ...validAnalysis(),
      ...storedOverrides,
      degraded: true,
    });
    expect(result.degraded).toBe(true);
  });

  it("omits degraded when not provided", () => {
    const result = storedResumeAnalysisSchema.parse({
      ...validAnalysis(),
      ...storedOverrides,
    });
    expect(result.degraded).toBeUndefined();
  });

  it("rejects missing modelMeta", () => {
    const { modelMeta, ...rest } = storedOverrides;
    expect(() =>
      storedResumeAnalysisSchema.parse({
        ...validAnalysis(),
        ...rest,
      }),
    ).toThrow();
  });

  it("coerces string updatedAt to Date", () => {
    const result = storedResumeAnalysisSchema.parse({
      ...validAnalysis(),
      ...storedOverrides,
      updatedAt: "2025-01-01T00:00:00Z",
    });
    expect(result.updatedAt).toBeInstanceOf(Date);
  });
});
