import type { ModelMessage } from "ai";

import { AISDKError } from "ai";
import { ORPCError, streamToEventIterator } from "@orpc/server";
import {
  logAiDebug,
  logAiError,
  logAiOutputParsing,
  logAiResponse,
} from "@/utils/ai-logger";
import {
  convertToModelMessages,
  generateText,
  stepCountIs,
  streamText,
  tool,
  type LanguageModel,
  type UIMessage,
} from "ai";
import { jsonrepair } from "jsonrepair";
import z, { flattenError, ZodError } from "zod";

import type { JobResult } from "@/schema/jobs";
import type { ResumeData } from "@/schema/resume/data";

import analyzeResumeSystemPromptTemplate from "@/integrations/ai/prompts/analyze-resume-system.md?raw";
import chatSystemPromptTemplate from "@/integrations/ai/prompts/chat-system.md?raw";
import docxParserSystemPrompt from "@/integrations/ai/prompts/docx-parser-system.md?raw";
import docxParserUserPrompt from "@/integrations/ai/prompts/docx-parser-user.md?raw";
import pdfParserSystemPrompt from "@/integrations/ai/prompts/pdf-parser-system.md?raw";
import pdfParserUserPrompt from "@/integrations/ai/prompts/pdf-parser-user.md?raw";
import tailorSystemPromptTemplate from "@/integrations/ai/prompts/tailor-system.md?raw";
import masterCareerData from "@/integrations/ai/prompts/master-career-data.md?raw";
import {
  executePatchResume,
  patchResumeDescription,
  patchResumeInputSchema,
} from "@/integrations/ai/tools/patch-resume";
import {
  getProviderAdapter,
} from "@/integrations/ai/providers";
import { registerProviders } from "@/integrations/ai/providers/register";
import { applyResumePatches } from "@/utils/resume/patch";
import { AI_PROVIDER_DEFAULT_BASE_URLS, aiProviderSchema, type AIProvider } from "@/integrations/ai/types";
import type { Operation } from "fast-json-patch";
import { generateOperationPreviews } from "@/utils/resume/diff";
import { coverLetterSchema, type CoverLetter, type CoverLetterTarget, type CoverLetterTone } from "@/schema/cover-letter";
import { interviewPreparationSchema, type InterviewPreparation } from "@/schema/interview-prep";
import {
  analysisDimensionSchema,
  analysisSuggestionSchema,
  atsCompatibilitySchema,
  resumeAnalysisSchema,
  type ResumeAnalysis,
} from "@/schema/resume/analysis";
import { defaultResumeData, resumeDataSchema } from "@/schema/resume/data";
import { tailorOutputSchema, type TailorOutput } from "@/schema/tailor";
import { buildAiExtractionTemplate } from "@/utils/ai-template";
import { env } from "@/utils/env";
import { coerceScore, stripHiddenItems } from "@/utils/analysis";
import { isObject } from "@/utils/sanitize";
import { isAllowedExternalUrl, parseAllowedHostList } from "@/utils/url-security";
import { isCircuitOpen, recordFailure, recordSuccess } from "@/utils/circuit-breaker";

// Register providers at module load
registerProviders();

const aiExtractionTemplate = buildAiExtractionTemplate();

// Retry configuration - exported for potential future use
export const AI_MAX_RETRIES = 3;
export const AI_INITIAL_BACKOFF_MS = 500;
export const AI_MAX_BACKOFF_MS = 10000;

// Timeout configuration for AI operations (in milliseconds)
export const AI_TIMEOUT_MS = 120000; // 2 minutes default
export const AI_STREAM_TIMEOUT_MS = 300000; // 5 minutes for streaming operations

/**
 * Timeout wrapper for AI operations.
 * Returns a promise that rejects after the specified timeout.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = "AI operation timed out",
): Promise<T> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

/**
 * Calculates exponential backoff delay with jitter.
 */
function calculateBackoff(attempt: number): number {
  const exponential = AI_INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
  const capped = Math.min(exponential, AI_MAX_BACKOFF_MS);
  // Add jitter (±25%)
  const jitter = capped * 0.25 * (Math.random() * 2 - 1);
  return Math.max(AI_INITIAL_BACKOFF_MS, Math.floor(capped + jitter));
}

/**
 * Determines if an error is retryable (network issues, rate limits, 5xx errors).
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof AISDKError) {
    // Retry on network errors, rate limits, and 5xx errors
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504")
    );
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes("rate limit") ||
      message.includes("timeout") ||
      message.includes("network") ||
      message.includes("etimedout") ||
      message.includes("econnreset")
    );
  }
  return false;
}

/**
 * Wraps an async AI operation with retry logic and logging.
 * Note: Currently not used in all operations but available for future integration.
 */
export async function withRetry<T>(
  operation: string,
  provider: AIProvider,
  model: string,
  fn: () => Promise<T>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
    const startTime = Date.now();
    try {
      const result = await fn();
      logAiResponse({
        operation,
        provider,
        model,
        responseLength: JSON.stringify(result).length,
        responseTimeMs: Date.now() - startTime,
        success: true,
      });
      return result;
    } catch (err) {
      lastError = err;
      const responseTime = Date.now() - startTime;

      if (!isRetryableError(err) || attempt === AI_MAX_RETRIES) {
        logAiResponse({
          operation,
          provider,
          model,
          responseLength: 0,
          responseTimeMs: responseTime,
          success: false,
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      const backoff = calculateBackoff(attempt);
      logAiDebug(
        `Attempt ${attempt} failed, retrying in ${backoff}ms...`,
        JSON.stringify({
          error: err instanceof Error ? err.message : String(err),
          attempt,
          nextDelayMs: backoff,
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  throw lastError;
}

/**
 * Merges two objects recursively, filling in missing properties in the target object
 * with values from the source object, but does not overwrite existing properties in the target
 * unless the source provides a defined, non-null value.
 *
 * Both target and source must be plain objects (Record<string, unknown>).
 * This function does not mutate either argument; returns a new object.
 *
 * @param target - The object to merge into (existing values take precedence)
 * @param source - The object providing default values
 * @returns The merged object
 */
function mergeDefaults<T extends Record<string, unknown>, S extends Record<string, unknown>>(
  target: T,
  source: S,
): T & S {
  if (!isObject(target) || !isObject(source)) {
    // Use source value if defined (non-null, non-undefined), else fallback to target
    return (source !== undefined && source !== null ? source : target) as T & S;
  }

  const output: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    if (sourceValue === undefined || sourceValue === null) {
      continue;
    }
    const targetValue = target[key];

    if (isObject(sourceValue) && isObject(targetValue)) {
      output[key] = mergeDefaults(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
    } else if (isObject(sourceValue) && (targetValue === undefined || targetValue === null)) {
      // Fill with source object only if target does not have it
      output[key] = sourceValue;
    } else if (!isObject(sourceValue)) {
      output[key] = sourceValue;
    } else if (targetValue === undefined) {
      output[key] = sourceValue;
    }
  }

  return output as T & S;
}

function logAndRethrow(context: string, error: unknown): never {
  if (error instanceof Error) {
    console.error(`${context}:`, error);
    throw error;
  }

  console.error(`${context}:`, error);
  throw new Error(`An unknown error occurred during ${context}.`);
}

function getJsonBoundaryIndices(value: string): { first: number; last: number } {
  const firstCurly = value.indexOf("{");
  const firstSquare = value.indexOf("[");
  const lastCurly = value.lastIndexOf("}");
  const lastSquare = value.lastIndexOf("]");

  let first = -1;
  if (firstCurly !== -1 && firstSquare !== -1) {
    first = Math.min(firstCurly, firstSquare);
  } else {
    first = Math.max(firstCurly, firstSquare);
  }

  return { first, last: Math.max(lastCurly, lastSquare) };
}

function parseAndValidateResumeJson(resultText: string): ResumeData {
  let jsonString = resultText;
  const { first, last } = getJsonBoundaryIndices(jsonString);
  if (first !== -1 && last !== -1 && last >= first) {
    jsonString = jsonString.substring(first, last + 1);
  }

  try {
    const repairedJson = jsonrepair(jsonString);
    const parsedJson = JSON.parse(repairedJson);
    const mergedData = mergeDefaults(defaultResumeData, parsedJson);
    const normalizedData = normalizeResumeDataForSchema(mergedData);

    return resumeDataSchema.parse({
      ...normalizedData,
      customSections: [],
      picture: defaultResumeData.picture,
      metadata: defaultResumeData.metadata,
    });
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      console.error("Zod validation failed during resume parsing:", flattenError(error));
      throw error;
    }

    console.error("Unknown error during resume data validation:", error);
    throw new Error("An unknown error occurred while validating the merged resume data.");
  }
}

const sectionRequiredFieldMap = {
  profiles: "network",
  experience: "company",
  education: "school",
  projects: "name",
  skills: "name",
  languages: "language",
  interests: "name",
  awards: "title",
  certifications: "title",
  publications: "title",
  volunteer: "organization",
  references: "name",
} as const;

type SectionKey = keyof typeof sectionRequiredFieldMap;

function normalizeResumeDataForSchema(data: Record<string, unknown>) {
  if (!isObject(data)) return data;
  if (!isObject(data.sections)) return data;

  const normalizedSections: Record<string, unknown> = { ...data.sections };

  for (const sectionKey of Object.keys(sectionRequiredFieldMap) as SectionKey[]) {
    const section = normalizedSections[sectionKey];
    if (!isObject(section)) continue;
    if (!Array.isArray(section.items)) continue;

    const itemTemplate = aiExtractionTemplate.sections[sectionKey].items[0] as Record<string, unknown>;
    const requiredField = sectionRequiredFieldMap[sectionKey];

    const normalizedItems = section.items
      .filter((item): item is Record<string, unknown> => isObject(item))
      .map((item) => mergeDefaults(itemTemplate, item))
      .filter((item) => {
        const requiredValue = item[requiredField];
        if (typeof requiredValue !== "string") return false;
        return requiredValue.trim().length > 0;
      })
      .map((item) => {
        const normalizedItem = { ...item };
        if (typeof normalizedItem.id !== "string" || normalizedItem.id.trim().length === 0) {
          normalizedItem.id = crypto.randomUUID();
        }
        if (typeof normalizedItem.hidden !== "boolean") {
          normalizedItem.hidden = false;
        }
        return normalizedItem;
      });

    normalizedSections[sectionKey] = { ...section, items: normalizedItems };
  }

  return { ...data, sections: normalizedSections };
}

type GetModelInput = {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseURL?: string;
};

const MAX_AI_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_AI_FILE_BASE64_CHARS = Math.ceil((MAX_AI_FILE_BYTES * 4) / 3) + 4;
const adminAllowedBaseUrls = parseAllowedHostList(env.AI_ALLOWED_BASE_URLS);
const defaultProviderHosts: Record<AIProvider, string[]> = {
  openai: ["api.openai.com"],
  anthropic: ["api.anthropic.com"],
  gemini: ["generativelanguage.googleapis.com"],
  "vercel-ai-gateway": ["ai-gateway.vercel.sh"],
  openrouter: ["openrouter.ai"],
  ollama: ["ollama.com"],
};

function resolveBaseUrl(input: GetModelInput): string {
  const baseURL = input.baseURL?.trim() || AI_PROVIDER_DEFAULT_BASE_URLS[input.provider];

  if (!baseURL) throw new Error("INVALID_AI_BASE_URL");

  const providerHosts = defaultProviderHosts[input.provider];
  const allowedHosts = new Set([...providerHosts, ...adminAllowedBaseUrls]);
  if (!isAllowedExternalUrl(baseURL, allowedHosts)) {
    throw new Error("INVALID_AI_BASE_URL");
  }

  return baseURL;
}

function getModel(input: GetModelInput): LanguageModel {
  const { provider, model, apiKey } = input;
  const resolvedUrl = resolveBaseUrl(input);

  logAiDebug(
    "getModel",
    JSON.stringify({
      provider,
      model,
      baseURL: resolvedUrl,
      hasCustomBaseURL: Boolean(input.baseURL?.trim()),
      hasApiKey: Boolean(apiKey?.trim()),
      apiKeyLength: apiKey?.length ?? 0,
    }),
  );

  // Get provider adapter (throws if not registered)
  const adapter = getProviderAdapter(provider);

  // Create model using the adapter
  return adapter.createModel(model, apiKey, resolvedUrl);
}

export const aiCredentialsSchema = z.object({
  provider: aiProviderSchema,
  model: z.string().trim().min(1, "Model is required."),
  apiKey: z.string().trim().min(1, "API key is required."),
  baseURL: z.string().optional().default(""),
});

export const fileInputSchema = z.object({
  name: z.string(),
  data: z.string().max(MAX_AI_FILE_BASE64_CHARS, "File is too large. Maximum size is 10MB."), // base64 encoded
});

type TestConnectionInput = z.infer<typeof aiCredentialsSchema>;

async function testConnection(input: TestConnectionInput): Promise<boolean> {
  try {
    const { provider } = input;

    if (isCircuitOpen(provider)) {
      logAiDebug("testConnection: circuit open", provider);
      return false;
    }

    const result = await withRetry("testConnection", provider, input.model, async () => {
      const model = getModel(input);
      return generateText({
        model,
        messages: [{ role: "user", content: "Respond with OK" }],
        maxOutputTokens: 5,
      });
    });

    recordSuccess(provider);
    return result.text.trim().length > 0;
  } catch (error) {
    const { provider } = input;
    recordFailure(provider);
    logAiError("testConnection failed", error);
    return false;
  }
}

type ParsePdfInput = z.infer<typeof aiCredentialsSchema> & {
  file: z.infer<typeof fileInputSchema>;
};

type BuildResumeParsingMessagesInput = {
  systemPrompt: string;
  userPrompt: string;
  file: z.infer<typeof fileInputSchema>;
  mediaType: string;
};

function buildResumeParsingMessages({
  systemPrompt,
  userPrompt,
  file,
  mediaType,
}: BuildResumeParsingMessagesInput): ModelMessage[] {
  return [
    {
      role: "system",
      content:
        systemPrompt +
        "\n\nIMPORTANT: You must return ONLY raw valid JSON. Do not return markdown, do not return explanations. Just the JSON object. Use the following JSON as a template and fill in the extracted values. For arrays, you MUST use the exact key names shown in the template (e.g. use 'description' instead of 'summary', 'website' instead of 'url'):\n\n" +
        JSON.stringify(aiExtractionTemplate, null, 2),
    },
    {
      role: "user",
      content: [
        { type: "text", text: userPrompt },
        { type: "file", data: file.data, mediaType, filename: file.name },
      ],
    },
  ];
}

async function parsePdf(input: ParsePdfInput): Promise<ResumeData> {
  const { provider } = input;
  const model = getModel(input);

  return withRetry("parsePdf", provider, input.model, async () => {
    const result = await generateText({
      model,
      messages: buildResumeParsingMessages({
        systemPrompt: pdfParserSystemPrompt,
        userPrompt: pdfParserUserPrompt,
        file: input.file,
        mediaType: "application/pdf",
      }),
    });
    recordSuccess(provider);
    return parseAndValidateResumeJson(result.text);
  }).catch((error: unknown) => {
    recordFailure(provider);
    return logAndRethrow("Failed to parse PDF with AI", error);
  });
}

type ParseDocxInput = z.infer<typeof aiCredentialsSchema> & {
  file: z.infer<typeof fileInputSchema>;
  mediaType: "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

async function parseDocx(input: ParseDocxInput): Promise<ResumeData> {
  const { provider } = input;
  const model = getModel(input);

  return withRetry("parseDocx", provider, input.model, async () => {
    const result = await generateText({
      model,
      messages: buildResumeParsingMessages({
        systemPrompt: docxParserSystemPrompt,
        userPrompt: docxParserUserPrompt,
        file: input.file,
        mediaType: input.mediaType,
      }),
    });
    recordSuccess(provider);
    return parseAndValidateResumeJson(result.text);
  }).catch((error: unknown) => {
    recordFailure(provider);
    return logAndRethrow("Failed to parse DOCX with AI", error);
  });
}

function buildChatSystemPrompt(resumeData: ResumeData): string {
  return chatSystemPromptTemplate.replace("{{RESUME_DATA}}", JSON.stringify(resumeData, null, 2));
}

type SuggestionInput = z.infer<typeof aiCredentialsSchema> & {
  resumeData: ResumeData;
  prompt: string;
  /** When provided, applies the change locally instead of calling the AI */
  affectedPaths?: string[];
  exampleRewrite?: string;
};

type ChatInput = z.infer<typeof aiCredentialsSchema> & {
  messages: UIMessage[];
  resumeData: ResumeData;
};

async function chat(input: ChatInput) {
  const { provider } = input;

  if (isCircuitOpen(provider)) {
    throw new Error(`CIRCUIT_BREAKER_OPEN:${provider}`);
  }

  const model = getModel(input);
  const systemPrompt = buildChatSystemPrompt(input.resumeData);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(input.messages),
    tools: {
      patch_resume: tool({
        description: patchResumeDescription,
        inputSchema: patchResumeInputSchema,
        execute: async ({ operations }) => executePatchResume(input.resumeData, operations),
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return streamToEventIterator(result.toUIMessageStream());
}

type SuggestionOutput = {
  resumeData: ResumeData;
  operations: Array<Record<string, any>>;
  previews?: Array<{ path: string; label: string; before: string; after: string }>;
};

function limitSkillVisibilityOperations(operations: Operation[], resumeData: ResumeData): Operation[] {
  const skillsItems = resumeData.sections.skills.items;
  const currentlyVisibleCount = skillsItems.filter((item) => !item.hidden).length;

  const visibilityOps = operations.filter(
    (op) =>
      op.op === "replace" &&
      /^\/sections\/skills\/items\/\d+\/hidden$/.test(op.path) &&
      typeof op.value === "boolean",
  );

  if (visibilityOps.length === 0) return operations;

  const nonVisibilityOps = operations.filter(
    (op) =>
      !(op.op === "replace" &&
      /^\/sections\/skills\/items\/\d+\/hidden$/.test(op.path) &&
      typeof op.value === "boolean"),
  );

  const toVisible = visibilityOps.filter((op) => op.op === "replace" && op.value === false);
  const toHidden = visibilityOps.filter((op) => op.op === "replace" && op.value === true);

  const targetMaxVisible = 12;
  const allowedToVisible = Math.max(0, targetMaxVisible - currentlyVisibleCount + toHidden.length);

  if (toVisible.length <= allowedToVisible) return operations;

  const limited = [...nonVisibilityOps, ...toHidden, ...toVisible.slice(0, allowedToVisible)];

  logAiDebug(
    "applySuggestion skills visibility limited",
    JSON.stringify({
      currentlyVisibleCount,
      requestedToVisible: toVisible.length,
      requestedToHidden: toHidden.length,
      allowedToVisible,
      finalOperationCount: limited.length,
    }),
  );

  return limited;
}

/**
 * Strips verbose/non-essential fields from resume data before sending to AI
 * to reduce token count and speed up responses.
 * Uses type assertion since we're intentionally pruning fields.
 */
function trimResumeForAi(resume: ResumeData): ResumeData {
  const trimmed = JSON.parse(JSON.stringify(resume)) as Record<string, unknown>;

  // Strip picture data (base64 images are very large)
  if (trimmed.picture && typeof trimmed.picture === "object") {
    (trimmed.picture as Record<string, unknown>).url = "";
  }

  // Reduce metadata to essentials
  if (trimmed.metadata && typeof trimmed.metadata === "object") {
    const meta = trimmed.metadata as Record<string, unknown>;
    const page = meta.page as Record<string, unknown> | undefined;
    meta.page = page ? { format: page.format } : {};
    delete meta.theme;
    delete meta.notes;
  }

  // Keep section structure but prune hidden items
  if (trimmed.sections && typeof trimmed.sections === "object") {
    const sections = trimmed.sections as Record<string, unknown>;
    for (const sectionKey of Object.keys(sections)) {
      const section = sections[sectionKey] as Record<string, unknown> | undefined;
      if (section && Array.isArray(section.items)) {
        section.items = (section.items as Record<string, unknown>[]).map((item) => {
          if (item.hidden === true) {
            // Keep only id for hidden items
            return { id: item.id, hidden: true };
          }
          return item;
        });
      }
    }
  }

  return trimmed as ResumeData;
}

async function applySuggestion(input: SuggestionInput): Promise<SuggestionOutput> {
  const { provider } = input;
  const resumeCopy = JSON.parse(JSON.stringify(input.resumeData)) as ResumeData;

  // --- Local apply: if affectedPaths + exampleRewrite provided, skip AI call entirely ---
  if (input.affectedPaths && input.affectedPaths.length > 0 && input.exampleRewrite) {
    const operations: Operation[] = input.affectedPaths.map((path) => ({
      op: "replace",
      path,
      value: input.exampleRewrite,
    }));

    const patched = applyResumePatches(resumeCopy, operations);
    const previews = generateOperationPreviews(input.resumeData, operations);

    logAiDebug("applySuggestion local", `${operations.length} ops applied locally`);

    return {
      resumeData: patched,
      operations,
      previews,
    };
  }

  // --- AI-based apply (fallback) ---
  const model = getModel(input);
  const trimmedResume = trimResumeForAi(input.resumeData);

  const systemPrompt = "You are a resume editing assistant. Return ONLY JSON Patch (RFC 6902) operations to apply the user's requested change. Do not include markdown, explanations, or code fences. Return an array of patch operations in this format: [{ op: \"replace\", path: \"/sections/experience/items/0/description\", value: \"...\" }]. Prefer 'replace' for updates. Use '-' to append to arrays. When editing the skills section for ATS optimisation, do NOT unhide every skill. Keep the final visible skills list focused and selective, usually 8 to 12 of the most relevant, specific, non-duplicative skills. If you unhide skills, also hide weaker or redundant ones when needed so the final visible set stays concise.";

  return withRetry("applySuggestion", provider, input.model, async () => {
    return generateText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: input.prompt + "\n\nReturn JSON Patch (RFC 6902) operations for this resume data (some non-essential fields have been trimmed):\n\n" + JSON.stringify(trimmedResume, null, 2),
        },
      ],
      maxOutputTokens: 4096,
    });
  })
    .then((result) => {
      if (!result.text) {
        logAiError("applySuggestion", new Error("Empty AI response"));
        throw new Error("AI returned no suggestion output.");
      }

      logAiDebug("applySuggestion raw", result.text.substring(0, 4000));

      try {
        const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = match ? match[1].trim() : result.text.trim();
        let operations: Array<Record<string, unknown>>;

        try {
          operations = JSON.parse(jsonStr);
        } catch {
          operations = JSON.parse(jsonrepair(jsonStr));
        }

        if (!Array.isArray(operations)) {
          throw new Error("AI did not return an array of patch operations");
        }

        const validated = patchResumeInputSchema.parse({ operations });
        const limitedOperations = limitSkillVisibilityOperations(validated.operations as Operation[], input.resumeData);
        const patched = applyResumePatches(resumeCopy, limitedOperations);
        recordSuccess(provider);
        logAiDebug("applySuggestion done", limitedOperations.length + " ops applied, headline: " + (patched.basics?.headline || "none"));

        // Generate previews for the operations
        const previews = generateOperationPreviews(input.resumeData, limitedOperations);

        return {
          resumeData: patched,
          operations: limitedOperations,
          previews,
        };
      } catch (error) {
        logAiError("applySuggestion", error, result.text);
        throw new ORPCError("BAD_REQUEST", {
          message: "The AI returned an invalid suggestion format. Please try again.",
        });
      }
    })
    .catch((error) => {
      recordFailure(provider);
      throw error;
    });
}

function formatJobHighlights(highlights: Record<string, string[]> | null): string {
  if (!highlights) return "None provided.";
  return Object.entries(highlights)
    .map(([key, values]) => `${key}:\n${values.map((v) => `- ${v}`).join("\n")}`)
    .join("\n\n");
}

function buildTailorSystemPrompt(resumeData: ResumeData, job: JobResult): string {
  const jobContext = `## Job Context
- Title: ${job.job_title}
- Employer: ${job.employer_name}
- URL: ${job.job_apply_link || "N/A"}
Always tailor your analysis, suggestions, and cover letter to this specific role.

`;
  return jobContext + tailorSystemPromptTemplate
    .replace("{{MASTER_CAREER_DATA}}", masterCareerData)
    .replace("{{RESUME_DATA}}", JSON.stringify(resumeData, null, 2))
    .replace("{{JOB_TITLE}}", job.job_title)
    .replace("{{COMPANY}}", job.employer_name)
    .replace("{{JOB_DESCRIPTION}}", job.job_description || "No description provided.")
    .replace("{{JOB_HIGHLIGHTS}}", formatJobHighlights(job.job_highlights))
    .replace("{{JOB_SKILLS}}", (job.job_required_skills || []).join(", ") || "None specified.");
}

type TailorResumeInput = z.infer<typeof aiCredentialsSchema> & {
  resumeData: ResumeData;
  job: JobResult;
};

type AnalyzeResumeInput = z.infer<typeof aiCredentialsSchema> & {
  resumeData: ResumeData;
  job?: JobResult;
};

function buildAnalyzeResumeSystemPrompt(resumeData: ResumeData, job?: JobResult): string {
  // Strip hidden items so the AI literally cannot see them
  const sanitized = stripHiddenItems(resumeData as never) as ResumeData;

  return analyzeResumeSystemPromptTemplate
    .replace("{{MASTER_CAREER_DATA}}", masterCareerData)
    .replace("{{RESUME_DATA}}", JSON.stringify(sanitized, null, 2))
    .replace("{{JOB_TITLE}}", job?.job_title || "")
    .replace("{{JOB_EMPLOYER}}", job?.employer_name || "")
    .replace("{{JOB_URL}}", job?.job_apply_link || "")
    .replace("{{JOB_DESCRIPTION}}", job?.job_description || "");
}

async function analyzeResume(input: AnalyzeResumeInput): Promise<ResumeAnalysis> {
  const { provider } = input;
  const model = getModel(input);
  const systemPrompt = buildAnalyzeResumeSystemPrompt(
    input.resumeData,
    input.job,
  );

  logAiDebug(
    "analyzeResume request",
    JSON.stringify({
      provider,
      model: input.model,
      systemPromptLength: systemPrompt.length,
      resumeBytes: JSON.stringify(input.resumeData).length,
      hasJob: Boolean(input.job),

    }),
  );

  return withRetry("analyzeResume", provider, input.model, async () => {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content:
            "Analyze this resume and return a structured report with scorecard, overall score, strengths, and actionable suggestions. Return ONLY valid JSON. Do not include markdown, explanations, or code fences.",
        },
      ],
      maxOutputTokens: 8192,
    });
    recordSuccess(provider);
    return result;
  })
    .then((result) => {
      if (!result.text) {
        logAiError("analyzeResume", new Error("Empty AI response"));
        throw new Error("AI returned no structured analysis output.");
      }

      logAiDebug("analyzeResume raw", result.text.substring(0, 8000));

      try {
        const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = match ? match[1].trim() : result.text.trim();
        let output: unknown;

        try {
          output = JSON.parse(jsonStr);
        } catch {
          output = JSON.parse(jsonrepair(jsonStr));
        }

        logAiOutputParsing("analyzeResume", true, JSON.stringify(output));

        const normalizedOutput = normalizeAnalysisOutput(output);

        logAiOutputParsing(
          "analyzeResume normalized",
          true,
          JSON.stringify(normalizedOutput, null, 2),
        );

        // Attempt full parse; degrade gracefully on partial failure
        return safeParseAnalysisResult(normalizedOutput as Record<string, unknown>);
      } catch (error) {
        logAiError("analyzeResume", error, result.text);
        throw new ORPCError("BAD_REQUEST", {
          message: "The AI returned an invalid analysis format. Please try again.",
        });
      }

      function normalizeAnalysisOutput(output: unknown): unknown {
        if (!output || typeof output !== "object" || Array.isArray(output)) {
          return output;
        }

        const obj = output as Record<string, unknown>;

        // --- Top-level coercions ---

        // Inject analysisVersion if missing
        if (!("analysisVersion" in obj)) {
          obj.analysisVersion = 1;
        }

        // Coerce overallScore: handle string numbers and floats
        if ("overallScore" in obj) {
          obj.overallScore = coerceScore(obj.overallScore);
        }

        // --- Scorecard coercions ---
        if (Array.isArray(obj.scorecard)) {
          obj.scorecard = obj.scorecard.map((d: unknown) => {
            if (!d || typeof d !== "object") return d;
            const dim = d as Record<string, unknown>;
            if ("score" in dim) dim.score = coerceScore(dim.score);
            return dim;
          });
        }

        // --- Suggestions normalization ---
        if (Array.isArray(obj.suggestions)) {
          obj.suggestions = obj.suggestions.map((s) => {
            if (!s || typeof s !== "object") return s;
            const sug = s as Record<string, unknown>;

            // Coerce impact to lowercase enum
            if (typeof sug.impact === "string") {
              sug.impact = sug.impact.toLowerCase();
            }

            // affectedPaths: string → array
            if (typeof sug.affectedPaths === "string") {
              sug.affectedPaths = [sug.affectedPaths];
            }

            // exampleRewrite: object → string
            if (sug.exampleRewrite && typeof sug.exampleRewrite === "object") {
              const rewrite = sug.exampleRewrite as Record<string, unknown>;
              if (typeof rewrite.after === "string") {
                sug.exampleRewrite = rewrite.after;
              } else if (typeof rewrite.rewrite === "string") {
                sug.exampleRewrite = rewrite.rewrite;
              } else if (typeof rewrite.example === "string") {
                sug.exampleRewrite = rewrite.example;
              } else {
                sug.exampleRewrite = JSON.stringify(rewrite);
              }
            }

            // Fill missing optional fields with undefined (Zod treats as absent)
            const optionalFields = ["evidence", "priority", "effort", "category", "affectedPaths", "beforePreview", "afterPreview"] as const;
            for (const field of optionalFields) {
              if (!(field in sug)) sug[field] = undefined;
            }

            // Priority/effort lowercase
            if (typeof sug.priority === "string") sug.priority = sug.priority.toLowerCase();
            if (typeof sug.effort === "string") sug.effort = sug.effort.toLowerCase();

            return sug;
          });
        }

        // --- Strengths: filter empty strings ---
        if (Array.isArray(obj.strengths)) {
          obj.strengths = (obj.strengths as unknown[]).filter(
            (s): s is string => typeof s === "string" && s.trim().length > 0,
          );
        }

        // Filter out any suggestions missing required fields (title, impact, why, copyPrompt)
        if (Array.isArray(obj.suggestions)) {
          obj.suggestions = (obj.suggestions as Record<string, unknown>[]).filter(
            (s) =>
              s &&
              typeof s.title === "string" &&
              s.title.trim().length > 0 &&
              typeof s.why === "string" &&
              s.why.trim().length > 0 &&
              typeof s.copyPrompt === "string" &&
              s.copyPrompt.trim().length > 0,
          );
        }

        // Filter out scorecard dimensions with empty dimension name
        if (Array.isArray(obj.scorecard)) {
          obj.scorecard = (obj.scorecard as Record<string, unknown>[]).filter(
            (d) => d && typeof d.dimension === "string" && d.dimension.trim().length > 0,
          );
        }

        // --- ATS compatibility normalization ---
        if (!("atsCompatibility" in obj)) {
          obj.atsCompatibility = undefined;
        } else if (obj.atsCompatibility && typeof obj.atsCompatibility === "object" && !Array.isArray(obj.atsCompatibility)) {
          const ats = obj.atsCompatibility as Record<string, unknown>;

          // Coerce ats.overallScore
          if ("overallScore" in ats) ats.overallScore = coerceScore(ats.overallScore);

          // Dimensions: object map → array
          if (ats.dimensions && typeof ats.dimensions === "object" && !Array.isArray(ats.dimensions)) {
            ats.dimensions = Object.entries(ats.dimensions as Record<string, unknown>).map(([dimension, value]) => {
              if (value && typeof value === "object" && !Array.isArray(value)) {
                return { dimension, ...(value as Record<string, unknown>) };
              }

              const score = typeof value === "number" ? value : Number(value);
              return {
                dimension,
                score: Number.isNaN(score) ? 0 : score,
              };
            });
          }

          // Coerce dimension scores inside ats dimensions
          if (Array.isArray(ats.dimensions)) {
            ats.dimensions = (ats.dimensions as Record<string, unknown>[]).map((dim) => {
              if ("score" in dim) dim.score = coerceScore(dim.score);
              return dim;
            });
          }
        }

        return obj;
      }

      /**
       * Attempt a full Zod parse; on failure, degrade gracefully by extracting
       * whatever valid fields are available and returning a partial result.
       * The caller (router) is responsible for setting the `degraded` flag on the
       * stored analysis when the returned object lacks the canonical shape.
       */
      function safeParseAnalysisResult(
        raw: Record<string, unknown>,
      ): ResumeAnalysis {
        // 1. Try full parse first
        const full = resumeAnalysisSchema.safeParse(raw);
        if (full.success) {
          return full.data;
        }

        logAiError(
          "analyzeResume zod failure — degrading",
          full.error,
          JSON.stringify(raw, null, 2),
          { zodError: flattenError(full.error) },
        );

        // 2. Salvage what we can, field by field
        const partial: Record<string, unknown> = {
          analysisVersion: 1,
        };

        // overallScore
        const scoreResult = z.coerce.number().int().min(0).max(100).safeParse(raw.overallScore);
        partial.overallScore = scoreResult.success ? scoreResult.data : 0;

        // scorecard (must be at least 1 entry for the schema)
        const scorecardResult = z
          .array(analysisDimensionSchema)
          .min(1)
          .safeParse(raw.scorecard);
        partial.scorecard = scorecardResult.success
          ? scorecardResult.data
          : [
              {
                dimension: "General Assessment",
                score: partial.overallScore as number,
                rationale:
                  "The AI returned an incomplete analysis. Overall score shown above could not be broken down by dimension.",
              },
            ];

        // suggestions
        const suggestionsResult = z
          .array(analysisSuggestionSchema)
          .max(10)
          .safeParse(raw.suggestions);
        partial.suggestions = suggestionsResult.success ? suggestionsResult.data : [];

        // strengths
        const strengthsResult = z
          .array(z.string().min(1))
          .max(10)
          .safeParse(raw.strengths);
        partial.strengths = strengthsResult.success ? strengthsResult.data : [];

        // atsCompatibility (optional — graceful if missing or malformed)
        if (raw.atsCompatibility !== undefined) {
          const atsResult = atsCompatibilitySchema.safeParse(raw.atsCompatibility);
          if (atsResult.success) {
            partial.atsCompatibility = atsResult.data;
          }
        }

        logAiDebug(
          "analyzeResume degraded result",
          JSON.stringify({
            hadOverallScore: scoreResult.success,
            hadScorecard: scorecardResult.success,
            hadSuggestions: suggestionsResult.success,
            hadStrengths: strengthsResult.success,
            hadAtsCompatibility: "atsCompatibility" in partial,
          }),
        );

        // Final re-parse — should always succeed since we built defensively
        return resumeAnalysisSchema.parse(partial);
      }
    })
    .catch((error) => {
      recordFailure(provider);
      throw error;
    });
}

async function tailorResume(input: TailorResumeInput): Promise<TailorOutput> {
  const { provider } = input;
  const model = getModel(input);
  const systemPrompt = buildTailorSystemPrompt(input.resumeData, input.job);

  return withRetry("tailorResume", provider, input.model, async () => {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Please tailor this resume for the ${input.job.job_title} position at ${input.job.employer_name}. Optimize for ATS compatibility and relevance. Return ONLY valid JSON with exactly these top-level keys: summary, experiences, references, skills. Do not return the full resume object. Do not include markdown, explanations, or code fences.`,
        },
      ],
      maxOutputTokens: 8192,
    });
    recordSuccess(provider);
    return result;
  })
    .then((result) => {
      if (!result.text) {
        logAiError("tailorResume", new Error("AI returned no tailoring output."));
        throw new Error("AI returned no tailoring output.");
      }

      logAiDebug("tailorResume raw", result.text.substring(0, 8000));
      const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = match ? match[1].trim() : result.text.trim();
      let output: unknown;

      try {
        output = JSON.parse(jsonStr);
      } catch {
        output = JSON.parse(jsonrepair(jsonStr));
      }

      try {
        return tailorOutputSchema.parse(output);
      } catch (schemaError) {
        const data = output as Record<string, unknown>;

        const originalExperienceItems = input.resumeData.sections.experience.items;
        const originalReferenceItems = input.resumeData.sections.references.items;
        const experienceIndexById = new Map(originalExperienceItems.map((item, index) => [item.id, index]));
        const referenceIndexById = new Map(originalReferenceItems.map((item, index) => [item.id, index]));

        const topExperiences = data.experiences as Array<Record<string, unknown>> | undefined;
        const topReferences = data.references as Array<Record<string, unknown>> | undefined;
        const topSkills = data.skills as Array<Record<string, unknown>> | undefined;

        // Shape often returned by OpenRouter text mode: { summary: string, experiences: [{ id, description }], skills: [{ name, keywords }] }
        if (typeof data.summary === "string" || Array.isArray(topExperiences) || Array.isArray(topSkills)) {
          const normalized = {
            summary: {
              content:
                typeof data.summary === "string"
                  ? data.summary
                  : typeof (data.summary as Record<string, unknown> | undefined)?.content === "string"
                    ? ((data.summary as Record<string, unknown>).content as string)
                    : "",
            },
            experiences: Array.isArray(topExperiences)
              ? topExperiences.map((item, arrayIndex) => ({
                  index:
                    typeof item.index === "number"
                      ? item.index
                      : typeof item.id === "string" && experienceIndexById.has(item.id)
                        ? (experienceIndexById.get(item.id) as number)
                        : arrayIndex,
                  description: typeof item.description === "string" ? item.description : "",
                  position: typeof item.position === "string" ? item.position : undefined,
                  roles: Array.isArray(item.roles)
                    ? (item.roles as Array<Record<string, unknown>>).map((role, roleIndex) => ({
                        index: typeof role.index === "number" ? role.index : roleIndex,
                        description: typeof role.description === "string" ? role.description : "",
                      }))
                    : [],
                }))
              : [],
            references: Array.isArray(topReferences)
              ? topReferences.map((item, arrayIndex) => ({
                  index:
                    typeof item.index === "number"
                      ? item.index
                      : typeof item.id === "string" && referenceIndexById.has(item.id)
                        ? (referenceIndexById.get(item.id) as number)
                        : arrayIndex,
                  description: typeof item.description === "string" ? item.description : "",
                }))
              : [],
            skills: Array.isArray(topSkills)
              ? topSkills.map((item) => ({
                  name: typeof item.name === "string" && item.name.trim() ? item.name : "Relevant Skills",
                  keywords: Array.isArray(item.keywords)
                    ? (item.keywords as unknown[]).filter((keyword): keyword is string => typeof keyword === "string")
                    : [],
                  proficiency: typeof item.proficiency === "string" ? item.proficiency : "",
                  icon: typeof item.icon === "string" ? item.icon : "",
                  isNew: typeof item.isNew === "boolean" ? item.isNew : false,
                }))
              : [],
          };

          logAiDebug(
            "tailorResume normalized compact output",
            JSON.stringify({
              experiences: normalized.experiences.length,
              references: normalized.references.length,
              skills: normalized.skills.length,
              originalKeys: Object.keys(data),
            }),
          );

          return tailorOutputSchema.parse(normalized);
        }

        // Fallback shape: full Reactive Resume object returned by the model.
        const sections = data.sections as Record<string, unknown> | undefined;
        const experienceSection = sections?.experience as Record<string, unknown> | undefined;
        const referenceSection = sections?.references as Record<string, unknown> | undefined;
        const skillsSection = sections?.skills as Record<string, unknown> | undefined;

        const experienceItems = experienceSection?.items as Array<Record<string, unknown>> | undefined;
        const referenceItems = referenceSection?.items as Array<Record<string, unknown>> | undefined;
        const skillItems = skillsSection?.items as Array<Record<string, unknown>> | undefined;
        const summary = data.summary as Record<string, unknown> | undefined;

        const extracted = {
          summary: {
            content: typeof summary?.content === "string" ? summary.content : "",
          },
          experiences: Array.isArray(experienceItems)
            ? experienceItems.map((item, index) => ({
                index,
                description: typeof item.description === "string" ? item.description : "",
                position: typeof item.position === "string" ? item.position : undefined,
                roles: Array.isArray(item.roles)
                  ? (item.roles as Array<Record<string, unknown>>).map((role, roleIndex) => ({
                      index: roleIndex,
                      description: typeof role.description === "string" ? role.description : "",
                    }))
                  : [],
              }))
            : [],
          references: Array.isArray(referenceItems)
            ? referenceItems.map((item, index) => ({
                index,
                description: typeof item.description === "string" ? item.description : "",
              }))
            : [],
          skills: Array.isArray(skillItems)
            ? skillItems
                .filter((item) => item && item.hidden !== true)
                .map((item) => ({
                  name: typeof item.name === "string" && item.name.trim() ? item.name : "Relevant Skills",
                  keywords: Array.isArray(item.keywords)
                    ? (item.keywords as unknown[]).filter((keyword): keyword is string => typeof keyword === "string")
                    : [],
                  proficiency: typeof item.proficiency === "string" ? item.proficiency : "",
                  icon: typeof item.icon === "string" ? item.icon : "",
                  isNew: false,
                }))
            : [],
        };

        logAiDebug(
          "tailorResume extracted full resume",
          JSON.stringify({
            experiences: extracted.experiences.length,
            references: extracted.references.length,
            skills: extracted.skills.length,
            originalKeys: Object.keys(data),
          }),
        );

        try {
          return tailorOutputSchema.parse(extracted);
        } catch {
          throw schemaError;
        }
      }
    })
    .catch((error) => {
      recordFailure(provider);
      throw error;
    });
}type GenerateCoverLetterInput = z.infer<typeof aiCredentialsSchema> & {
  resumeData: ResumeData;
  job?: JobResult;
  target?: CoverLetterTarget;
  tone: CoverLetterTone;
  additionalInstructions?: string;
};

async function generateCoverLetter(input: GenerateCoverLetterInput): Promise<CoverLetter> {
  const { provider } = input;
  const model = getModel(input);

  const jobTitle = input.job?.job_title || input.target?.jobTitle || "";
  const employerName = input.job?.employer_name || input.target?.employerName || "";
  const hiringManager = input.target?.hiringManager || "";
  const jobDescription = input.job?.job_description || input.target?.jobDescription || "";

  const systemPrompt = `You are an expert cover letter writer. Generate a truthful, job-targeted cover letter based on the provided resume data and job details.

Tone: ${input.tone}
Job Title: ${jobTitle}
Employer: ${employerName}
Hiring Manager: ${hiringManager}
${input.additionalInstructions ? `Additional Instructions: ${input.additionalInstructions}` : ""}

Return ONLY valid JSON with these exact keys: recipient (HTML), content (HTML), plainText, wordCount, tone.
- recipient: Address block as HTML with <p> and <br /> tags only
- content: Cover letter body as HTML with <p>, <br />, and <strong> tags only
- plainText: Plain text version of the body
- wordCount: Integer word count
- tone: Must match the requested tone`;

  return withRetry("generateCoverLetter", provider, input.model, async () => {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Write a cover letter for this position: ${jobTitle} at ${employerName}\n\nJob Description:\n${jobDescription}\n\nBased on this resume:\n\n${JSON.stringify(input.resumeData, null, 2)}`,
        },
      ],
    });
    recordSuccess(provider);
    return result;
  })
    .then((result) => {
      if (!result.text) {
        logAiError("generateCoverLetter", new Error("AI returned no cover letter content."));
        throw new Error("AI returned no cover letter content.");
      }

      logAiDebug("generateCoverLetter raw", result.text.substring(0, 4000));

      try {
        const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = match ? match[1].trim() : result.text.trim();
        let output: unknown;

        try {
          output = JSON.parse(jsonStr);
        } catch {
          output = JSON.parse(jsonrepair(jsonStr));
        }

        return coverLetterSchema.parse(output);
      } catch (error) {
        logAiError("generateCoverLetter", error, result.text);
        throw new ORPCError("BAD_REQUEST", {
          message: "The AI returned an invalid cover letter format.",
        });
      }
    })
    .catch((error) => {
      recordFailure(provider);
      throw error;
    });
}

type PrepareForInterviewInput = z.infer<typeof aiCredentialsSchema> & {
  resumeData: ResumeData;
  jobData?: JobResult;
  focusAreas?: string[];
};

async function prepareForInterview(input: PrepareForInterviewInput): Promise<InterviewPreparation> {
  const { provider } = input;
  const model = getModel(input);

  const systemPrompt = `You are an interview preparation specialist. Generate interview questions and preparation materials based on the resume and job description.

${input.focusAreas?.length ? `Focus Areas: ${input.focusAreas.join(", ")}` : ""}

Return ONLY valid JSON with these exact keys: questions (array), overview, preparationGuide, generatedAt.
Structure each question with: id, category, question, difficulty, explanation, suggestedAnswerFramework, relatedSkills, preparationTips, evidenceMap.
- categories: technical, behavioral, situational, company, delivery, stakeholder, contractor-fit
- difficulties: easy, medium, hard`;

  return withRetry("prepareForInterview", provider, input.model, async () => {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Generate interview preparation materials for this position: ${input.jobData?.job_title || "General"}\n\n${input.jobData?.job_description ? `Job Description:\n${input.jobData.job_description}\n\n` : ""}Based on this resume:\n\n${JSON.stringify(input.resumeData, null, 2)}`,
        },
      ],
    });
    recordSuccess(provider);
    return result;
  })
    .then((result) => {
      if (!result.text) {
        logAiError("prepareForInterview", new Error("AI returned no interview preparation content."));
        throw new Error("AI returned no interview preparation content.");
      }

      logAiDebug("prepareForInterview raw", result.text.substring(0, 4000));

      try {
        const match = result.text.match(/```(?:json)?\s*([\s\S]*?)```/);
        const jsonStr = match ? match[1].trim() : result.text.trim();
        let output: unknown;

        try {
          output = JSON.parse(jsonStr);
        } catch {
          output = JSON.parse(jsonrepair(jsonStr));
        }

        return interviewPreparationSchema.parse(output);
      } catch (error) {
        logAiError("prepareForInterview", error, result.text);
        throw new ORPCError("BAD_REQUEST", {
          message: "The AI returned an invalid interview preparation format.",
        });
      }
    })
    .catch((error) => {
      recordFailure(provider);
      throw error;
    });
}

export const aiService = {
  analyzeResume,
  applySuggestion,
  chat,
  generateCoverLetter,
  parseDocx,
  parsePdf,
  prepareForInterview,
  tailorResume,
  testConnection,
};
