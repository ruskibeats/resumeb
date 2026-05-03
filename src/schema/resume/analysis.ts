import z from "zod";

export const analysisDimensionSchema = z.object({
  dimension: z.string().min(1),
  score: z.coerce.number().int().min(0).max(100),
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
  evidence: z.string().optional().describe("Specific resume content that supports this suggestion"),
  priority: analysisPrioritySchema.optional(),
  effort: analysisEffortSchema.optional(),
  category: z.string().min(1).optional(),
  // Enhanced fields for Phase 2: User trust and patch safety
  affectedPaths: z.array(z.string()).optional().describe("JSON paths that would be modified by this suggestion"),
  beforePreview: z.string().optional().describe("Preview of current content"),
  afterPreview: z.string().optional().describe("Preview of suggested replacement"),
});

export const atsCompatibilityDimensionSchema = z.object({
  dimension: z.string().min(1),
  score: z.coerce.number().int().min(0).max(100),
  rationale: z.string().min(1).optional(),
  issues: z.array(z.string().min(1)).optional(),
  suggestions: z.array(z.string().min(1)).optional(),
});

export const atsCompatibilitySchema = z.object({
  overallScore: z.coerce.number().int().min(0).max(100),
  summary: z.string().min(1).optional(),
  dimensions: z.array(atsCompatibilityDimensionSchema).optional(),
  recommendations: z.array(z.string().min(1)).optional(),
});

export const resumeAnalysisSchema = z.object({
  analysisVersion: z.literal(1).optional().default(1).describe("Schema version for future migrations — auto-added if missing"),
  overallScore: z.coerce.number().int().min(0).max(100),
  scorecard: z.array(analysisDimensionSchema).min(1),
  suggestions: z.array(analysisSuggestionSchema).max(10),
  strengths: z.array(z.string().min(1)).max(10),
  atsCompatibility: atsCompatibilitySchema.optional(),
});

export const resumeAnalysisOutputSchema = z.object({
  overallScore: z.coerce.number(),
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
      affectedPaths: z.array(z.string()).optional(),
      beforePreview: z.string().optional(),
      afterPreview: z.string().optional(),
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
  degraded: z.boolean().optional().describe("True if the analysis is partial due to schema mismatch"),
});

export type AtsCompatibility = z.infer<typeof atsCompatibilitySchema>;
export type AnalysisSuggestion = z.infer<typeof analysisSuggestionSchema>;
export type ResumeAnalysis = z.infer<typeof resumeAnalysisSchema>;
export type StoredResumeAnalysis = z.infer<typeof storedResumeAnalysisSchema>;
