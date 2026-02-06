// src/types/merge.ts
// Type definitions for the Wiki Merge System

import type { WikiQuestStep } from "../api/wikiApi";
import type { QuestStep } from "../state/types";

/** Diff status for any field */
export type DiffStatus = "same" | "modified" | "added" | "removed";

/** Text diff segment for inline display */
export interface TextSegment {
  text: string;
  type: "same" | "added" | "removed";
}

/** Array item with selection state */
export interface ArrayItemDiff {
  value: string;
  source: "wiki" | "local" | "both";
  selected: boolean;
}

/** Individual field diff */
export interface FieldDiff<T> {
  fieldName: string;
  wikiValue: T;
  localValue: T;
  status: DiffStatus;
  /** null = undecided, true = use wiki, false = keep local */
  accepted: boolean | null;
}

/** Text field diff with segments */
export interface TextFieldDiff extends FieldDiff<string> {
  segments: TextSegment[];
}

/** Array field diff with item-level control */
export interface ArrayFieldDiff extends FieldDiff<string[]> {
  items: ArrayItemDiff[];
}

/** All mergeable fields for a step */
export interface StepFieldDiffs {
  stepDescription: TextFieldDiff;
  itemsNeeded: ArrayFieldDiff;
  itemsRecommended: ArrayFieldDiff;
  dialogOptions: ArrayFieldDiff;
  additionalStepInformation: ArrayFieldDiff;
}

/** Step-level diff */
export interface StepDiff {
  /** Index in the diff array */
  diffIndex: number;
  /** Original wiki step index (-1 if local-only) */
  wikiStepIndex: number;
  /** Original local step index (-1 if wiki-only) */
  localStepIndex: number;
  /** The wiki step data (null if local-only) */
  wikiStep: WikiQuestStep | null;
  /** The local step data (null if wiki-only) */
  localStep: QuestStep | null;
  /** 0-1 similarity score for auto-alignment */
  alignmentScore: number;
  /** Whether user manually mapped this step */
  manuallyMapped: boolean;
  /** Whether this is a new step from wiki */
  isNewFromWiki: boolean;
  /** Whether this is a local-only step (not in wiki) */
  isLocalOnly: boolean;
  /** Field-level diffs */
  fields: StepFieldDiffs;
}

/** Undo/redo action types */
export type MergeActionType =
  | "accept_field"
  | "reject_field"
  | "toggle_item"
  | "remap_step"
  | "insert_step"
  | "accept_all"
  | "reject_all"
  | "accept_all_of_type";

/** Undo/redo action */
export interface MergeAction {
  type: MergeActionType;
  stepIndex: number;
  fieldName?: keyof StepFieldDiffs;
  itemIndex?: number;
  /** Snapshot of previous state for undo */
  previousState: unknown;
}

/** Focus state for keyboard navigation */
export interface MergeFocus {
  stepIndex: number;
  fieldName: keyof StepFieldDiffs | null;
  itemIndex: number | null;
}

/** Merge session state */
export interface MergeState {
  isOpen: boolean;
  questName: string | null;
  wikiSteps: WikiQuestStep[];
  localSteps: QuestStep[];
  stepDiffs: StepDiff[];
  undoStack: MergeAction[];
  redoStack: MergeAction[];
  focus: MergeFocus;
}

/** Alignment suggestion from step aligner */
export interface AlignmentSuggestion {
  wikiIndex: number;
  localIndex: number;
  score: number;
  reason: string;
}

/** Field names that can be merged */
export const MERGEABLE_FIELDS: (keyof StepFieldDiffs)[] = [
  "stepDescription",
  "itemsNeeded",
  "itemsRecommended",
  "dialogOptions",
  "additionalStepInformation",
];

/** Check if a field is an array field */
export function isArrayField(fieldName: keyof StepFieldDiffs): boolean {
  return fieldName !== "stepDescription";
}
