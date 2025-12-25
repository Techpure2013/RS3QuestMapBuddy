// src/state/exportsStore.ts
// Persistent storage for saved NPCs and Objects across quests

import type { NpcHighlight, ObjectHighlight } from "./types";

const STORAGE_KEY = "rs3qb:exports:v1";

export interface SavedNpc extends NpcHighlight {
  savedAt: number;
  sourceQuest?: string;
}

export interface SavedObject extends ObjectHighlight {
  savedAt: number;
  sourceQuest?: string;
}

export interface ExportsState {
  npcs: SavedNpc[];
  objects: SavedObject[];
}

type Listener = (state: ExportsState) => void;

const initialState: ExportsState = {
  npcs: [],
  objects: [],
};

let state: ExportsState = initialState;
const listeners = new Set<Listener>();

// Load from localStorage on init
function loadFromStorage(): ExportsState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ExportsState;
      return {
        npcs: parsed.npcs ?? [],
        objects: parsed.objects ?? [],
      };
    }
  } catch (e) {
    console.warn("Failed to load exports from storage:", e);
  }
  return initialState;
}

// Save to localStorage
function saveToStorage(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to save exports to storage:", e);
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

export const ExportsStore = {
  getState(): ExportsState {
    return state;
  },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  // Save an NPC to exports
  saveNpc(npc: NpcHighlight, sourceQuest?: string): void {
    const savedNpc: SavedNpc = {
      ...npc,
      savedAt: Date.now(),
      sourceQuest,
    };
    state = {
      ...state,
      npcs: [...state.npcs, savedNpc],
    };
    saveToStorage();
    notify();
  },

  // Save multiple NPCs to exports
  saveNpcs(npcs: NpcHighlight[], sourceQuest?: string): void {
    const savedNpcs: SavedNpc[] = npcs.map((npc) => ({
      ...npc,
      savedAt: Date.now(),
      sourceQuest,
    }));
    state = {
      ...state,
      npcs: [...state.npcs, ...savedNpcs],
    };
    saveToStorage();
    notify();
  },

  // Save an Object to exports
  saveObject(obj: ObjectHighlight, sourceQuest?: string): void {
    const savedObj: SavedObject = {
      ...obj,
      savedAt: Date.now(),
      sourceQuest,
    };
    state = {
      ...state,
      objects: [...state.objects, savedObj],
    };
    saveToStorage();
    notify();
  },

  // Save multiple Objects to exports
  saveObjects(objects: ObjectHighlight[], sourceQuest?: string): void {
    const savedObjects: SavedObject[] = objects.map((obj) => ({
      ...obj,
      savedAt: Date.now(),
      sourceQuest,
    }));
    state = {
      ...state,
      objects: [...state.objects, ...savedObjects],
    };
    saveToStorage();
    notify();
  },

  // Remove an NPC by index
  removeNpc(index: number): void {
    state = {
      ...state,
      npcs: state.npcs.filter((_, i) => i !== index),
    };
    saveToStorage();
    notify();
  },

  // Remove an Object by index
  removeObject(index: number): void {
    state = {
      ...state,
      objects: state.objects.filter((_, i) => i !== index),
    };
    saveToStorage();
    notify();
  },

  // Clear all NPCs
  clearNpcs(): void {
    state = { ...state, npcs: [] };
    saveToStorage();
    notify();
  },

  // Clear all Objects
  clearObjects(): void {
    state = { ...state, objects: [] };
    saveToStorage();
    notify();
  },

  // Clear everything
  clearAll(): void {
    state = { npcs: [], objects: [] };
    saveToStorage();
    notify();
  },
};

// React hook for subscribing to exports store
import { useSyncExternalStore } from "react";

export function useExportsStore(): ExportsState {
  return useSyncExternalStore(
    ExportsStore.subscribe,
    ExportsStore.getState,
    ExportsStore.getState
  );
}
