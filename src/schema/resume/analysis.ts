import z from "zod";

export const analysisDimensionSchema = z.object({
  dimension: z.string().min(1),
  score: z.number().int().min(0).max(100),
  rationale: z.string().min(1),
});

export const analysisPrioritySchema = z.enum(["high", "medium", "low"]);

export const analysisEffortSchema = z.enum(["high", "medium", "low"]);

export const analysisSuggestionSchema = z.object({
  title: z.string().min(1),
  impact: z.enum(["high", "medium", "low"]),
  why: z.string().min(1),
  exampleRewrite: z.string().nullable(),
  copyPrompt: z.string().min(1),
  priority: analysisPrioritySchema.optional(),
  effort: analysisEffortSchema.optional(),
  category: z.string().min(1).optional(),
});

export const atsCompatibilityDimensionSchema = z.object({
  dimension: z.string().min(1),
  score: z.number().int().min(0).max(100),
  rationale: z.string().min(1).optional(),
  issues: z.array(z.string().min(1)).optional(),
  suggestions: z.array(z.string().min(1)).optional(),
});

export const atsCompatibilitySchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  summary: z.string().min(1).optional(),
  dimensions: z.array(atsCompatibilityDimensionSchema).optional(),
  recommendations: z.array(z.string().min(1)).optional(),
});

export const resumeAnalysisSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  scorecard: z.array(analysisDimensionSchema).min(1),
  suggestions: z.array(analysisSuggestionSchema).max(10),
  strengths: z.array(z.string().min(1)).max(10),
  atsCompatibility: atsCompatibilitySchema.optional(),
});

export const resumeAnalysisOutputSchema = z.object({
  overallScore: z.number(),
  scorecard: z.array(
    z.object({
      dimension: z.string(),
      score: z.number(),
      rationale: z.string(),
    }),
  ),
  suggestions: z.array(
    z.object({
      title: z.string(),
      impact: z.enum(["high", "medium", "low"]),
      why: z.string(),
      exampleRewrite: z.string().nullable(),
      copyPrompt: z.string(),
      priority: analysisPrioritySchema.optional(),
      effort: analysisEffortSchema.optional(),
      category: z.string().min(1).optional(),
    }),
  ),
  strengths: z.array(z.string()),
  atsCompatibility: atsCompatibilitySchema.optional(),
});

export const storedResumeAnalysisSchema = resumeAnalysisSchema.extend({
  updatedAt: z.coerce.date(),
  modelMeta: z.object({
    provider: z.string().min(1),
    model: z.string().min(1),
  }),
  sourceJobUrl: z.string().optional().describe("Job posting URL from the tailoring source"),
  sourceJobTitle: z.string().optional().describe("Job title from the tailoring source"),
  sourceJobEmployer: z.string().optional().describe("Employer name from the tailoring source"),
});

export type AtsCompatibility = z.infer<typeof atsCompatibilitySchema>;
export type AnalysisSuggestion = z.infer<typeof analysisSuggestionSchema>;
export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
export type StoredResumeAnalysis = z.infer<typeof storedResumeAnalysisSchema>;
