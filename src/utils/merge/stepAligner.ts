// src/utils/merge/stepAligner.ts
// Step alignment utility using text similarity

import type { WikiQuestStep } from "../../api/wikiApi";
import type { QuestStep } from "../../state/types";
import type { AlignmentSuggestion } from "../../types/merge";
import { computeTextSimilarity } from "./textDiff";

/** Minimum similarity score to consider steps as potential matches */
const MIN_ALIGNMENT_THRESHOLD = 0.3;

/** High confidence threshold for auto-accepting alignment */
const HIGH_CONFIDENCE_THRESHOLD = 0.7;

/**
 * Compute alignment suggestions between wiki and local steps
 * Uses text similarity on step descriptions
 */
export function computeAlignments(
  wikiSteps: WikiQuestStep[],
  localSteps: QuestStep[]
): AlignmentSuggestion[] {
  const suggestions: AlignmentSuggestion[] = [];

  // Compute similarity matrix
  const matrix: { wikiIdx: number; localIdx: number; score: number }[] = [];

  for (let wi = 0; wi < wikiSteps.length; wi++) {
    for (let li = 0; li < localSteps.length; li++) {
      const wikiDesc = wikiSteps[wi].stepDescription || "";
      const localDesc = localSteps[li].stepDescription || "";

      const score = computeTextSimilarity(wikiDesc, localDesc);

      if (score >= MIN_ALIGNMENT_THRESHOLD) {
        matrix.push({ wikiIdx: wi, localIdx: li, score });
      }
    }
  }

  // Sort by score descending
  matrix.sort((a, b) => b.score - a.score);

  // Greedy assignment - each step can only be aligned once
  const usedWiki = new Set<number>();
  const usedLocal = new Set<number>();

  for (const { wikiIdx, localIdx, score } of matrix) {
    if (usedWiki.has(wikiIdx) || usedLocal.has(localIdx)) continue;

    usedWiki.add(wikiIdx);
    usedLocal.add(localIdx);

    const reason = score >= HIGH_CONFIDENCE_THRESHOLD
      ? "High text similarity"
      : score >= 0.5
        ? "Moderate text similarity"
        : "Low text similarity";

    suggestions.push({
      wikiIndex: wikiIdx,
      localIndex: localIdx,
      score,
      reason,
    });
  }

  return suggestions;
}

/**
 * Build alignment map from suggestions
 * Returns: wikiIndex -> localIndex mapping
 */
export function buildAlignmentMap(suggestions: AlignmentSuggestion[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const s of suggestions) {
    map.set(s.wikiIndex, s.localIndex);
  }
  return map;
}

/**
 * Get unaligned wiki step indices
 */
export function getUnalignedWikiSteps(
  wikiSteps: WikiQuestStep[],
  alignments: AlignmentSuggestion[]
): number[] {
  const aligned = new Set(alignments.map((a) => a.wikiIndex));
  return wikiSteps.map((_, i) => i).filter((i) => !aligned.has(i));
}

/**
 * Get unaligned local step indices
 */
export function getUnalignedLocalSteps(
  localSteps: QuestStep[],
  alignments: AlignmentSuggestion[]
): number[] {
  const aligned = new Set(alignments.map((a) => a.localIndex));
  return localSteps.map((_, i) => i).filter((i) => !aligned.has(i));
}

/**
 * Suggest best position to insert a new wiki step
 * Based on surrounding aligned steps
 */
export function suggestInsertPosition(
  wikiIndex: number,
  alignments: AlignmentSuggestion[],
  localStepsCount: number
): number {
  // Find the nearest aligned step before this wiki step
  let nearestBefore: AlignmentSuggestion | null = null;
  let nearestAfter: AlignmentSuggestion | null = null;

  for (const a of alignments) {
    if (a.wikiIndex < wikiIndex) {
      if (!nearestBefore || a.wikiIndex > nearestBefore.wikiIndex) {
        nearestBefore = a;
      }
    } else if (a.wikiIndex > wikiIndex) {
      if (!nearestAfter || a.wikiIndex < nearestAfter.wikiIndex) {
        nearestAfter = a;
      }
    }
  }

  // If we have a step before, insert after it
  if (nearestBefore) {
    return nearestBefore.localIndex + 1;
  }

  // If we have a step after, insert before it
  if (nearestAfter) {
    return nearestAfter.localIndex;
  }

  // Default to end
  return localStepsCount;
}

/**
 * Compute confidence level for alignment suggestions
 */
export function getAlignmentConfidence(score: number): "high" | "medium" | "low" {
  if (score >= HIGH_CONFIDENCE_THRESHOLD) return "high";
  if (score >= 0.5) return "medium";
  return "low";
}
