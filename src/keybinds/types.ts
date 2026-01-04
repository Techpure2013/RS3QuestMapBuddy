// src/keybinds/types.ts
// Type definitions for the keybind system

// Key combination representation
export interface KeyCombo {
  key: string; // e.g., "c", "1", "ArrowUp", "F1", "?"
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean; // Cmd on Mac
}

// Action categories for grouping in modal
export type KeybindCategory =
  | "collision"
  | "transport"
  | "path"
  | "radius"
  | "ui"
  | "navigation"
  | "general";

// Single keybind definition
export interface KeybindDef {
  id: string; // Unique identifier e.g., "collision.toggle"
  label: string; // Human-readable name
  description?: string; // Tooltip/help text
  category: KeybindCategory;
  defaultKey: KeyCombo | null; // null = unassigned by default
  // Action is set separately to avoid circular deps
}

// User customization storage format
export interface KeybindOverride {
  id: string;
  key: KeyCombo;
}

// Runtime keybind with merged user customization
export interface ResolvedKeybind extends KeybindDef {
  currentKey: KeyCombo | null; // null = not set
  isCustomized: boolean;
  action: () => void | Promise<void>;
}

// Category display labels
export const CATEGORY_LABELS: Record<KeybindCategory, string> = {
  collision: "Collision Editor",
  transport: "Transport Editor",
  path: "Path Editing",
  radius: "NPC/Object Radius",
  ui: "UI Toggles",
  navigation: "Navigation",
  general: "General",
};

// Category order for display
export const CATEGORY_ORDER: KeybindCategory[] = [
  "collision",
  "transport",
  "path",
  "radius",
  "ui",
  "navigation",
  "general",
];
