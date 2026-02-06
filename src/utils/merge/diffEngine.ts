// src/utils/merge/diffEngine.ts
// Core diff computation engine for wiki merge

import type { WikiQuestStep } from "../../api/wikiApi";
import type { QuestStep } from "../../state/types";
import type {
  StepDiff,
  StepFieldDiffs,
  TextFieldDiff,
  ArrayFieldDiff,
  DiffStatus,
} from "../../types/merge";
import { computeTextDiff, computeTextSimilarity } from "./textDiff";
import { computeArrayDiff, getArrayDiffStatus } from "./arrayDiff";
import { computeAlignments, buildAlignmentMap, getUnalignedWikiSteps, getUnalignedLocalSteps } from "./stepAligner";

/**
 * Compute full diff between wiki steps and local steps
 * Handles alignment, field-level diffs, and new/removed steps
 */
export function computeStepDiffs(
  wikiSteps: WikiQuestStep[],
  localSteps: QuestStep[]
): StepDiff[] {
  const diffs: StepDiff[] = [];

  // Get alignment suggestions
  const alignments = computeAlignments(wikiSteps, localSteps);
  const alignmentMap = buildAlignmentMap(alignments);

  // Track which local steps have been aligned
  const alignedLocalIndices = new Set(alignments.map((a) => a.localIndex));

  // Process wiki steps in order
  let diffIndex = 0;

  for (let wi = 0; wi < wikiSteps.length; wi++) {
    const wikiStep = wikiSteps[wi];
    const localIndex = alignmentMap.get(wi);

    if (localIndex !== undefined) {
      // Aligned step - compute field diffs
      const localStep = localSteps[localIndex];
      const alignment = alignments.find((a) => a.wikiIndex === wi);

      diffs.push({
        diffIndex: diffIndex++,
        wikiStepIndex: wi,
        localStepIndex: localIndex,
        wikiStep,
        localStep,
        alignmentScore: alignment?.score ?? 0,
        manuallyMapped: false,
        isNewFromWiki: false,
        isLocalOnly: false,
        fields: computeFieldDiffs(wikiStep, localStep),
      });
    } else {
      // New wiki step (not in local)
      diffs.push({
        diffIndex: diffIndex++,
        wikiStepIndex: wi,
        localStepIndex: -1,
        wikiStep,
        localStep: null,
        alignmentScore: 0,
        manuallyMapped: false,
        isNewFromWiki: true,
        isLocalOnly: false,
        fields: computeFieldDiffsForNewStep(wikiStep),
      });
    }
  }

  // Add local-only steps at the end
  for (let li = 0; li < localSteps.length; li++) {
    if (!alignedLocalIndices.has(li)) {
      const localStep = localSteps[li];
      diffs.push({
        diffIndex: diffIndex++,
        wikiStepIndex: -1,
        localStepIndex: li,
        wikiStep: null,
        localStep,
        alignmentScore: 0,
        manuallyMapped: false,
        isNewFromWiki: false,
        isLocalOnly: true,
        fields: computeFieldDiffsForLocalOnly(localStep),
      });
    }
  }

  return diffs;
}

/**
 * Compute field-level diffs for aligned steps
 */
function computeFieldDiffs(wiki: WikiQuestStep, local: QuestStep): StepFieldDiffs {
  return {
    stepDescription: computeTextFieldDiff(
      "stepDescription",
      wiki.stepDescription || "",
      local.stepDescription || ""
    ),
    itemsNeeded: computeArrayFieldDiff(
      "itemsNeeded",
      wiki.itemsNeeded || [],
      local.itemsNeeded || []
    ),
    itemsRecommended: computeArrayFieldDiff(
      "itemsRecommended",
      wiki.itemsRecommended || [],
      local.itemsRecommended || []
    ),
    dialogOptions: computeArrayFieldDiff(
      "dialogOptions",
      wiki.dialogOptions || [],
      local.dialogOptions || []
    ),
    additionalStepInformation: computeArrayFieldDiff(
      "additionalStepInformation",
      wiki.additionalStepInformation || [],
      local.additionalStepInformation || []
    ),
  };
}

/**
 * Compute field diffs for a new wiki step (no local equivalent)
 */
function computeFieldDiffsForNewStep(wiki: WikiQuestStep): StepFieldDiffs {
  return {
    stepDescription: computeTextFieldDiff(
      "stepDescription",
      wiki.stepDescription || "",
      ""
    ),
    itemsNeeded: computeArrayFieldDiff("itemsNeeded", wiki.itemsNeeded || [], []),
    itemsRecommended: computeArrayFieldDiff("itemsRecommended", wiki.itemsRecommended || [], []),
    dialogOptions: computeArrayFieldDiff("dialogOptions", wiki.dialogOptions || [], []),
    additionalStepInformation: computeArrayFieldDiff(
      "additionalStepInformation",
      wiki.additionalStepInformation || [],
      []
    ),
  };
}

/**
 * Compute field diffs for a local-only step (not in wiki)
 */
function computeFieldDiffsForLocalOnly(local: QuestStep): StepFieldDiffs {
  return {
    stepDescription: computeTextFieldDiff(
      "stepDescription",
      "",
      local.stepDescription || ""
    ),
    itemsNeeded: computeArrayFieldDiff("itemsNeeded", [], local.itemsNeeded || []),
    itemsRecommended: computeArrayFieldDiff("itemsRecommended", [], local.itemsRecommended || []),
    dialogOptions: computeArrayFieldDiff("dialogOptions", [], local.dialogOptions || []),
    additionalStepInformation: computeArrayFieldDiff(
      "additionalStepInformation",
      [],
      local.additionalStepInformation || []
    ),
  };
}

/**
 * Compute text field diff
 */
function computeTextFieldDiff(
  fieldName: string,
  wikiValue: string,
  localValue: string
): TextFieldDiff {
  const status = getTextDiffStatus(wikiValue, localValue);
  const segments = status === "same" ? [] : computeTextDiff(localValue, wikiValue);

  return {
    fieldName,
    wikiValue,
    localValue,
    status,
    accepted: status === "same" ? true : null, // Auto-accept if same
    segments,
  };
}

/**
 * Compute array field diff
 */
function computeArrayFieldDiff(
  fieldName: string,
  wikiValue: string[],
  localValue: string[]
): ArrayFieldDiff {
  const status = getArrayDiffStatus(wikiValue, localValue);
  const items = computeArrayDiff(wikiValue, localValue);

  return {
    fieldName,
    wikiValue,
    localValue,
    status,
    accepted: status === "same" ? true : null, // Auto-accept if same
    items,
  };
}

/**
 * Get diff status for text field
 */
function getTextDiffStatus(wikiValue: string, localValue: string): DiffStatus {
  if (wikiValue === localValue) return "same";
  if (!localValue && wikiValue) return "added";
  if (!wikiValue && localValue) return "removed";
  return "modified";
}

/**
 * Count total differences across all step diffs
 */
export function countTotalDifferences(diffs: StepDiff[]): {
  total: number;
  decided: number;
  pending: number;
} {
  let total = 0;
  let decided = 0;

  for (const diff of diffs) {
    for (const field of Object.values(diff.fields)) {
      if (field.status !== "same") {
        total++;
        if (field.accepted !== null) decided++;
      }
    }
  }

  return { total, decided, pending: total - decided };
}

/**
 * Check if all decisions have been made
 */
export function allDecisionsMade(diffs: StepDiff[]): boolean {
  for (const diff of diffs) {
    for (const field of Object.values(diff.fields)) {
      if (field.status !== "same" && field.accepted === null) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Get summary of changes
 */
export function getDiffSummary(diffs: StepDiff[]): {
  alignedSteps: number;
  newWikiSteps: number;
  localOnlySteps: number;
  modifiedFields: number;
} {
  let alignedSteps = 0;
  let newWikiSteps = 0;
  let localOnlySteps = 0;
  let modifiedFields = 0;

  for (const diff of diffs) {
    if (diff.isNewFromWiki) newWikiSteps++;
    else if (diff.isLocalOnly) localOnlySteps++;
    else alignedSteps++;

    for (const field of Object.values(diff.fields)) {
      if (field.status !== "same") modifiedFields++;
    }
  }

  return { alignedSteps, newWikiSteps, localOnlySteps, modifiedFields };
}
