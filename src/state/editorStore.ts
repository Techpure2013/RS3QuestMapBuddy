import { get, set } from "idb-keyval";
import { produce, Draft } from "immer";
import type {
  EditorState,
  DerivedSelectors,
  SelectionState,
  UiState,
  HighlightState,
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

function migrate(raw: EditorState): EditorState {
  if (!raw || typeof raw.version !== "number") return initialState;
  return { ...initialState, ...raw, version: CURRENT_VERSION };
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
    schedulePersist();
    const changed = new Set<string>(changedKeys ?? []);
    for (const l of Array.from(listeners)) l(changed, state);
  },

  // Convenience setters with explicit changedKeys
  setQuest(q: Quest) {
    this.update(
      (draft) => {
        draft.quest = q;

        // NEW: Auto-select appropriate target based on what's available in step 0
        const step = q.questSteps?.[0];
        if (step?.highlights) {
          const hasValidNpc = step.highlights.npc?.some(
            (npc) =>
              npc.npcLocation &&
              (npc.npcLocation.lat !== 0 || npc.npcLocation.lng !== 0)
          );
          const hasValidObject = step.highlights.object?.some((obj) =>
            obj.objectLocation?.some((loc) => loc.lat !== 0 || loc.lng !== 0)
          );

          // Priority: NPC first, then object
          if (hasValidNpc) {
            draft.selection = {
              ...draft.selection,
              selectedStep: 0,
              targetIndex: 0,
              targetType: "npc",
              floor: step.floor ?? 0,
            };
          } else if (hasValidObject) {
            draft.selection = {
              ...draft.selection,
              selectedStep: 0,
              targetIndex: 0,
              targetType: "object",
              floor: step.floor ?? 0,
            };
          } else {
            // No valid targets, just reset to step 0
            draft.selection = {
              ...draft.selection,
              selectedStep: 0,
              targetIndex: 0,
              floor: step.floor ?? 0,
            };
          }
        } else {
          // No highlights at all, reset to defaults
          draft.selection = {
            ...draft.selection,
            selectedStep: 0,
            targetIndex: 0,
            floor: q.questSteps?.[0]?.floor ?? 0,
          };
        }
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
      },
      ["quest", "selection", "ui", "highlights", "clipboard"]
    );
  },
};
