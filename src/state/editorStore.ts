// src/state/editorStore.ts
import { get, set } from "idb-keyval";
import { produce, Draft } from "immer";
import type {
  EditorState,
  DerivedSelectors,
  SelectionState,
  UiState,
  HighlightState,
  RestrictedPlotMode,
} from "./model";
import {
  type Quest,
  type QuestImage,
  type NpcHighlight,
  type Clipboard,
  questToBundle,
} from "../state/types";
import { saveActiveBundle } from "idb/bundleStore";
import { createDefaultQuest } from "./defaults";
import { clearObservedChatheads } from "./../idb/chatheadsObserved";

type Listener = (changedKeys: ReadonlySet<string>, next: EditorState) => void;

const STORAGE_KEY = "rs3qb:editor_state:v3";
const CURRENT_VERSION = 3;

const initialState: EditorState = {
  version: CURRENT_VERSION,
  quest: null,
  clipboard: { type: "none", data: null },
  selection: {
    selectedStep: 0,
    targetType: "npc",
    targetIndex: 0,
    floor: 0,
    chatheadVariant: "default", // NEW: Default chathead variant
  },
  ui: {
    panelOpen: true,
    showGrids: true,
    stepDescriptionEdit: false,
    captureMode: "single",
    wanderRadiusInput: 5,
    imageDirectoryName: "",
    isAlt1Environment: false,
    areaSearchMode: null,
    restrictedMode: null,
    selectedObjectColor: "#FFFFFF",
    objectNumberLabel: "",
  },
  highlights: {
    highlightedNpc: null,
    highlightedObject: null,
    selectedObjectFromSearch: null,
    selectedArea: null,
  },
};

let state: EditorState = initialState;
const listeners = new Set<Listener>();

// Debounced persistence
let persistTimer: number | null = null;
const schedulePersist = () => {
  if (persistTimer !== null) window.clearTimeout(persistTimer);
  persistTimer = window.setTimeout(() => {
    void set(STORAGE_KEY, JSON.stringify(state));
    persistTimer = null;
  }, 150);
};

export function requestFlyToCurrentTargetAt(
  zoom: number,
  source: "selection" | "quest-load" | "auto-select" | "external" = "external"
): void {
  const ui = EditorStore.getState().ui;
  const nextSeq = (ui.targetNavSeq ?? 0) + 1;
  EditorStore.setUi({
    targetNavSeq: nextSeq,
    targetZoom: zoom,
    flyToTargetRequest: { token: nextSeq, source },
  });
}

export function autoGrow(el: HTMLTextAreaElement): void {
  el.style.height = "auto";
  el.style.overflow = "hidden";
  el.style.height = `${el.scrollHeight}px`;
}

export function requestCaptureNavReturn(
  includeSelection: boolean = true
): void {
  const ui = EditorStore.getState().ui;
  const next = (ui.captureNavSeq ?? 0) + 1;
  EditorStore.setUi({
    captureNavSeq: next,
    captureNavReturnRequest: { token: next, includeSelection },
  });
}

export function requestRestoreView(clearReturn: boolean = true): void {
  const ui = EditorStore.getState().ui;
  const next = (ui.restoreNavSeq ?? 0) + 1;
  EditorStore.setUi({
    restoreNavSeq: next,
    restoreViewRequest: { token: next, clearReturn },
  });
}

export function requestFlyToAreaAt(
  area: {
    name: string;
    bounds: [[number, number], [number, number]];
    center: [number, number];
    mapId: number;
  },
  zoom: number
): void {
  const ui = EditorStore.getState().ui;
  const nextSeq = (ui.areaNavSeq ?? 0) + 1;
  EditorStore.setUi({
    areaNavSeq: nextSeq,
    areaFlyRequest: {
      token: nextSeq,
      area,
      preferredZoom: zoom,
    },
    areaZoom: zoom,
  });
}

function migrate(raw: EditorState): EditorState {
  if (!raw || typeof raw.version !== "number") return initialState;

  // NEW: Ensure chatheadVariant exists on migrated state
  const migrated = { ...initialState, ...raw, version: CURRENT_VERSION };
  if (!migrated.selection.chatheadVariant) {
    migrated.selection.chatheadVariant = "default";
  }

  return migrated;
}

function hasValidLoc(loc?: { lat: number; lng: number } | null): boolean {
  return !!loc && (loc.lat !== 0 || loc.lng !== 0);
}

const isEqualShallow = (a: unknown, b: unknown): boolean => {
  if (Object.is(a, b)) return true;
  if (
    typeof a !== "object" ||
    typeof b !== "object" ||
    a === null ||
    b === null
  )
    return false;
  const ak = Object.keys(a as Record<string, unknown>);
  const bk = Object.keys(b as Record<string, unknown>);
  if (ak.length !== bk.length) return false;
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
    if (!Object.is((a as any)[k], (b as any)[k])) return false;
  }
  return true;
};

export const EditorStore = {
  // Load from IDB at app boot
  async initialize(): Promise<void> {
    try {
      const raw = await get<string>(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as EditorState;
      state = migrate(parsed);
    } catch {
      // ignore; keep initial
    }
  },

  autoSelectFirstValidTargetForStep(stepIndex: number): void {
    const q = state.quest;
    if (!q || !q.questSteps || !q.questSteps[stepIndex]) return;
    const step = q.questSteps[stepIndex];
    const npcs = step.highlights?.npc ?? [];
    const objects = step.highlights?.object ?? [];

    // Priority: NPC with valid location
    const firstNpcIdx = npcs.findIndex((n) => hasValidLoc(n?.npcLocation));
    if (firstNpcIdx >= 0) {
      this.setSelection({
        selectedStep: stepIndex,
        targetType: "npc",
        targetIndex: firstNpcIdx,
        floor:
          typeof step.floor === "number" ? step.floor : state.selection.floor,
      });
      return;
    }

    // Else: first object with any valid location in its array
    const firstObjIdx = objects.findIndex((o) =>
      (o?.objectLocation ?? []).some((p) => hasValidLoc(p))
    );
    if (firstObjIdx >= 0) {
      this.setSelection({
        selectedStep: stepIndex,
        targetType: "object",
        targetIndex: firstObjIdx,
        floor:
          typeof step.floor === "number" ? step.floor : state.selection.floor,
      });
      return;
    }

    // Nothing valid: keep targetType but reset index to 0 safely; sync floor
    this.setSelection({
      selectedStep: stepIndex,
      targetIndex: 0,
      floor:
        typeof step.floor === "number" ? step.floor : state.selection.floor,
    });
  },

  async newQuest(): Promise<void> {
    const q = createDefaultQuest();
    // Replace quest
    this.setQuest(q);
    await clearObservedChatheads();
    window.dispatchEvent(new CustomEvent("chatheadQueuesChanged"));
    // Reset selection and UI
    this.setSelection({
      selectedStep: 0,
      targetType: "npc",
      targetIndex: 0,
      floor: 0,
      chatheadVariant: "default", // NEW: Reset variant on new quest
    });
    this.setClipboard({ type: "none", data: null });
    this.setHighlights({
      highlightedNpc: null,
      highlightedObject: null,
      selectedObjectFromSearch: null,
      selectedArea: null,
    });

    // Persist locally
    await saveActiveBundle(questToBundle(q));
  },

  getState(): EditorState {
    return state;
  },

  // Derived selectors that compute on demand (not persisted)
  derived: {
    selectedStep(): Quest["questSteps"][number] | undefined {
      const q = state.quest;
      return q?.questSteps?.[state.selection.selectedStep];
    },
    currentTarget() {
      const step = this.selectedStep();
      if (!step) return undefined;
      const { targetType, targetIndex } = state.selection;
      return step.highlights?.[targetType]?.[targetIndex];
    },
    canRecordNpcLocation(): boolean {
      const t = this.currentTarget();
      if (!t) return false;
      if ("npcLocation" in (t as NpcHighlight)) {
        const loc = (t as NpcHighlight).npcLocation;
        return Boolean(
          (t as NpcHighlight).id && loc && (loc.lat !== 0 || loc.lng !== 0)
        );
      }
      return false;
    },
  } as DerivedSelectors,

  // Subscribe to specific slices to minimize re-renders
  subscribe<T>(
    selector: (s: EditorState, d: DerivedSelectors) => T,
    cb: (value: T) => void
  ): () => void {
    let last = selector(state, this.derived);
    cb(last);
    const listener: Listener = (_changed, next) => {
      const selected = selector(next, this.derived);
      if (!isEqualShallow(selected as unknown, last as unknown)) {
        last = selected;
        cb(selected);
      }
    };
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Low-level update API with Immer recipe
  update(recipe: (draft: Draft<EditorState>) => void, changedKeys?: string[]) {
    const next = produce(state, recipe);
    if (next === state) return;
    state = next;

    console.debug(
      "[EditorStore.update] changed:",
      Array.from(new Set(changedKeys ?? [])).join(",") || "(unknown)",
      "at",
      performance.now().toFixed(2)
    );

    schedulePersist();
    const changed = new Set<string>(changedKeys ?? []);
    for (const l of Array.from(listeners)) l(changed, state);
  },

  // Convenience setters with explicit changedKeys
  setQuest(q: Quest) {
    this.update(
      (draft) => {
        draft.quest = q;

        const step0 = q.questSteps?.[0];
        let nextSelection = {
          ...draft.selection,
          selectedStep: 0,
          floor: step0?.floor ?? 0,
          targetType: draft.selection.targetType,
          targetIndex: 0,
          chatheadVariant: draft.selection.chatheadVariant ?? "default", // NEW: Preserve variant
        };

        if (step0?.highlights) {
          const hasValidLoc = (loc?: { lat: number; lng: number }) =>
            !!loc && (loc.lat !== 0 || loc.lng !== 0);

          const npcIdx =
            step0.highlights.npc?.findIndex((n) =>
              hasValidLoc(n?.npcLocation)
            ) ?? -1;

          const objIdx =
            step0.highlights.object?.findIndex((o) =>
              (o?.objectLocation ?? []).some(hasValidLoc)
            ) ?? -1;

          if (npcIdx >= 0) {
            nextSelection.targetType = "npc";
            nextSelection.targetIndex = npcIdx;
          } else if (objIdx >= 0) {
            nextSelection.targetType = "object";
            nextSelection.targetIndex = objIdx;
          } else {
            // keep current type, index 0
            nextSelection.targetIndex = 0;
          }
        }

        draft.selection = nextSelection;
      },
      ["quest", "selection"]
    );
  },

  patchQuest(mutator: (draft: Draft<Quest>) => void) {
    if (!state.quest) return;
    this.update(
      (draft) => {
        if (!draft.quest) return;
        mutator(draft.quest);
      },
      ["quest"]
    );
  },

  setQuestImages(images: QuestImage[]) {
    this.update(
      (draft) => {
        if (!draft.quest) return;
        draft.quest.questImages = images;
      },
      ["quest"]
    );
  },

  setSelection(patch: Partial<SelectionState>) {
    this.update(
      (draft) => {
        draft.selection = { ...draft.selection, ...patch };
      },
      ["selection"]
    );
  },

  setUi(patch: Partial<UiState>) {
    this.update(
      (draft) => {
        draft.ui = { ...draft.ui, ...patch };
      },
      ["ui"]
    );
  },

  setHighlights(patch: Partial<HighlightState>) {
    this.update(
      (draft) => {
        draft.highlights = { ...draft.highlights, ...patch };
      },
      ["highlights"]
    );
  },

  setClipboard(clipboard: Clipboard) {
    this.update(
      (draft) => {
        draft.clipboard = clipboard;
      },
      ["clipboard"]
    );
  },

  reset() {
    this.update(
      (draft) => {
        Object.assign(draft, initialState);
        draft.ui.restrictedMode = null;
      },
      ["quest", "selection", "ui", "highlights", "clipboard"]
    );
  },

  enableRestrictedMode(cfg: {
    enabled: boolean;
    stepIndex: number;
    stepId: number;
    allowNpc: boolean;
    allowObject: boolean;
    allowRadius: boolean;
    defaultPlayerName?: string;
  }): void {
    this.setUi({ restrictedMode: { ...cfg } });
    const sel = this.getState().selection;
    if (sel.selectedStep !== cfg.stepIndex) {
      this.setSelection({ selectedStep: cfg.stepIndex, targetIndex: 0 });
    }
    if (cfg.allowNpc && !cfg.allowObject) {
      this.setUi({ captureMode: "single" });
    } else if (!cfg.allowNpc && cfg.allowObject) {
      this.setUi({ captureMode: "multi-point" });
    }
  },

  disableRestrictedMode(): void {
    this.setUi({ restrictedMode: null });
  },
};

export default EditorStore;
