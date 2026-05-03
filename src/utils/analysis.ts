/**
 * Shared analysis normalization utilities.
 * Extracted from services/ai.ts so they can be unit-tested independently.
 */

/** Coerce a value to a safe integer score (0-100), accepting strings and floats. */
export function coerceScore(value: unknown): number {
  if (typeof value === "number") {
    return Math.max(0, Math.min(100, Math.round(value)));
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === "null" || trimmed === "undefined") return 0;
    const num = Number(trimmed);
    if (Number.isNaN(num)) return 0;
    return Math.max(0, Math.min(100, Math.round(num)));
  }
  return 0;
}
