// src/state/highlightSettingsStore.ts
// Persistent storage for user-customized auto-highlight word lists

import { useSyncExternalStore } from "react";
import {
  DEFAULT_ACTION_VERBS,
  DEFAULT_KILL_VERBS,
  DEFAULT_RS3_LOCATION_NAMES,
  DEFAULT_COMMON_WORD_EXCLUSIONS,
  DEFAULT_COMMON_WORDS,
  DEFAULT_GAME_TERMS,
  DEFAULT_LOCATION_NAMES,
} from "../data/highlightDefaults";

const STORAGE_KEY = "rs3qb:highlight-settings:v1";

export interface HighlightSettingsState {
  actionVerbs: string[];
  killVerbs: string[];
  rs3LocationNames: string[];
  commonWordExclusions: string[];
  commonWords: string[];
  gameTerms: string[];
  locationNames: string[];
}

type Listener = (state: HighlightSettingsState) => void;

function getDefaults(): HighlightSettingsState {
  return {
    actionVerbs: [...DEFAULT_ACTION_VERBS],
    killVerbs: [...DEFAULT_KILL_VERBS],
    rs3LocationNames: [...DEFAULT_RS3_LOCATION_NAMES],
    commonWordExclusions: [...DEFAULT_COMMON_WORD_EXCLUSIONS],
    commonWords: [...DEFAULT_COMMON_WORDS],
    gameTerms: [...DEFAULT_GAME_TERMS],
    locationNames: [...DEFAULT_LOCATION_NAMES],
  };
}

let state: HighlightSettingsState = getDefaults();
const listeners = new Set<Listener>();

// Load from localStorage on init
function loadFromStorage(): HighlightSettingsState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<HighlightSettingsState>;
      const defaults = getDefaults();
      return {
        actionVerbs: parsed.actionVerbs ?? defaults.actionVerbs,
        killVerbs: parsed.killVerbs ?? defaults.killVerbs,
        rs3LocationNames: parsed.rs3LocationNames ?? defaults.rs3LocationNames,
        commonWordExclusions: parsed.commonWordExclusions ?? defaults.commonWordExclusions,
        commonWords: parsed.commonWords ?? defaults.commonWords,
        gameTerms: parsed.gameTerms ?? defaults.gameTerms,
        locationNames: parsed.locationNames ?? defaults.locationNames,
      };
    }
  } catch (e) {
    console.warn("Failed to load highlight settings from storage:", e);
  }
  return getDefaults();
}

// Save to localStorage
function saveToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save highlight settings to storage:", e);
  }
}

// Notify listeners
function notify(): void {
  for (const listener of listeners) {
    listener(state);
  }
}

// Initialize state from storage
state = loadFromStorage();

// Escape special regex characters in a string
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const HighlightSettingsStore = {
  getState(): HighlightSettingsState {
    return state;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Add a word to a list (no duplicates)
  addWord(list: keyof HighlightSettingsState, word: string): void {
    const trimmed = word.trim();
    if (!trimmed) return;
    const current = state[list];
    if (current.some((w) => w.toLowerCase() === trimmed.toLowerCase())) return;
    state = { ...state, [list]: [...current, trimmed] };
    saveToStorage();
    notify();
  },

  // Remove a word from a list
  removeWord(list: keyof HighlightSettingsState, word: string): void {
    state = {
      ...state,
      [list]: state[list].filter((w) => w !== word),
    };
    saveToStorage();
    notify();
  },

  // Replace an entire list
  setList(list: keyof HighlightSettingsState, words: string[]): void {
    state = { ...state, [list]: words };
    saveToStorage();
    notify();
  },

  // Reset a single list to defaults
  resetList(list: keyof HighlightSettingsState): void {
    const defaults = getDefaults();
    state = { ...state, [list]: defaults[list] };
    saveToStorage();
    notify();
  },

  // Reset all lists to defaults
  resetAll(): void {
    state = getDefaults();
    saveToStorage();
    notify();
  },

  // Build action verb regex patterns from current state
  getActionPatterns(): RegExp[] {
    const verbs = state.actionVerbs;
    if (verbs.length === 0) return [];
    return [new RegExp(`\\b(${verbs.map(escapeRegex).join("|")})\\b`, "gi")];
  },

  // Build kill verb regex patterns from current state
  getKillPatterns(): RegExp[] {
    const verbs = state.killVerbs;
    if (verbs.length === 0) return [];
    return [new RegExp(`\\b(${verbs.map(escapeRegex).join("|")})\\b`, "gi")];
  },

  // Build location name regex patterns from current state
  getLocationPatterns(): RegExp[] {
    const names = state.locationNames;
    if (names.length === 0) return [];
    // Sort longest-first so "Varrock Palace" matches before "Varrock"
    const sorted = [...names].sort((a, b) => b.length - a.length);
    return sorted.map((name) => new RegExp(`\\b${escapeRegex(name)}\\b`, "gi"));
  },

  // Export current settings as JSON string for sharing
  exportToJson(): string {
    return JSON.stringify(state, null, 2);
  },

  // Import settings from JSON string (merge or replace)
  importFromJson(json: string, merge = false): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(json) as Partial<HighlightSettingsState>;
      const validKeys: (keyof HighlightSettingsState)[] = [
        "actionVerbs", "killVerbs", "rs3LocationNames",
        "commonWordExclusions", "commonWords", "gameTerms",
        "locationNames",
      ];

      // Validate that at least one valid key exists with an array value
      const hasValidData = validKeys.some(
        (k) => Array.isArray(parsed[k]) && parsed[k]!.length > 0
      );
      if (!hasValidData) {
        return { success: false, error: "No valid highlight settings found in file" };
      }

      if (merge) {
        // Merge: add new words that don't already exist (case-insensitive dedup)
        const newState = { ...state };
        for (const key of validKeys) {
          if (Array.isArray(parsed[key])) {
            const existing = new Set(state[key].map((w) => w.toLowerCase()));
            const toAdd = (parsed[key] as string[]).filter(
              (w) => typeof w === "string" && w.trim() && !existing.has(w.toLowerCase())
            );
            newState[key] = [...state[key], ...toAdd];
          }
        }
        state = newState;
      } else {
        // Replace: overwrite lists that exist in the import, keep others
        const newState = { ...state };
        for (const key of validKeys) {
          if (Array.isArray(parsed[key])) {
            newState[key] = (parsed[key] as string[]).filter(
              (w) => typeof w === "string" && w.trim()
            );
          }
        }
        state = newState;
      }

      saveToStorage();
      notify();
      return { success: true };
    } catch {
      return { success: false, error: "Invalid JSON format" };
    }
  },
};

// React hook for subscribing to highlight settings store
export function useHighlightSettings(): HighlightSettingsState {
  return useSyncExternalStore(
    HighlightSettingsStore.subscribe,
    HighlightSettingsStore.getState,
    HighlightSettingsStore.getState
  );
}
