// src/utils/merge/arrayDiff.ts
// Array diffing utility for items, dialog options, etc.

import type { ArrayItemDiff, DiffStatus } from "../../types/merge";

/**
 * Compute diff between two string arrays
 * Returns items with their source and initial selection state
 */
export function computeArrayDiff(wikiArr: string[], localArr: string[]): ArrayItemDiff[] {
  const wikiSet = new Set(wikiArr.map((s) => s.trim().toLowerCase()));
  const localSet = new Set(localArr.map((s) => s.trim().toLowerCase()));
  const items: ArrayItemDiff[] = [];
  const seen = new Set<string>();

  // Process wiki items first (preserving order)
  for (const value of wikiArr) {
    const key = value.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const inLocal = localSet.has(key);
    items.push({
      value: value.trim(),
      source: inLocal ? "both" : "wiki",
      // Wiki-only items selected by default (new content)
      // Items in both are also selected (preserve existing)
      selected: true,
    });
  }

  // Process local-only items
  for (const value of localArr) {
    const key = value.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      value: value.trim(),
      source: "local",
      // Local-only items selected by default (don't lose existing content)
      selected: true,
    });
  }

  return items;
}

/**
 * Get the overall diff status for an array field
 */
export function getArrayDiffStatus(wikiArr: string[], localArr: string[]): DiffStatus {
  const wikiSet = new Set(wikiArr.map((s) => s.trim().toLowerCase()));
  const localSet = new Set(localArr.map((s) => s.trim().toLowerCase()));

  // Check if arrays are identical (ignoring order and case)
  if (wikiSet.size === localSet.size) {
    const allMatch = [...wikiSet].every((w) => localSet.has(w));
    if (allMatch) return "same";
  }

  // Check if wiki has all new items (local is empty)
  if (localArr.length === 0 && wikiArr.length > 0) {
    return "added";
  }

  // Check if local has items but wiki is empty
  if (wikiArr.length === 0 && localArr.length > 0) {
    return "removed";
  }

  // Otherwise it's modified
  return "modified";
}

/**
 * Apply array item selections to produce final array
 */
export function applyArraySelections(items: ArrayItemDiff[]): string[] {
  return items.filter((item) => item.selected).map((item) => item.value);
}

/**
 * Count differences in array items
 */
export function countArrayDifferences(items: ArrayItemDiff[]): {
  added: number;
  removed: number;
  same: number;
} {
  let added = 0;
  let removed = 0;
  let same = 0;

  for (const item of items) {
    switch (item.source) {
      case "wiki":
        added++;
        break;
      case "local":
        removed++;
        break;
      case "both":
        same++;
        break;
    }
  }

  return { added, removed, same };
}

/**
 * Select all items from a specific source
 */
export function selectBySource(
  items: ArrayItemDiff[],
  source: "wiki" | "local" | "both",
  selected: boolean
): ArrayItemDiff[] {
  return items.map((item) =>
    item.source === source || source === "both" ? { ...item, selected } : item
  );
}

/**
 * Toggle selection for a specific item
 */
export function toggleItemSelection(items: ArrayItemDiff[], index: number): ArrayItemDiff[] {
  return items.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item));
}

/**
 * Check if arrays have any differences
 */
export function arraysHaveDifferences(wikiArr: string[], localArr: string[]): boolean {
  return getArrayDiffStatus(wikiArr, localArr) !== "same";
}
