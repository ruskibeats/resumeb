import z from "zod";

// Define question categories
export const interviewQuestionCategorySchema = z.enum([
  "technical",
  "behavioral",
  "situational",
  "company",
  "delivery",
  "stakeholder",
  "contractor-fit",
]);

// Define difficulty levels
export const interviewQuestionDifficultySchema = z.enum([
  "easy",
  "medium",
  "hard",
]);

// Define the structure for individual interview questions
export const interviewQuestionSchema = z.object({
  id: z.string(),
  category: interviewQuestionCategorySchema,
  question: z.string(),
  difficulty: interviewQuestionDifficultySchema,
  explanation: z
    .string()
    .optional()
    .describe("Explanation of why this question is important and what the interviewer is looking for"),
  suggestedAnswerFramework: z
    .string()
    .optional()
    .describe("Suggested framework for answering this question (e.g., STAR, CAR)"),
  relatedSkills: z
    .array(z.string())
    .describe("Skills that this question assesses"),
  preparationTips: z
    .array(z.string())
    .describe("Tips for preparing to answer this question"),
  evidenceMap: z
    .array(z.string())
    .optional()
    .describe("References to specific evidence from the resume that supports answering this question"),
});

// Define the structure for the interview preparation overview
export const interviewPreparationOverviewSchema = z.object({
  totalQuestions: z.number(),
  categoryBreakdown: z.record(interviewQuestionCategorySchema, z.number()),
  difficultyDistribution: z.record(interviewQuestionDifficultySchema, z.number()),
});

// Define the structure for the preparation guide
export const interviewPreparationGuideSchema = z.object({
  technicalDepth: z
    .string()
    .describe("Guidance on technical preparation depth"),
  behavioralTips: z
    .string()
    .describe("Tips for behavioral question preparation"),
  companyResearch: z
    .string()
    .describe("Company-specific research recommendations"),
  commonMistakes: z
    .array(z.string())
    .describe("Common mistakes to avoid in interviews"),
  contractorSpecific: z
    .string()
    .describe("Contractor-specific considerations: vendor relationships, short ramp-up, delivery risk, stakeholder management"),
});

// Define the main interview preparation schema
export const interviewPreparationSchema = z.object({
  questions: z.array(interviewQuestionSchema),
  overview: interviewPreparationOverviewSchema,
  preparationGuide: interviewPreparationGuideSchema,
  generatedAt: z.coerce.date(),
});

// Export types
export type InterviewQuestionCategory = z.infer<typeof interviewQuestionCategorySchema>;
export type InterviewQuestionDifficulty = z.infer<typeof interviewQuestionDifficultySchema>;
export type InterviewQuestion = z.infer<typeof interviewQuestionSchema>;
export type InterviewPreparationOverview = z.infer<typeof interviewPreparationOverviewSchema>;
export type InterviewPreparationGuide = z.infer<typeof interviewPreparationGuideSchema>;
export type InterviewPreparation = z.infer<typeof interviewPreparationSchema>;
