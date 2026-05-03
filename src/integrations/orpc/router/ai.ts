import { ORPCError } from "@orpc/client";
import { type } from "@orpc/server";
import { AISDKError, type UIMessage } from "ai";
import z, { flattenError, ZodError } from "zod";

import { jobResultSchema } from "@/schema/jobs";
import { coverLetterSchema, coverLetterTargetSchema, coverLetterToneSchema } from "@/schema/cover-letter";
import { interviewPreparationSchema } from "@/schema/interview-prep";
import { storedResumeAnalysisSchema } from "@/schema/resume/analysis";
import { type ResumeData, resumeDataSchema } from "@/schema/resume/data";
import { tailorOutputSchema } from "@/schema/tailor";

import { protectedProcedure } from "../context";
import { aiRequestRateLimit } from "../rate-limit";
import { aiCredentialsSchema, aiService, fileInputSchema } from "../services/ai";
import { resumeService } from "../services/resume";
import { classifyError } from "@/utils/ai-errors";
import { logAiError, logAiResponse } from "@/utils/ai-logger";

type AIProvider = z.infer<typeof aiCredentialsSchema.shape.provider>;

// Extended output type for applySuggestion that includes the patch operations
const suggestionOutputSchema = z.object({
  resumeData: resumeDataSchema,
  operations: z.array(z.any()),
  previews: z.array(z.object({
    path: z.string(),
    label: z.string(),
    before: z.string(),
    after: z.string(),
  })).optional(),
});

function isInvalidAiBaseUrlError(error: unknown): boolean {
  return error instanceof Error && error.message === "INVALID_AI_BASE_URL";
}

function isAiProviderGatewayError(error: unknown): boolean {
  return error instanceof AISDKError || (error instanceof Error && /cookie\s*auth|no\s*auth\s*credentials/i.test(error.message));
}



/**
 * Error taxonomy for the AI pipeline.
 * - MODEL_API_ERROR: The AI provider returned an error (timeout, rate limit, auth, etc.)
 * - CONTRACT_ERROR: The AI returned valid JSON but it doesn't match the expected schema
 * - INTERNAL_ERROR: DB issues, coding bugs, or unexpected failures
 */
type AiPipelineErrorKind = "MODEL_API_ERROR" | "CONTRACT_ERROR" | "INTERNAL_ERROR";

function classifyPipelineError(error: unknown, provider: string): {
  kind: AiPipelineErrorKind;
  orpcCode: string;
  userMessage: string;
} {
  // 1. Invalid base URL (configuration issue)
  if (isInvalidAiBaseUrlError(error)) {
    return {
      kind: "MODEL_API_ERROR",
      orpcCode: "BAD_REQUEST",
      userMessage: "Invalid AI provider configuration.",
    };
  }

  // 2. Known provider gateway errors (auth, rate limit, timeout, etc.)
  if (isAiProviderGatewayError(error)) {
    const info = classifyError(error, provider as AIProvider);
    return {
      kind: "MODEL_API_ERROR",
      orpcCode: "BAD_GATEWAY",
      userMessage: info.userMessage,
    };
  }

  // 3. Zod schema contract errors (AI output didn't match expected shape)
  if (error instanceof ZodError) {
    return {
      kind: "CONTRACT_ERROR",
      orpcCode: "BAD_REQUEST",
      userMessage: "The AI returned an invalid analysis format. Please try again.",
    };
  }

  // 4. Circuit breaker open
  if (error instanceof Error && error.message.startsWith("CIRCUIT_BREAKER_OPEN")) {
    return {
      kind: "MODEL_API_ERROR",
      orpcCode: "BAD_GATEWAY",
      userMessage: "Service temporarily unavailable. Please try again in a few minutes.",
    };
  }

  // 5. Everything else — internal/unexpected
  return {
    kind: "INTERNAL_ERROR",
    orpcCode: "INTERNAL_SERVER_ERROR",
    userMessage: "An unexpected error occurred. Please try again later.",
  };
}

function throwAiPipelineError(error: unknown, provider: string, operation: string): never {
  const { kind, orpcCode, userMessage } = classifyPipelineError(error, provider);

  // Log structured error entries by category
  const context = `${operation}/${kind}`;
  logAiError(context, error);

  // Include Zod flatten details in contract errors for debugging
  const cause = error instanceof ZodError ? flattenError(error) : undefined;

  throw new ORPCError(orpcCode, {
    message: userMessage,
    cause,
  });
}

export const aiRouter = {
  testConnection: protectedProcedure
    .route({
      method: "POST",
      path: "/ai/test-connection",
      tags: ["AI"],
      operationId: "testAiConnection",
      summary: "Test AI provider connection",
      description:
        "Validates the connection to an AI provider by sending a simple test prompt. Requires the provider type, model name, API key, and an optional base URL. Supported providers: OpenAI, Anthropic, Google Gemini, Ollama, and Vercel AI Gateway. Requires authentication.",
      successDescription: "The AI provider connection was successful.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
      }),
    )
    .use(aiRequestRateLimit)
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "Invalid AI provider configuration.",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await aiService.testConnection(input);
      } catch (error) {
        throwAiPipelineError(error, input.provider, "testConnection");
      }
    }),

  parsePdf: protectedProcedure
    .route({
      method: "POST",
      path: "/ai/parse-pdf",
      tags: ["AI"],
      operationId: "parseResumePdf",
      summary: "Parse a PDF file into resume data",
      description:
        "Extracts structured resume data from a PDF file using the specified AI provider. The file should be sent as a base64-encoded string along with AI provider credentials. Returns a complete ResumeData object. Requires authentication.",
      successDescription: "The PDF was successfully parsed into structured resume data.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        file: fileInputSchema,
      }),
    )
    .use(aiRequestRateLimit)
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "The AI returned an improperly formatted structure.",
        status: 400,
      },
    })
    .handler(async ({ input }): Promise<ResumeData> => {
      try {
        return await aiService.parsePdf(input);
      } catch (error) {
        throwAiPipelineError(error, input.provider, "parsePdf");
      }
    }),

  parseDocx: protectedProcedure
    .route({
      method: "POST",
      path: "/ai/parse-docx",
      tags: ["AI"],
      operationId: "parseResumeDocx",
      summary: "Parse a DOCX file into resume data",
      description:
        "Extracts structured resume data from a DOCX or DOC file using the specified AI provider. The file should be sent as a base64-encoded string along with AI provider credentials and the document's media type. Returns a complete ResumeData object. Requires authentication.",
      successDescription: "The DOCX was successfully parsed into structured resume data.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        file: fileInputSchema,
        mediaType: z.enum([
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]),
      }),
    )
    .use(aiRequestRateLimit)
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "The AI returned an improperly formatted structure.",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await aiService.parseDocx(input);
      } catch (error) {
        throwAiPipelineError(error, input.provider, "parseDocx");
      }
    }),

  chat: protectedProcedure
    .route({
      method: "POST",
      path: "/ai/chat",
      tags: ["AI"],
      operationId: "aiChat",
      summary: "Chat with AI to modify resume",
      description:
        "Streams a chat response from the configured AI provider. The LLM can call the patch_resume tool to generate JSON Patch operations that modify the resume. Requires authentication and AI provider credentials.",
    })
    .input(
      type<{
        provider: AIProvider;
        model: string;
        apiKey: string;
        baseURL: string;
        messages: UIMessage[];
        resumeData: ResumeData;
      }>(),
    )
    .use(aiRequestRateLimit)
    .handler(async ({ input }) => {
      try {
        return await aiService.chat(input);
      } catch (error) {
        throwAiPipelineError(error, input.provider, "chat");
      }
    }),

  tailorResume: protectedProcedure
    .route({
      method: "POST",
      path: "/ai/tailor-resume",
      tags: ["AI"],
      operationId: "tailorResume",
      summary: "Auto-tailor resume for a job posting",
      description:
        "Uses AI to automatically tailor a resume for a specific job posting. Rewrites the summary, adjusts experience descriptions, and curates skills for ATS optimization. Returns structured modifications as a simplified output object. Requires authentication and AI credentials.",
      successDescription: "Structured tailoring output returned successfully.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        resumeData: resumeDataSchema,
        job: jobResultSchema,
        customPrompt: z.string().optional(),
        donorResumeData: resumeDataSchema.optional().describe("The donor CV (original imported resume) for full-context curation"),
      }),
    )
    .use(aiRequestRateLimit)
    .output(tailorOutputSchema)
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "The AI returned an improperly formatted structure.",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await aiService.tailorResume(input);
      } catch (error) {
        throwAiPipelineError(error, input.provider, "tailorResume");
      }
    }),

  analyzeResume: protectedProcedure
    .route({
      method: "POST",
      path: "/ai/analyze-resume",
      tags: ["AI"],
      operationId: "analyzeResume",
      summary: "Analyze resume and persist latest analysis",
      description:
        "Uses AI to analyze the current resume and returns a structured analysis with scorecard, strengths, and improvement suggestions. The latest analysis is persisted and can be fetched later. Requires authentication and AI credentials.",
      successDescription: "Structured resume analysis returned and persisted successfully.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        resumeId: z.string(),
        resumeData: resumeDataSchema,
        job: jobResultSchema.optional(),
      }),
    )
    .use(aiRequestRateLimit)
    .output(storedResumeAnalysisSchema)
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "The AI returned an improperly formatted structure.",
        status: 400,
      },
    })
    .handler(async ({ context, input }) => {
      const requestId = crypto.randomUUID();
      const startTime = Date.now();

      try {
        // Service now always returns a valid ResumeAnalysis (graceful degradation)
        const analysis = await aiService.analyzeResume({
          provider: input.provider,
          model: input.model,
          apiKey: input.apiKey,
          baseURL: input.baseURL,
          resumeData: input.resumeData,
          job: input.job,
        });

        // Detect degradation: if the AI returned a fallback scorecard
        // (single "General Assessment" dimension), mark as degraded
        const isDegraded =
          analysis.scorecard.length === 1 &&
          analysis.scorecard[0].dimension === "General Assessment";

        const stored = await resumeService.analysis.upsert({
          id: input.resumeId,
          userId: context.user.id,
          analysis: {
            ...analysis,
            degraded: isDegraded || undefined,
            updatedAt: new Date(),
            modelMeta: {
              provider: input.provider,
              model: input.model,
            },
            sourceJobUrl: input.job?.job_apply_link || undefined,
            sourceJobTitle: input.job?.job_title || undefined,
            sourceJobEmployer: input.job?.employer_name || undefined,
          },
        });

        logAiResponse({
          operation: "analyzeResume",
          provider: input.provider,
          model: input.model,
          responseLength: JSON.stringify(stored).length,
          responseTimeMs: Date.now() - startTime,
          success: true,
          resumeId: input.resumeId,
          requestId,
          extra: {
            degraded: isDegraded,
            scorecardDimensions: analysis.scorecard.length,
            suggestionCount: analysis.suggestions.length,
            strengthCount: analysis.strengths.length,
          },
        });

        return stored;
      } catch (error) {
        logAiResponse({
          operation: "analyzeResume",
          provider: input.provider,
          model: input.model,
          responseLength: 0,
          responseTimeMs: Date.now() - startTime,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          resumeId: input.resumeId,
          requestId,
        });

        throwAiPipelineError(error, input.provider, "analyzeResume");
      }
    }),

  generateCoverLetter: protectedProcedure
    .route({
      method: "POST",
      path: "/ai/generate-cover-letter",
      tags: ["AI"],
      operationId: "generateCoverLetter",
      summary: "Generate a cover letter",
      description:
        "Generates a truthful, job-targeted cover letter from the current resume data and optional target role details. Returns HTML suitable for a Reactive Resume cover-letter custom section. Requires authentication and AI credentials.",
      successDescription: "Cover letter generated successfully.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        resumeData: resumeDataSchema,
        job: jobResultSchema.optional(),
        target: coverLetterTargetSchema.optional(),
        tone: coverLetterToneSchema.default("professional"),
        additionalInstructions: z.string().max(4000).optional().default(""),
      }),
    )
    .use(aiRequestRateLimit)
    .output(coverLetterSchema)
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "The AI returned an invalid cover letter format.",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await aiService.generateCoverLetter({
          provider: input.provider,
          model: input.model,
          apiKey: input.apiKey,
          baseURL: input.baseURL,
          resumeData: input.resumeData,
          job: input.job,
          target: input.target,
          tone: input.tone,
          additionalInstructions: input.additionalInstructions,
        });
      } catch (error) {
        throwAiPipelineError(error, input.provider, "generateCoverLetter");
      }
    }),

  applySuggestion: protectedProcedure
    .route({
      method: "POST",
      path: "/ai/apply-suggestion",
      tags: ["AI"],
      operationId: "applySuggestion",
      summary: "Apply an AI analysis suggestion to the resume",
      description:
        "Applies a suggestion from resume analysis. If affectedPaths and exampleRewrite are provided, applies the change locally without calling the AI. Otherwise falls back to sending the copyPrompt to the AI for patch generation.",
      successDescription: "Suggestion applied successfully.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        resumeData: resumeDataSchema,
        prompt: z.string().min(1),
        // Optional: local apply fields (bypass AI call)
        affectedPaths: z.array(z.string()).optional(),
        exampleRewrite: z.string().optional(),
      }),
    )
    .use(aiRequestRateLimit)
    .output(suggestionOutputSchema)
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "The AI returned an invalid response.",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await aiService.applySuggestion(input);
      } catch (error) {
        throwAiPipelineError(error, input.provider, "applySuggestion");
      }
    }),

  prepareForInterview: protectedProcedure
    .route({
      method: "POST",
      path: "/ai/prepare-for-interview",
      tags: ["AI"],
      operationId: "prepareForInterview",
      summary: "Generate interview preparation materials",
      description: "Creates personalized interview questions and preparation materials based on resume data and job description.",
      successDescription: "Interview preparation materials generated successfully.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        resumeData: resumeDataSchema,
        job: jobResultSchema.optional(),
        focusAreas: z.array(z.string()).optional(),
      }),
    )
    .use(aiRequestRateLimit)
    .output(interviewPreparationSchema)
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "Invalid input for interview preparation",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await aiService.prepareForInterview({
          provider: input.provider,
          model: input.model,
          apiKey: input.apiKey,
          baseURL: input.baseURL,
          resumeData: input.resumeData,
          jobData: input.job,
          focusAreas: input.focusAreas,
        });
      } catch (error) {
        throwAiPipelineError(error, input.provider, "prepareForInterview");
      }
    }),

};
