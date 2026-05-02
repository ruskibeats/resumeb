import type { ModelMessage } from "ai";

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ORPCError, streamToEventIterator } from "@orpc/server";
import { logAiError, logAiDebug } from "@/utils/ai-logger";
import {
  convertToModelMessages,
  createGateway,
  generateText,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { jsonrepair } from "jsonrepair";
import { createOllama } from "ollama-ai-provider-v2";
import { match } from "ts-pattern";
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
import { applyResumePatches } from "@/utils/resume/patch";
import { AI_PROVIDER_DEFAULT_BASE_URLS, aiProviderSchema, type AIProvider } from "@/integrations/ai/types";
import { coverLetterSchema, type CoverLetter, type CoverLetterTarget, type CoverLetterTone } from "@/schema/cover-letter";
import { interviewPreparationSchema, type InterviewPreparation } from "@/schema/interview-prep";
import { resumeAnalysisSchema, type ResumeAnalysis } from "@/schema/resume/analysis";
import { defaultResumeData, resumeDataSchema } from "@/schema/resume/data";
import { tailorOutputSchema, type TailorOutput } from "@/schema/tailor";
import { buildAiExtractionTemplate } from "@/utils/ai-template";
import { env } from "@/utils/env";
import { isObject } from "@/utils/sanitize";
import { isAllowedExternalUrl, parseAllowedHostList } from "@/utils/url-security";

const aiExtractionTemplate = buildAiExtractionTemplate();

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

function getModel(input: GetModelInput) {
  const { provider, model, apiKey } = input;
  const baseURL = resolveBaseUrl(input);

  return match(provider)
    .with("openai", () => createOpenAI({ apiKey, baseURL }).chat(model))
    .with("anthropic", () => createAnthropic({ apiKey, baseURL }).languageModel(model))
    .with("gemini", () => createGoogleGenerativeAI({ apiKey, baseURL }).languageModel(model))
    .with("vercel-ai-gateway", () => createGateway({ apiKey, baseURL }).languageModel(model))
    .with("openrouter", () => createOpenAICompatible({ name: "openrouter", apiKey, baseURL }).languageModel(model))
    .with("ollama", () => {
      const ollama = createOllama({
        name: "ollama",
        baseURL,
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
      });

      return ollama.languageModel(model);
    })
    .exhaustive();
}

export const aiCredentialsSchema = z.object({
  provider: aiProviderSchema,
  model: z.string(),
  apiKey: z.string(),
  baseURL: z.string().optional().default(""),
});

export const fileInputSchema = z.object({
  name: z.string(),
  data: z.string().max(MAX_AI_FILE_BASE64_CHARS, "File is too large. Maximum size is 10MB."), // base64 encoded
});

type TestConnectionInput = z.infer<typeof aiCredentialsSchema>;

async function testConnection(input: TestConnectionInput): Promise<boolean> {
  try {
    const result = await generateText({
      model: getModel(input),
      messages: [{ role: "user", content: "Respond with OK" }],
      maxOutputTokens: 5,
    });
    return result.text.trim().length > 0;
  } catch {
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
  const model = getModel(input);

  const result = await generateText({
    model,
    messages: buildResumeParsingMessages({
      systemPrompt: pdfParserSystemPrompt,
      userPrompt: pdfParserUserPrompt,
      file: input.file,
      mediaType: "application/pdf",
    }),
  }).catch((error: unknown) => logAndRethrow("Failed to generate the text with the model", error));

  return parseAndValidateResumeJson(result.text);
}

type ParseDocxInput = z.infer<typeof aiCredentialsSchema> & {
  file: z.infer<typeof fileInputSchema>;
  mediaType: "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

async function parseDocx(input: ParseDocxInput): Promise<ResumeData> {
  const model = getModel(input);

  const result = await generateText({
    model,
    messages: buildResumeParsingMessages({
      systemPrompt: docxParserSystemPrompt,
      userPrompt: docxParserUserPrompt,
      file: input.file,
      mediaType: input.mediaType,
    }),
  }).catch((error: unknown) => logAndRethrow("Failed to generate the text with the model", error));

  return parseAndValidateResumeJson(result.text);
}

function buildChatSystemPrompt(resumeData: ResumeData): string {
  return chatSystemPromptTemplate.replace("{{RESUME_DATA}}", JSON.stringify(resumeData, null, 2));
}

type SuggestionInput = z.infer<typeof aiCredentialsSchema> & {
  resumeData: ResumeData;
  prompt: string;
};

type ChatInput = z.infer<typeof aiCredentialsSchema> & {
  messages: UIMessage[];
  resumeData: ResumeData;
};

async function chat(input: ChatInput) {
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
};

async function applySuggestion(input: SuggestionInput): Promise<SuggestionOutput> {
  const model = getModel(input);
  const resumeCopy = JSON.parse(JSON.stringify(input.resumeData)) as ResumeData;

  const systemPrompt = "You are a resume editing assistant. Return ONLY JSON Patch (RFC 6902) operations to apply the user's requested change. Do not include markdown, explanations, or code fences. Return an array of patch operations in this format: [{ op: \"replace\", path: \"/sections/experience/items/0/description\", value: \"...\" }]. Prefer 'replace' for updates. Use '-' to append to arrays.";

  const result = await generateText({
    model,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: input.prompt + "\n\nReturn JSON Patch (RFC 6902) operations for this resume data:\n\n" + JSON.stringify(input.resumeData, null, 2),
      },
    ],
    maxOutputTokens: 8192,
  });

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
    const patched = applyResumePatches(resumeCopy, validated.operations);
    logAiDebug("applySuggestion done", validated.operations.length + " ops applied, headline: " + (patched.basics?.headline || "none"));
    return {
      resumeData: patched,
      operations: validated.operations,
    };
  } catch (error) {
    logAiError("applySuggestion", error, result.text);
    throw new ORPCError("BAD_REQUEST", {
      message: "The AI returned an invalid suggestion format. Please try again.",
    });
  }
}

function formatJobHighlights(highlights: Record<string, string[]> | null): string {
  if (!highlights) return "None provided.";
  return Object.entries(highlights)
    .map(([key, values]) => `${key}:\n${values.map((v) => `- ${v}`).join("\n")}`)
    .join("\n\n");
}

function buildTailorSystemPrompt(resumeData: ResumeData, job: JobResult): string {
  return tailorSystemPromptTemplate
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
  const dimensions = job?.job_description?.trim() ? `## Scoring Dimensions

Score each dimension independently on a 0-100 scale. Be specific and evidence-based in your rationale.

Since a target job description IS provided below, you MUST score the resume against that specific job ({{JOB_TITLE}} at {{JOB_EMPLOYER}}, URL: {{JOB_URL}}). Use the job description as the reference for alignment.

1. **JD Keyword Match** — What percentage of key terms from the job description appear in the resume? Include hard skills, methodologies, technologies, qualifications. Is coverage natural or forced?

2. **Experience Alignment** — Does the candidate's experience credibly match what the job asks for? Are the role levels, sector experience, and project scales aligned?

3. **Skills Coverage** — How many required skills are evidenced? Are there clear gaps where the job asks for something the resume does not demonstrate?

4. **Gap Analysis** — What would a hiring manager flag as missing? Certifications, specific tools, sector experience, clearance level, contract type, location?

5. **Overall Fit Score** — Given all available evidence, how likely is this candidate to progress past initial screening and into interview? This is your holistic fit judgement.` : `## Scoring Dimensions

Score each dimension independently on a 0-100 scale. Be specific and evidence-based in your rationale.

Since no target job description is available, score the resume purely on ATS quality and general CV strength.

1. **Clarity & Specificity** — Are bullet points concrete? Do they use action verbs? Is it clear what the candidate did and what level they operated at?

2. **Impact & Quantification** — Are achievements quantified with scale (sites, users, budget, team size, cost savings, timelines)? Are outcomes described or just activities?

3. **ATS Compatibility** — Does the resume use industry-standard terminology? Are there duplicate skills, missing dates, inconsistent formatting, or hidden sections that hurt ATS parsing?

4. **Structure & Completeness** — Are all major sections present? Layout clean and readable? Certifications, education, and clearances properly listed?

5. **Language Quality & Relevance** — Professional tone, consistent voice, no cliches or inflated language. Experience descriptions match the implied seniority level.`;
  return analyzeResumeSystemPromptTemplate
    .replace("{SCORING_DIMENSIONS}", dimensions)
    .replace("{MASTER_CAREER_DATA}", masterCareerData)
    .replace("{RESUME_DATA}", JSON.stringify(resumeData, null, 2))
    .replace("{JOB_TITLE}", job?.job_title || "")
    .replace("{JOB_EMPLOYER}", job?.employer_name || "")
    .replace("{JOB_URL}", job?.job_apply_link || "")
    .replace("{JOB_DESCRIPTION}", job?.job_description || "");
}

async function analyzeResume(input: AnalyzeResumeInput): Promise<ResumeAnalysis> {
  const model = getModel(input);
  const systemPrompt = buildAnalyzeResumeSystemPrompt(input.resumeData, input.job);

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

    return resumeAnalysisSchema.parse(output);
  } catch (error) {
    logAiError("analyzeResume", error, result.text);
    throw new ORPCError("BAD_REQUEST", {
      message: "The AI returned an invalid analysis format. Please try again.",
    });
  }
}

async function tailorResume(input: TailorResumeInput): Promise<TailorOutput> {
  const model = getModel(input);
  const systemPrompt = buildTailorSystemPrompt(input.resumeData, input.job);

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

  if (!result.text) {
    logAiError("tailorResume", new Error("AI returned no tailoring output."));
    throw new Error("AI returned no tailoring output.");
  }

  try {
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
  } catch (error) {
    logAiError("tailorResume", error, result.text);
    throw new ORPCError("BAD_REQUEST", {
      message: "The AI returned invalid tailoring data. Please try again.",
    });
  }
}

type GenerateCoverLetterInput = z.infer<typeof aiCredentialsSchema> & {
  resumeData: ResumeData;
  job?: JobResult;
  target?: CoverLetterTarget;
  tone: CoverLetterTone;
  additionalInstructions?: string;
};

async function generateCoverLetter(input: GenerateCoverLetterInput): Promise<CoverLetter> {
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
}

type PrepareForInterviewInput = z.infer<typeof aiCredentialsSchema> & {
  resumeData: ResumeData;
  jobData?: JobResult;
  focusAreas?: string[];
};

async function prepareForInterview(input: PrepareForInterviewInput): Promise<InterviewPreparation> {
  const model = getModel(input);

  const systemPrompt = `You are an interview preparation specialist. Generate interview questions and preparation materials based on the resume and job description.

${input.focusAreas?.length ? `Focus Areas: ${input.focusAreas.join(", ")}` : ""}

Return ONLY valid JSON with these exact keys: questions (array), overview, preparationGuide, generatedAt.
Structure each question with: id, category, question, difficulty, explanation, suggestedAnswerFramework, relatedSkills, preparationTips, evidenceMap.
- categories: technical, behavioral, situational, company, delivery, stakeholder, contractor-fit
- difficulties: easy, medium, hard`;

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
