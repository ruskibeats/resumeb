/**
 * Computes a human-readable diff description for JSON Patch operations on resume data.
 * Returns a list of changes that can be displayed in a preview dialog.
 */
export function getPatchDescription(operations: Array<Record<string, any>>): string[] {
  const changes: string[] = [];

  for (const op of operations) {
    const path = op.path?.replace(/^\//, "")?.replace(/\//g, ".")?.replace(/-/g, "new item") ?? "unknown";

    switch (op.op) {
      case "add":
        changes.push(`Add to "${path}"`);
        break;
      case "remove":
        changes.push(`Remove from "${path}"`);
        break;
      case "replace":
        changes.push(`Update "${path}"`);
        break;
      case "move": {
        const from = op.from?.replace(/^\//, "")?.replace(/\//g, ".") ?? "unknown";
        changes.push(`Move from "${from}" to "${path}"`);
        break;
      }
      case "copy":
        changes.push(`Copy to "${path}"`);
        break;
      default:
        changes.push(`Modify "${path}"`);
    }
  }

  return changes;
}

/**
 * Categorizes patch operations by the section they affect.
 */
export function getAffectedSections(operations: Array<Record<string, any>>): string[] {
  const sections = new Set<string>();

  for (const op of operations) {
    const path = op.path ?? "";
    const pathParts = path.split("/");
    // Path format: /sections/{sectionName}/... or /basics/...
    if (pathParts[1] === "sections" && pathParts[2]) {
      sections.add(pathParts[2]);
    } else if (pathParts[1] === "basics") {
      sections.add("basics");
    } else if (pathParts[1] === "summary") {
      sections.add("summary");
    }
  }

  return Array.from(sections);
}

/**
 * Counts operations by type for summary display.
 */
export function countOperations(operations: Array<Record<string, any>>): { add: number; remove: number; replace: number } {
  const counts = { add: 0, remove: 0, replace: 0 };

  for (const op of operations) {
    if (op.op === "add") counts.add++;
    else if (op.op === "remove") counts.remove++;
    else if (op.op === "replace") counts.replace++;
  }

  return counts;
}