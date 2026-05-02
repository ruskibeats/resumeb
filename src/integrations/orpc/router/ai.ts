import { ORPCError } from "@orpc/client";
import { type } from "@orpc/server";
import { AISDKError, type UIMessage } from "ai";
import z, { flattenError, ZodError } from "zod";

import { jobResultSchema } from "@/schema/jobs";
import { coverLetterSchema, coverLetterTargetSchema, coverLetterToneSchema } from "@/schema/cover-letter";
import { interviewPreparationSchema } from "@/schema/interview-prep";
import { resumeAnalysisSchema, storedResumeAnalysisSchema } from "@/schema/resume/analysis";
import { type ResumeData, resumeDataSchema } from "@/schema/resume/data";
import { tailorOutputSchema } from "@/schema/tailor";

import { protectedProcedure } from "../context";
import { aiRequestRateLimit } from "../rate-limit";
import { aiCredentialsSchema, aiService, fileInputSchema } from "../services/ai";
import { resumeService } from "../services/resume";

type AIProvider = z.infer<typeof aiCredentialsSchema.shape.provider>;

// Extended output type for applySuggestion that includes the patch operations
const suggestionOutputSchema = z.object({
  resumeData: resumeDataSchema,
  operations: z.array(z.any()),
});

function isInvalidAiBaseUrlError(error: unknown): boolean {
  return error instanceof Error && error.message === "INVALID_AI_BASE_URL";
}

function isAiProviderGatewayError(error: unknown): boolean {
  return error instanceof AISDKError;
}

function throwAiProviderGatewayError(): never {
  throw new ORPCError("BAD_GATEWAY", { message: "Could not reach the AI provider." });
}

function throwAiProviderConfigError(): never {
  throw new ORPCError("BAD_REQUEST", { message: "Invalid AI provider configuration." });
}

function throwResumeStructureError(error: ZodError): never {
  throw new ORPCError("BAD_REQUEST", {
    message: "Invalid resume data structure",
    cause: flattenError(error),
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
        if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
        if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();

        throw error;
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
        if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
        if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();

        if (error instanceof ZodError) throwResumeStructureError(error);
        throw error;
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
        if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
        if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();

        if (error instanceof ZodError) throwResumeStructureError(error);

        throw error;
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
        if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
        if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();

        throw error;
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
        if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
        if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();

        if (error instanceof ZodError) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Invalid resume data structure",
            cause: flattenError(error),
          });
        }

        throw error;
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
      try {
        const analysis = resumeAnalysisSchema.parse(
          await aiService.analyzeResume({
            provider: input.provider,
            model: input.model,
            apiKey: input.apiKey,
            baseURL: input.baseURL,
            resumeData: input.resumeData,
            job: input.job,
          }),
        );

        return await resumeService.analysis.upsert({
          id: input.resumeId,
          userId: context.user.id,
          analysis: {
            ...analysis,
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
      } catch (error) {
        if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
        if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();

        if (error instanceof ZodError) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Invalid resume analysis structure",
            cause: flattenError(error),
          });
        }

        throw error;
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
        if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
        if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();

        if (error instanceof ZodError) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Invalid cover letter structure",
            cause: flattenError(error),
          });
        }

        throw error;
      }
    }),

  applySuggestion: protectedProcedure
    .route({
      method: "POST",
      path: "/ai/apply-suggestion",
      tags: ["AI"],
      operationId: "applySuggestion",
      summary: "Apply an AI analysis suggestion to the resume",
      description: "Takes a copyPrompt from an analysis suggestion, sends it to the AI, and applies the resulting JSON Patch operations to the resume. Returns the updated resume data along with the patch operations for preview. Requires authentication and AI credentials.",
      successDescription: "Suggestion applied successfully.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        resumeData: resumeDataSchema,
        prompt: z.string().min(1),
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
        if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
        if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();

        throw error;
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
        if (isInvalidAiBaseUrlError(error)) throwAiProviderConfigError();
        if (isAiProviderGatewayError(error)) throwAiProviderGatewayError();

        throw error;
      }
    }),

};
