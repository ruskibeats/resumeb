#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

function usage() {
  console.error(`
Verify analyzeResume output includes the extended AI analysis fields.

Required environment:
  RR_API_KEY       Reactive Resume API key for the authenticated user
  AI_API_KEY       AI provider API key
  RESUME_ID        Existing resume id owned by RR_API_KEY user

Optional environment:
  RR_BASE_URL      Reactive Resume base URL (default: http://localhost:3000)
  AI_PROVIDER      AI provider (default: openrouter)
  AI_MODEL         AI model (default: deepseek/deepseek-v4-flash)
  AI_BASE_URL      AI provider base URL (default for openrouter: https://openrouter.ai/api/v1)
  RESUME_JSON      ResumeData JSON path (default: /tmp/rr-analyze-resume.json if present)
  JOB_JSON         Optional JobResult JSON path for job-specific analysis

Example:
  RR_API_KEY=... AI_API_KEY=... RESUME_ID=... RESUME_JSON=/tmp/resume.json \\
    node scripts/ai/test-analyze-resume-fields.mjs
`);
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    usage();
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

async function readJson(path, label) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Failed to read ${label} JSON from ${path}: ${error.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEnum(value, allowed, path) {
  assert(allowed.includes(value), `${path} must be one of ${allowed.join(", ")}; got ${JSON.stringify(value)}`);
}

const rrBaseUrl = (process.env.RR_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const rrApiKey = requireEnv("RR_API_KEY");
const aiApiKey = requireEnv("AI_API_KEY");
const resumeId = requireEnv("RESUME_ID");
const provider = process.env.AI_PROVIDER || "openrouter";
const model = process.env.AI_MODEL || "deepseek/deepseek-v4-flash";
const baseURL = process.env.AI_BASE_URL || (provider === "openrouter" ? "https://openrouter.ai/api/v1" : undefined);
const defaultResumeJson = "/tmp/rr-analyze-resume.json";
const resumeJson = process.env.RESUME_JSON || (existsSync(defaultResumeJson) ? defaultResumeJson : undefined);

if (!resumeJson) {
  usage();
  throw new Error("Missing RESUME_JSON and default /tmp/rr-analyze-resume.json does not exist");
}

const resumeData = await readJson(resumeJson, "resume");
const job = process.env.JOB_JSON ? await readJson(process.env.JOB_JSON, "job") : undefined;

const payload = {
  provider,
  model,
  apiKey: aiApiKey,
  ...(baseURL ? { baseURL } : {}),
  resumeId,
  resumeData,
  ...(job ? { job } : {}),
};

const requestId = randomUUID();
const url = `${rrBaseUrl}/api/openapi/ai/analyze-resume`;
console.log(`[${requestId}] Calling ${url}`);

const response = await fetch(url, {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": rrApiKey,
  },
  body: JSON.stringify(payload),
});

const responseText = await response.text();
if (!response.ok) {
  console.error(responseText);
  throw new Error(`[${requestId}] analyzeResume failed: HTTP ${response.status}`);
}

let data;
try {
  data = JSON.parse(responseText);
} catch (error) {
  console.error(responseText);
  throw new Error(`[${requestId}] analyzeResume returned non-JSON response: ${error.message}`);
}

assert(data && typeof data === "object", "Response must be an object");
assert(data.atsCompatibility && typeof data.atsCompatibility === "object", "Missing top-level atsCompatibility object");
assert(
  Number.isInteger(data.atsCompatibility.overallScore) &&
    data.atsCompatibility.overallScore >= 0 &&
    data.atsCompatibility.overallScore <= 100,
  "atsCompatibility.overallScore must be an integer between 0 and 100",
);
assert(Array.isArray(data.suggestions), "Response suggestions must be an array");
assert(data.suggestions.length > 0, "Response suggestions array is empty; cannot verify suggestion fields");

data.suggestions.forEach((suggestion, index) => {
  assert(suggestion && typeof suggestion === "object", `suggestions[${index}] must be an object`);
  assertEnum(suggestion.priority, ["high", "medium", "low"], `suggestions[${index}].priority`);
  assertEnum(suggestion.effort, ["high", "medium", "low"], `suggestions[${index}].effort`);
  assert(
    typeof suggestion.category === "string" && suggestion.category.trim().length > 0,
    `suggestions[${index}].category must be a non-empty string`,
  );
});

console.log(`[${requestId}] PASS analyzeResume extended fields present`);
console.log(
  JSON.stringify(
    {
      overallScore: data.overallScore,
      atsCompatibilityScore: data.atsCompatibility.overallScore,
      atsDimensions: Array.isArray(data.atsCompatibility.dimensions) ? data.atsCompatibility.dimensions.length : 0,
      suggestions: data.suggestions.length,
      firstSuggestion: {
        title: data.suggestions[0]?.title,
        priority: data.suggestions[0]?.priority,
        effort: data.suggestions[0]?.effort,
        category: data.suggestions[0]?.category,
      },
    },
    null,
    2,
  ),
);
