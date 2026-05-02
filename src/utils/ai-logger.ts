/**
 * AI structured logger — writes to /tmp/rr-ai-debug.log for debugging AI operations.
 * Redacts sensitive information like API keys and provides structured request/response logging.
 */
import { appendFileSync } from "fs";

const LOG_FILE = "/tmp/rr-ai-debug.log";
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB max log size

type AiOperationContext = {
  operation: string;
  provider: string;
  model: string;
  userId?: string;
  sessionId?: string;
  resumeId?: string;
};

type AiRequestLog = AiOperationContext & {
  promptLength: number;
  systemPromptLength: number;
  fileInfo?: {
    name: string;
    mediaType: string;
    sizeKb: number;
  };
};

type AiResponseLog = AiOperationContext & {
  responseLength: number;
  responseTimeMs: number;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
  success: boolean;
  error?: string;
};

/**
 * Safely truncates a string to a maximum length, appending "..." if truncated.
 */
function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen) + "...[truncated]";
}

/**
 * Redacts potentially sensitive data from strings before logging.
 */
function redactSensitiveData(text: string): string {
  // Redact API key patterns
  return text
    .replace(/sk-[a-zA-Z0-9]{20,}/g, "sk-***REDACTED***")
    .replace(/sk-ant-[a-zA-Z0-9]{20,}/g, "sk-ant-***REDACTED***")
    .replace(/Bearer\s+[a-zA-Z0-9\-_.]+/gi, "Bearer ***REDACTED***");
}

/**
 * Creates a log entry with consistent formatting.
 */
function writeLog(entry: Record<string, unknown>): void {
  try {
    const timestamp = new Date().toISOString();
    const logLine = JSON.stringify({ timestamp, ...entry }) + "\n";
    appendFileSync(LOG_FILE, logLine);
  } catch {
    // Logger must never throw
  }
}

/**
 * Logs the start of an AI operation with request metadata.
 */
export function logAiRequest(input: AiRequestLog): void {
  writeLog({
    level: "INFO",
    type: "ai_request",
    operation: input.operation,
    provider: input.provider,
    model: input.model,
    userId: input.userId,
    sessionId: input.sessionId,
    resumeId: input.resumeId,
    promptLength: input.promptLength,
    systemPromptLength: input.systemPromptLength,
    fileInfo: input.fileInfo,
  });
}

/**
 * Logs the completion of an AI operation with response metadata.
 */
export function logAiResponse(input: AiResponseLog): void {
  writeLog({
    level: input.success ? "INFO" : "ERROR",
    type: "ai_response",
    operation: input.operation,
    provider: input.provider,
    model: input.model,
    userId: input.userId,
    sessionId: input.sessionId,
    resumeId: input.resumeId,
    responseLength: input.responseLength,
    responseTimeMs: input.responseTimeMs,
    tokenUsage: input.tokenUsage,
    success: input.success,
    error: input.error,
  });
}

/**
 * Logs AI errors with contextual information.
 */
export function logAiError(
  context: string,
  error: unknown,
  aiResponse?: string,
  extra?: Record<string, unknown>,
): void {
  writeLog({
    level: "ERROR",
    type: "ai_error",
    context,
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? truncate(error.stack || "", 500) : undefined,
    aiResponse: aiResponse ? truncate(redactSensitiveData(aiResponse), 2000) : undefined,
    ...extra,
  });
}

/**
 * Logs AI debug information for development/troubleshooting.
 */
export function logAiDebug(context: string, data: string): void {
  writeLog({
    level: "DEBUG",
    type: "ai_debug",
    context,
    data: truncate(redactSensitiveData(data), 2000),
  });
}

/**
 * Logs structured AI output parsing attempts, including malformed output detection.
 */
export function logAiOutputParsing(
  operation: string,
  success: boolean,
  rawOutput: string,
  parsedData?: unknown,
  error?: unknown,
): void {
  writeLog({
    level: success ? "DEBUG" : "WARN",
    type: "ai_output_parsing",
    operation,
    success,
    rawOutputLength: rawOutput.length,
    rawOutputPreview: truncate(redactSensitiveData(rawOutput), 500),
    parsedKeys: parsedData && typeof parsedData === "object" ? Object.keys(parsedData).join(",") : undefined,
    error: error instanceof Error ? error.message : undefined,
  });
}

/**
 * Logs token usage for cost tracking.
 */
export function logAiTokenUsage(
  operation: string,
  provider: string,
  model: string,
  promptTokens: number,
  completionTokens: number,
  estimatedCostUsd?: number,
): void {
  writeLog({
    level: "INFO",
    type: "ai_token_usage",
    operation,
    provider,
    model,
    promptTokens,
    completionTokens,
    totalTokens: promptTokens + completionTokens,
    estimatedCostUsd,
  });
}