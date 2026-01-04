// src/keybinds/keybindStore.ts
// State management for keybinds (follows collisionEditorState pattern)

import type { KeyCombo, KeybindOverride, KeybindDef, ResolvedKeybind } from "./types";
import { keyCombosMatch } from "./utils";

const STORAGE_KEY = "rs3qb:keybinds:v1";

// Default keybind definitions - will be populated by defaults.ts
let defaultKeybinds: KeybindDef[] = [];
// Action map - populated by actions.ts to avoid circular deps
const actionMap = new Map<string, () => void | Promise<void>>();

export const keybindStore = {
  // State
  modalOpen: false,
  editingKeybind: null as string | null,
  overrides: [] as KeybindOverride[],
  listeners: new Set<() => void>(),

  // Set default keybinds (called from defaults.ts)
  setDefaults(defs: KeybindDef[]) {
    defaultKeybinds = defs;
  },

  // Register an action (called from actions.ts)
  registerAction(id: string, action: () => void | Promise<void>) {
    actionMap.set(id, action);
  },

  // Initialize - load from localStorage
  initialize() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.overrides = parsed;
        }
      }
    } catch (e) {
      console.warn("Failed to load keybinds from localStorage:", e);
    }
  },

  // Save to localStorage
  persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.overrides));
    } catch (e) {
      console.warn("Failed to save keybinds to localStorage:", e);
    }
  },

  // Get resolved keybinds (defaults merged with overrides)
  getResolvedKeybinds(): ResolvedKeybind[] {
    return defaultKeybinds.map((def) => {
      const override = this.overrides.find((o) => o.id === def.id);
      return {
        ...def,
        currentKey: override?.key ?? def.defaultKey,
        isCustomized: !!override,
        action: actionMap.get(def.id) ?? (() => {}),
      };
    });
  },

  // Get a single resolved keybind by ID
  getKeybind(id: string): ResolvedKeybind | undefined {
    return this.getResolvedKeybinds().find((kb) => kb.id === id);
  },

  // Set/update a keybind
  setKeybind(id: string, key: KeyCombo) {
    const existingIdx = this.overrides.findIndex((o) => o.id === id);
    if (existingIdx >= 0) {
      this.overrides[existingIdx].key = key;
    } else {
      this.overrides.push({ id, key });
    }
    this.persist();
    this.notifyListeners();
  },

  // Reset a single keybind to default
  resetKeybind(id: string) {
    this.overrides = this.overrides.filter((o) => o.id !== id);
    this.persist();
    this.notifyListeners();
  },

  // Reset all keybinds to defaults
  resetAll() {
    this.overrides = [];
    this.persist();
    this.notifyListeners();
  },

  // Check for conflicts with a given key combo
  findConflicts(key: KeyCombo, excludeId?: string): string[] {
    return this.getResolvedKeybinds()
      .filter(
        (kb) =>
          kb.id !== excludeId &&
          kb.currentKey !== null &&
          keyCombosMatch(kb.currentKey, key)
      )
      .map((kb) => kb.id);
  },

  // Modal state management
  setModalOpen(open: boolean) {
    this.modalOpen = open;
    if (!open) {
      this.editingKeybind = null;
    }
    this.notifyListeners();
  },

  toggleModal() {
    this.setModalOpen(!this.modalOpen);
  },

  setEditingKeybind(id: string | null) {
    this.editingKeybind = id;
    this.notifyListeners();
  },

  // Subscribe pattern for React components
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  },

  notifyListeners() {
    this.listeners.forEach((l) => l());
  },
};
