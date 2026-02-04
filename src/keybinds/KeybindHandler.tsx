// src/keybinds/KeybindHandler.tsx
// Global keyboard event listener component

import { useEffect } from "react";
import { keybindStore } from "./keybindStore";
import { keyEventMatches, isInputElement } from "./utils";

/**
 * Check if the event is the modal trigger (Ctrl+Shift+? or Ctrl+/)
 */
function isModalTrigger(e: KeyboardEvent): boolean {
  // Ctrl+Shift+? (Ctrl+Shift+/)
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "?" || e.key === "/")) {
    return true;
  }
  // Ctrl+/
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "/") {
    return true;
  }
  return false;
}

export const KeybindHandler: React.FC = () => {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Handle Escape to close modal
      if (e.key === "Escape" && keybindStore.modalOpen) {
        e.preventDefault();
        keybindStore.setModalOpen(false);
        return;
      }

      // Don't process keybinds when modal is open (except Escape above)
      if (keybindStore.modalOpen) {
        return;
      }

      // Handle modal trigger (Ctrl+Shift+? or Ctrl+/) - works everywhere including inputs
      if (isModalTrigger(e)) {
        e.preventDefault();
        keybindStore.setModalOpen(true);
        return;
      }

      // Skip other keybinds if typing in input/textarea
      if (isInputElement(e.target)) {
        return;
      }

      // Find matching keybind (skip unassigned keybinds where currentKey is null)
      const keybinds = keybindStore.getResolvedKeybinds();
      const match = keybinds.find(
        (kb) => kb.currentKey !== null && keyEventMatches(e, kb.currentKey)
      );

      if (match) {
        e.preventDefault();
        e.stopPropagation();
        try {
          void match.action();
        } catch (err) {
          console.error(`Keybind action failed for ${match.id}:`, err);
        }
      }
    };

    window.addEventListener("keydown", handler, { capture: true });
    return () => window.removeEventListener("keydown", handler, { capture: true });
  }, []);

  return null;
};
