// src/state/mergeStore.ts
// Merge session state management (same pattern as EditorStore)

import { produce, type Draft } from "immer";
import type { WikiQuestStep } from "../api/wikiApi";
import type { QuestStep } from "./types";
import type {
  MergeState,
  MergeFocus,
  MergeAction,
  StepDiff,
  StepFieldDiffs,
  ArrayFieldDiff,
} from "../types/merge";
import { computeStepDiffs } from "../utils/merge/diffEngine";
import { applyArraySelections } from "../utils/merge/arrayDiff";
import { EditorStore } from "./editorStore";
import { saveActiveBundle } from "../idb/bundleStore";
import { questToBundle } from "./types";

type MergeListener = (changedKeys: ReadonlySet<string>, next: MergeState) => void;

const initialState: MergeState = {
  isOpen: false,
  questName: null,
  wikiSteps: [],
  localSteps: [],
  stepDiffs: [],
  undoStack: [],
  redoStack: [],
  focus: { stepIndex: 0, fieldName: null, itemIndex: null },
};

let state: MergeState = { ...initialState };
const listeners = new Set<MergeListener>();

const isEqualShallow = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  const ak = Object.keys(a as Record<string, unknown>);
  const bk = Object.keys(b as Record<string, unknown>);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
  }
  return true;
};

export const MergeStore = {
  getState(): MergeState {
    return state;
  },

  // Core update with Immer
  update(recipe: (draft: Draft<MergeState>) => void, changedKeys?: string[]) {
    const next = produce(state, recipe);
    if (next === state) return;
    state = next;

    console.debug(
      "[MergeStore.update] changed:",
      changedKeys?.join(",") || "(unknown)"
    );

    const changed = new Set<string>(changedKeys ?? []);
    for (const l of Array.from(listeners)) l(changed, state);
  },

  // Subscribe with selector (same pattern as EditorStore)
  // Note: Does NOT call cb immediately - useSyncExternalStore handles initial read via getSnapshot
  subscribe<T>(selector: (s: MergeState) => T, cb: (value: T) => void): () => void {
    let last = selector(state);
    const listener: MergeListener = (_changed, next) => {
      const selected = selector(next);
      if (!isEqualShallow(selected as unknown, last as unknown)) {
        last = selected;
        cb(selected);
      }
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Derived selectors
  derived: {
    focusedDiff(): StepDiff | undefined {
      return state.stepDiffs[state.focus.stepIndex];
    },
    canUndo(): boolean {
      return state.undoStack.length > 0;
    },
    canRedo(): boolean {
      return state.redoStack.length > 0;
    },
    pendingDecisions(): number {
      let count = 0;
      for (const diff of state.stepDiffs) {
        for (const field of Object.values(diff.fields)) {
          if (field.status !== "same" && field.accepted === null) count++;
        }
      }
      return count;
    },
    totalDecisions(): number {
      let count = 0;
      for (const diff of state.stepDiffs) {
        for (const field of Object.values(diff.fields)) {
          if (field.status !== "same") count++;
        }
      }
      return count;
    },
    getMergedSteps(): QuestStep[] {
      const result: QuestStep[] = [];

      for (const diff of state.stepDiffs) {
        // Skip local-only steps if user rejected them (accepted === false would mean remove)
        // For now, always include local-only steps
        if (diff.isLocalOnly && diff.localStep) {
          result.push({ ...diff.localStep });
          continue;
        }

        // For new wiki steps, only include if any field is accepted
        if (diff.isNewFromWiki) {
          const anyAccepted = Object.values(diff.fields).some((f) => f.accepted === true);
          if (!anyAccepted) continue;
        }

        // Build merged step
        const baseStep = diff.localStep || createEmptyStep();
        const mergedStep: QuestStep = {
          ...baseStep,
          stepDescription: resolveTextField(diff.fields.stepDescription, baseStep.stepDescription),
          itemsNeeded: resolveArrayField(diff.fields.itemsNeeded, baseStep.itemsNeeded),
          itemsRecommended: resolveArrayField(diff.fields.itemsRecommended, baseStep.itemsRecommended),
          dialogOptions: resolveArrayField(diff.fields.dialogOptions, baseStep.dialogOptions),
          additionalStepInformation: resolveArrayField(
            diff.fields.additionalStepInformation,
            baseStep.additionalStepInformation
          ),
          // Always preserve local-only fields
          highlights: baseStep.highlights,
          floor: baseStep.floor,
          stepId: baseStep.stepId,
          pathToStep: baseStep.pathToStep,
        };

        result.push(mergedStep);
      }

      return result;
    },
  },

  // === Actions ===

  openMerge(questName: string, wikiSteps: WikiQuestStep[], localSteps: QuestStep[]) {
    const stepDiffs = computeStepDiffs(wikiSteps, localSteps);
    this.update((draft) => {
      draft.isOpen = true;
      draft.questName = questName;
      draft.wikiSteps = wikiSteps;
      draft.localSteps = localSteps;
      draft.stepDiffs = stepDiffs;
      draft.undoStack = [];
      draft.redoStack = [];
      draft.focus = { stepIndex: 0, fieldName: null, itemIndex: null };
    }, ["isOpen", "questName", "wikiSteps", "localSteps", "stepDiffs", "undoStack", "redoStack", "focus"]);
  },

  closeMerge() {
    this.update((draft) => {
      Object.assign(draft, initialState);
    }, ["isOpen", "questName", "stepDiffs"]);
  },

  // Field operations
  acceptField(stepIndex: number, fieldName: keyof StepFieldDiffs) {
    this.update((draft) => {
      const field = draft.stepDiffs[stepIndex]?.fields[fieldName];
      if (field && field.status !== "same") {
        draft.undoStack.push({
          type: "accept_field",
          stepIndex,
          fieldName,
          previousState: { accepted: field.accepted },
        });
        draft.redoStack = [];
        field.accepted = true;
      }
    }, ["stepDiffs", "undoStack", "redoStack"]);
  },

  rejectField(stepIndex: number, fieldName: keyof StepFieldDiffs) {
    this.update((draft) => {
      const field = draft.stepDiffs[stepIndex]?.fields[fieldName];
      if (field && field.status !== "same") {
        draft.undoStack.push({
          type: "reject_field",
          stepIndex,
          fieldName,
          previousState: { accepted: field.accepted },
        });
        draft.redoStack = [];
        field.accepted = false;
      }
    }, ["stepDiffs", "undoStack", "redoStack"]);
  },

  toggleArrayItem(stepIndex: number, fieldName: keyof StepFieldDiffs, itemIndex: number) {
    this.update((draft) => {
      const field = draft.stepDiffs[stepIndex]?.fields[fieldName] as ArrayFieldDiff | undefined;
      if (field && "items" in field && field.items[itemIndex]) {
        const item = field.items[itemIndex];
        draft.undoStack.push({
          type: "toggle_item",
          stepIndex,
          fieldName,
          itemIndex,
          previousState: { selected: item.selected },
        });
        draft.redoStack = [];
        item.selected = !item.selected;
      }
    }, ["stepDiffs", "undoStack", "redoStack"]);
  },

  // Bulk operations
  acceptAll() {
    this.update((draft) => {
      const previousStates: { stepIndex: number; fieldName: string; accepted: boolean | null }[] = [];

      for (let i = 0; i < draft.stepDiffs.length; i++) {
        for (const [fieldName, field] of Object.entries(draft.stepDiffs[i].fields)) {
          if (field.status !== "same" && field.accepted !== true) {
            previousStates.push({ stepIndex: i, fieldName, accepted: field.accepted });
            field.accepted = true;
          }
        }
      }

      if (previousStates.length > 0) {
        draft.undoStack.push({
          type: "accept_all",
          stepIndex: -1,
          previousState: previousStates,
        });
        draft.redoStack = [];
      }
    }, ["stepDiffs", "undoStack", "redoStack"]);
  },

  rejectAll() {
    this.update((draft) => {
      const previousStates: { stepIndex: number; fieldName: string; accepted: boolean | null }[] = [];

      for (let i = 0; i < draft.stepDiffs.length; i++) {
        for (const [fieldName, field] of Object.entries(draft.stepDiffs[i].fields)) {
          if (field.status !== "same" && field.accepted !== false) {
            previousStates.push({ stepIndex: i, fieldName, accepted: field.accepted });
            field.accepted = false;
          }
        }
      }

      if (previousStates.length > 0) {
        draft.undoStack.push({
          type: "reject_all",
          stepIndex: -1,
          previousState: previousStates,
        });
        draft.redoStack = [];
      }
    }, ["stepDiffs", "undoStack", "redoStack"]);
  },

  acceptAllOfType(fieldName: keyof StepFieldDiffs) {
    this.update((draft) => {
      const previousStates: { stepIndex: number; accepted: boolean | null }[] = [];

      for (let i = 0; i < draft.stepDiffs.length; i++) {
        const field = draft.stepDiffs[i].fields[fieldName];
        if (field.status !== "same" && field.accepted !== true) {
          previousStates.push({ stepIndex: i, accepted: field.accepted });
          field.accepted = true;
        }
      }

      if (previousStates.length > 0) {
        draft.undoStack.push({
          type: "accept_all_of_type",
          stepIndex: -1,
          fieldName,
          previousState: previousStates,
        });
        draft.redoStack = [];
      }
    }, ["stepDiffs", "undoStack", "redoStack"]);
  },

  // Undo/Redo
  undo() {
    const action = state.undoStack[state.undoStack.length - 1];
    if (!action) return;

    this.update((draft) => {
      const popped = draft.undoStack.pop();
      if (!popped) return;

      draft.redoStack.push(popped);

      // Restore previous state based on action type
      if (popped.type === "accept_field" || popped.type === "reject_field") {
        const field = draft.stepDiffs[popped.stepIndex]?.fields[popped.fieldName!];
        if (field) {
          field.accepted = (popped.previousState as { accepted: boolean | null }).accepted;
        }
      } else if (popped.type === "toggle_item") {
        const field = draft.stepDiffs[popped.stepIndex]?.fields[popped.fieldName!] as ArrayFieldDiff;
        if (field?.items[popped.itemIndex!]) {
          field.items[popped.itemIndex!].selected = (popped.previousState as { selected: boolean }).selected;
        }
      } else if (popped.type === "accept_all" || popped.type === "reject_all") {
        const states = popped.previousState as { stepIndex: number; fieldName: string; accepted: boolean | null }[];
        for (const s of states) {
          const field = draft.stepDiffs[s.stepIndex]?.fields[s.fieldName as keyof StepFieldDiffs];
          if (field) field.accepted = s.accepted;
        }
      } else if (popped.type === "accept_all_of_type") {
        const states = popped.previousState as { stepIndex: number; accepted: boolean | null }[];
        for (const s of states) {
          const field = draft.stepDiffs[s.stepIndex]?.fields[popped.fieldName!];
          if (field) field.accepted = s.accepted;
        }
      }
    }, ["stepDiffs", "undoStack", "redoStack"]);
  },

  redo() {
    const action = state.redoStack[state.redoStack.length - 1];
    if (!action) return;

    this.update((draft) => {
      const popped = draft.redoStack.pop();
      if (!popped) return;

      draft.undoStack.push(popped);

      // Re-apply action
      if (popped.type === "accept_field") {
        const field = draft.stepDiffs[popped.stepIndex]?.fields[popped.fieldName!];
        if (field) field.accepted = true;
      } else if (popped.type === "reject_field") {
        const field = draft.stepDiffs[popped.stepIndex]?.fields[popped.fieldName!];
        if (field) field.accepted = false;
      } else if (popped.type === "toggle_item") {
        const field = draft.stepDiffs[popped.stepIndex]?.fields[popped.fieldName!] as ArrayFieldDiff;
        if (field?.items[popped.itemIndex!]) {
          field.items[popped.itemIndex!].selected = !field.items[popped.itemIndex!].selected;
        }
      } else if (popped.type === "accept_all") {
        for (const diff of draft.stepDiffs) {
          for (const field of Object.values(diff.fields)) {
            if (field.status !== "same") field.accepted = true;
          }
        }
      } else if (popped.type === "reject_all") {
        for (const diff of draft.stepDiffs) {
          for (const field of Object.values(diff.fields)) {
            if (field.status !== "same") field.accepted = false;
          }
        }
      } else if (popped.type === "accept_all_of_type") {
        for (const diff of draft.stepDiffs) {
          const field = diff.fields[popped.fieldName!];
          if (field.status !== "same") field.accepted = true;
        }
      }
    }, ["stepDiffs", "undoStack", "redoStack"]);
  },

  // Navigation
  setFocus(stepIndex: number, fieldName: keyof StepFieldDiffs | null = null, itemIndex: number | null = null) {
    this.update((draft) => {
      draft.focus = { stepIndex, fieldName, itemIndex };
    }, ["focus"]);
  },

  focusNextStep() {
    this.update((draft) => {
      if (draft.focus.stepIndex < draft.stepDiffs.length - 1) {
        draft.focus.stepIndex++;
        draft.focus.fieldName = null;
        draft.focus.itemIndex = null;
      }
    }, ["focus"]);
  },

  focusPrevStep() {
    this.update((draft) => {
      if (draft.focus.stepIndex > 0) {
        draft.focus.stepIndex--;
        draft.focus.fieldName = null;
        draft.focus.itemIndex = null;
      }
    }, ["focus"]);
  },

  // Apply merge to EditorStore
  applyMerge() {
    const mergedSteps = this.derived.getMergedSteps();
    const quest = EditorStore.getState().quest;

    if (!quest) {
      console.error("[MergeStore] No quest loaded");
      return;
    }

    EditorStore.patchQuest((draft) => {
      draft.questSteps = mergedSteps;
    });

    // Save to IndexedDB
    const updatedQuest = EditorStore.getState().quest;
    if (updatedQuest) {
      saveActiveBundle(questToBundle(updatedQuest));
    }

    this.closeMerge();
  },
};

// Helper: resolve text field value based on acceptance
function resolveTextField(field: { accepted: boolean | null; wikiValue: string; localValue: string }, fallback?: string): string {
  if (field.accepted === true) return field.wikiValue;
  if (field.accepted === false) return field.localValue;
  return fallback || field.localValue || field.wikiValue;
}

// Helper: resolve array field value based on acceptance and item selections
function resolveArrayField(field: ArrayFieldDiff, fallback?: string[]): string[] {
  if (field.accepted === true) {
    // Use wiki value with item selections
    return applyArraySelections(field.items);
  }
  if (field.accepted === false) {
    return fallback || [];
  }
  // Undecided - keep local
  return fallback || [];
}

// Helper: create empty step structure
function createEmptyStep(): QuestStep {
  return {
    stepDescription: "",
    itemsNeeded: [],
    itemsRecommended: [],
    dialogOptions: [],
    additionalStepInformation: [],
    highlights: { npc: [], object: [] },
    floor: 0,
  };
}
