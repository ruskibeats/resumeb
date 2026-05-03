/**
 * Shared analysis normalization utilities.
 * Extracted from services/ai.ts so they can be unit-tested independently.
 */

/** Minimal shape we need — matches ResumeData's hidden/sections structure */
interface SanitizableResume {
  summary?: { hidden?: boolean; content?: string };
  picture?: { hidden?: boolean; url?: string };
  sections: Record<string, {
    hidden?: boolean;
    items?: Array<{ hidden?: boolean }>;
  }>;
}

/**
 * Strip all hidden items/sections from resume data before sending to AI.
 * The AI cannot evaluate what it cannot see — this is the only guaranteed
 * way to enforce the Hidden Items Rule.
 * Accepts any object with the expected shape (ResumeData or similar).
 */
export function stripHiddenItems(data: SanitizableResume): SanitizableResume {
  const cleaned = JSON.parse(JSON.stringify(data)) as SanitizableResume;

  // Strip hidden top-level summary and picture
  if (cleaned.summary?.hidden) {
    cleaned.summary.content = "";
  }
  if (cleaned.picture?.hidden) {
    cleaned.picture.url = "";
  }

  // Strip hidden sections and hidden items within sections
  for (const key of Object.keys(cleaned.sections)) {
    const section = cleaned.sections[key];
    if (!section) continue;

    // Remove entire hidden section
    if (section.hidden) {
      delete cleaned.sections[key];
      continue;
    }

    // Remove hidden items within the section
    if (Array.isArray(section.items)) {
      section.items = section.items.filter((item: { hidden?: boolean }) => !item.hidden);
    }
  }

  return cleaned;
}

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
