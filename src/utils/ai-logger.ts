/**
 * AI debug logger — writes to /tmp/rr-ai-errors.log for easy tailing.
 */
import { appendFileSync } from "fs";

const LOG_FILE = "/tmp/rr-ai-errors.log";

export function logAiError(
  context: string,
  error: unknown,
  aiResponse?: string,
  extra?: Record<string, unknown>,
): void {
  try {
    const timestamp = new Date().toISOString();
    const lines: string[] = [
      `\n=== [${timestamp}] ${context} ===`,
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    ];
    if (error instanceof Error && error.stack) {
      lines.push(`Stack: ${error.stack.split("\n").slice(0, 4).join(" → ")}`);
    }
    if (aiResponse) {
      const truncated = aiResponse.length > 5000 ? aiResponse.substring(0, 5000) + "\n... [truncated]" : aiResponse;
      lines.push(`AI Response:\n${truncated}`);
    }
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        lines.push(`${k}: ${typeof v === "string" ? v : JSON.stringify(v).substring(0, 500)}`);
      }
    }
    lines.push(`=== END [${timestamp}] ===\n`);
    appendFileSync(LOG_FILE, lines.join("\n"));
  } catch {
    // Logger must never throw
  }
}

export function logAiDebug(context: string, data: string): void {
  try {
    const timestamp = new Date().toISOString();
    appendFileSync(LOG_FILE, `[${timestamp}] [DEBUG] ${context}: ${data.substring(0, 2000)}\n`);
  } catch {
    // silent
  }
}
