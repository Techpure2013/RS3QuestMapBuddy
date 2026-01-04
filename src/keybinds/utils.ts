// src/keybinds/utils.ts
// Helper functions for keybind handling

import type { KeyCombo } from "./types";

/**
 * Format a KeyCombo for display (e.g., "Ctrl + Shift + C")
 * Returns "Not Set" for null combos
 */
export function formatKeyCombo(combo: KeyCombo | null): string {
  if (!combo) return "Not Set";

  const parts: string[] = [];

  if (combo.ctrl) parts.push("Ctrl");
  if (combo.alt) parts.push("Alt");
  if (combo.shift) parts.push("Shift");
  if (combo.meta) parts.push("Cmd");

  // Format key name nicely
  let keyName = combo.key;
  if (keyName === " ") keyName = "Space";
  else if (keyName === "ArrowUp") keyName = "↑";
  else if (keyName === "ArrowDown") keyName = "↓";
  else if (keyName === "ArrowLeft") keyName = "←";
  else if (keyName === "ArrowRight") keyName = "→";
  else if (keyName === "Escape") keyName = "Esc";
  else if (keyName === "Delete") keyName = "Del";
  else if (keyName === "Backspace") keyName = "Backspace";
  else if (keyName.length === 1) keyName = keyName.toUpperCase();

  parts.push(keyName);
  return parts.join(" + ");
}

/**
 * Compare two KeyCombos for equality
 */
export function keyCombosMatch(a: KeyCombo, b: KeyCombo): boolean {
  return (
    a.key.toLowerCase() === b.key.toLowerCase() &&
    !!a.ctrl === !!b.ctrl &&
    !!a.shift === !!b.shift &&
    !!a.alt === !!b.alt &&
    !!a.meta === !!b.meta
  );
}

/**
 * Check if a KeyboardEvent matches a KeyCombo
 */
export function keyEventMatches(e: KeyboardEvent, combo: KeyCombo): boolean {
  // Handle special case for ? which is Shift+/
  if (combo.key === "?") {
    if (e.key === "?" || (e.shiftKey && e.key === "/")) {
      // For ?, we only check if it's the ? key, modifiers are part of the key itself
      return !e.ctrlKey && !e.altKey && !e.metaKey;
    }
    return false;
  }

  // Normal key matching
  const keyMatches =
    e.key.toLowerCase() === combo.key.toLowerCase() ||
    e.code.toLowerCase() === combo.key.toLowerCase() ||
    e.code.toLowerCase() === `key${combo.key.toLowerCase()}`;

  const ctrlMatches = !!combo.ctrl === (e.ctrlKey || e.metaKey);
  const shiftMatches = !!combo.shift === e.shiftKey;
  const altMatches = !!combo.alt === e.altKey;

  return keyMatches && ctrlMatches && shiftMatches && altMatches;
}

/**
 * Parse a KeyboardEvent into a KeyCombo
 */
export function parseKeyComboFromEvent(e: KeyboardEvent): KeyCombo {
  return {
    key: e.key,
    ctrl: e.ctrlKey || e.metaKey,
    shift: e.shiftKey,
    alt: e.altKey,
  };
}

/**
 * Check if the event target is an input element where we shouldn't capture keybinds
 */
export function isInputElement(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toUpperCase();
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}
