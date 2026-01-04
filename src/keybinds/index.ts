// src/keybinds/index.ts
// Barrel export for keybind system

export * from "./types";
export * from "./utils";
export { keybindStore } from "./keybindStore";
export { KeybindHandler } from "./KeybindHandler";
export { KeybindModal } from "./KeybindModal";
export { KeybindRow } from "./KeybindRow";
export { KeybindToast } from "./KeybindToast";
export { TransportWheel } from "./TransportWheel";
export {
  collisionActions,
  transportActions,
  pathActions,
  uiActions,
  navigationActions,
  generalActions,
  registerAllActions,
} from "./actions";
export { DEFAULT_KEYBINDS, initializeDefaults } from "./defaults";

// Initialize function to be called from app.tsx
import { keybindStore } from "./keybindStore";
import { registerAllActions } from "./actions";
import { initializeDefaults } from "./defaults";

export function initializeKeybinds() {
  // Register default keybind definitions
  initializeDefaults();

  // Register action handlers
  registerAllActions();

  // Load user customizations from localStorage
  keybindStore.initialize();

  console.log("%c⌨️ Keybind system initialized. Press ? to view shortcuts.", "color: #60a5fa; font-weight: bold");
}
