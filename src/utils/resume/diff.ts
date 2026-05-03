/**
 * Utility for generating diffs between resume data states.
 * Provides before/after previews for suggestions and patches.
 */

import type { Operation } from "fast-json-patch";
import type { ResumeData } from "@/schema/resume/data";

export type OperationPreview = {
  path: string;
  label: string;
  before: string;
  after: string;
};

type DiffEntry = {
  path: string;
  before: unknown;
  after: unknown;
  type: "added" | "removed" | "modified";
};

type OperationCounts = {
  add: number;
  remove: number;
  replace: number;
  move: number;
  copy: number;
};

/**
 * Counts operations by type.
 */
export function countOperations(operations: Array<Record<string, any>>): OperationCounts {
  const counts: OperationCounts = { add: 0, remove: 0, replace: 0, move: 0, copy: 0 };
  for (const op of operations) {
    if (op.op in counts) {
      counts[op.op as keyof OperationCounts]++;
    }
  }
  return counts;
}

/**
 * Gets affected section names from operations.
 */
export function getAffectedSections(operations: Array<Record<string, any>>): string[] {
  const sections = new Set<string>();
  for (const op of operations) {
    const path = op.path || "";
    const match = path.match(/^\/sections\/([^/]+)/);
    if (match) {
      sections.add(match[1]);
    }
  }
  return Array.from(sections).sort();
}

/**
 * Generates human-readable patch descriptions.
 */
export function getPatchDescription(operations: Array<Record<string, any>>): string[] {
  return operations.map((op) => {
    const path = op.path.replace(/^\//, "").replace(/\//g, " > ");
    switch (op.op) {
      case "add":
        return `Add to ${path}`;
      case "remove":
        return `Remove from ${path}`;
      case "replace":
        return `Update ${path}`;
      case "move":
        return `Move from ${op.from} to ${path}`;
      case "copy":
        return `Copy from ${op.from} to ${path}`;
      default:
        return `Modify ${path}`;
    }
  });
}

/**
 * Generates a simple text diff between two resume data objects.
 */
export function generateResumeDiff(before: ResumeData, after: ResumeData): string {
  const diffs = compareObjects(before, after, "");
  if (diffs.length === 0) return "No changes detected.";

  return diffs
    .map((d) => {
      const prefix = d.type === "added" ? "+ " : d.type === "removed" ? "- " : "~ ";
      const pathLabel = d.path || "root";
      return `${prefix}${pathLabel}: "${String(d.before).substring(0, 50)}"${d.type !== "removed" ? ` → "${String(d.after).substring(0, 50)}"` : ""}`;
    })
    .join("\n");
}

/**
 * Generates operation previews with before/after values.
 */
export function generateOperationPreviews(original: ResumeData, operations: Operation[]): OperationPreview[] {
  return operations.map((op) => {
    const before = getValueAtPath(original, op.path);
    const after = op.op === "add" || op.op === "replace" ? op.value : undefined;
    const { label, field } = describePath(original, op.path);

    return {
      path: op.path,
      label,
      before: formatPreviewValue(field, before),
      after: op.op === "remove" ? "Removed" : formatPreviewValue(field, after),
    };
  });
}

/**
 * Compares two objects recursively and returns differences.
 */
function compareObjects(before: unknown, after: unknown, path: string): DiffEntry[] {
  const diffs: DiffEntry[] = [];

  if (typeof before !== typeof after) {
    diffs.push({ path, before, after, type: "modified" });
    return diffs;
  }

  if (before === null || after === null) {
    if (before !== after) {
      diffs.push({ path, before, after, type: "modified" });
    }
    return diffs;
  }

  if (typeof before !== "object") {
    if (before !== after) {
      diffs.push({ path, before, after, type: "modified" });
    }
    return diffs;
  }

  if (Array.isArray(before) || Array.isArray(after)) {
    if (!Array.isArray(before) || !Array.isArray(after)) {
      diffs.push({ path, before, after, type: "modified" });
      return diffs;
    }

    for (let i = 0; i < Math.max(before.length, after.length); i++) {
      const beforeItem = before[i];
      const afterItem = after[i];
      const itemPath = `${path}/${i}`;

      if (beforeItem === undefined) {
        diffs.push({ path: itemPath, before: undefined, after: afterItem, type: "added" });
      } else if (afterItem === undefined) {
        diffs.push({ path: itemPath, before: beforeItem, after: undefined, type: "removed" });
      } else {
        diffs.push(...compareObjects(beforeItem, afterItem, itemPath));
      }
    }
    return diffs;
  }

  const beforeObj = before as Record<string, unknown>;
  const afterObj = after as Record<string, unknown>;

  const allKeys = new Set([...Object.keys(beforeObj), ...Object.keys(afterObj)]);

  for (const key of allKeys) {
    const beforeVal = beforeObj[key];
    const afterVal = afterObj[key];
    const childPath = path ? `${path}/${key}` : key;

    if (beforeVal === undefined && afterVal !== undefined) {
      diffs.push({ path: childPath, before: undefined, after: afterVal, type: "added" });
    } else if (afterVal === undefined && beforeVal !== undefined) {
      diffs.push({ path: childPath, before: beforeVal, after: undefined, type: "removed" });
    } else if (beforeVal !== afterVal) {
      diffs.push(...compareObjects(beforeVal, afterVal, childPath));
    }
  }

  return diffs;
}

/**
 * Generates a short preview of a value for diff display.
 */
export function generatePreview(value: unknown, maxLength = 60): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    return value.length > maxLength ? `${value.substring(0, maxLength)}...` : value;
  }
  if (typeof value === "object") {
    const str = JSON.stringify(value);
    return str.length > maxLength ? `${str.substring(0, maxLength)}...` : str;
  }
  return String(value);
}

/**
 * Gets a value from a nested object using JSON pointer notation.
 */
export function getValueAtPath(obj: unknown, path: string): unknown {
  if (path === "" || path === "/") return obj;

  // Normalize: handle both dot-notation (from AI) and JSON Pointer
  const normalized = path.startsWith("/") ? path : "/" + path.replace(/\./g, "/");
  const parts = normalized.replace(/^\//, "").split("/").filter(Boolean);

  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;

    const key = /^\d+$/.test(part) ? Number.parseInt(part, 10) : part;
    current = (current as Record<string, unknown>)[key as string];
  }

  return current;
}

function describePath(original: ResumeData, path: string): { label: string; field: string } {
  // Normalize: handle both dot-notation (from AI) and JSON Pointer
  const normalized = path.startsWith("/") ? path : "/" + path.replace(/\./g, "/");
  const parts = normalized.replace(/^\//, "").split("/").filter(Boolean);
  const field = parts[parts.length - 1] ?? "value";

  if (parts[0] === "sections" && parts[2] === "items" && parts[3] !== undefined) {
    const section = parts[1] ?? "section";
    const itemIndex = Number(parts[3]);
    const item = getValueAtPath(original, `/sections/${section}/items/${itemIndex}`) as Record<string, unknown> | undefined;
    const itemLabel = getItemLabel(item, itemIndex);

    if (field === "hidden") {
      return { label: `${formatSectionName(section)}: ${itemLabel} visibility`, field };
    }

    return { label: `${formatSectionName(section)}: ${itemLabel} → ${formatFieldName(field)}`, field };
  }

  if (parts[0] === "sections" && parts[2] === "hidden") {
    const section = parts[1] ?? "section";
    return { label: `${formatSectionName(section)} section visibility`, field };
  }

  return {
    label: parts.map((part) => (/^\d+$/.test(part) ? `#${Number(part) + 1}` : formatFieldName(part))).join(" → "),
    field,
  };
}

function getItemLabel(item: Record<string, unknown> | undefined, index: number): string {
  if (!item) return `Item ${index + 1}`;

  const candidate = item.name ?? item.title ?? item.organization ?? item.company ?? item.position ?? item.label;
  if (typeof candidate === "string" && candidate.trim().length > 0) return candidate;

  return `Item ${index + 1}`;
}

function formatSectionName(section: string): string {
  return formatFieldName(section).replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatFieldName(field: string): string {
  return field
    .replace(/~1/g, "/")
    .replace(/~0/g, "~")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .toLowerCase();
}

/** Strip HTML tags from a string, returning clean text for diff previews. */
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")   // Replace tags with space
    .replace(/&nbsp;/g, " ")     // Unescape non-breaking spaces
    .replace(/&amp;/g, "&")      // Unescape ampersands
    .replace(/&lt;/g, "<")       // Unescape less-than
    .replace(/&gt;/g, ">")       // Unescape greater-than
    .replace(/&quot;/g, '"')      // Unescape double quotes
    .replace(/&#39;/g, "'")      // Unescape single quotes
    .replace(/\s+/g, " ")       // Collapse whitespace
    .trim();
}

function formatPreviewValue(field: string, value: unknown): string {
  if (field === "hidden" && typeof value === "boolean") {
    return value ? "Hidden" : "Visible";
  }

  if (value === null || value === undefined || value === "") return "Empty";
  if (typeof value === "string") {
    const clean = stripHtml(value);
    return clean.length > 120 ? `${clean.substring(0, 120)}...` : clean;
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);

  const str = JSON.stringify(value);
  return str.length > 120 ? `${str.substring(0, 120)}...` : str;
}
