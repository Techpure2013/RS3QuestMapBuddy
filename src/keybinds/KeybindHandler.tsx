// src/keybinds/KeybindHandler.tsx
// Global keyboard event listener component

import { useEffect } from "react";
import { keybindStore } from "./keybindStore";
import { keyEventMatches, isInputElement } from "./utils";

/**
 * Check if the event is the modal trigger (? or Ctrl+/)
 */
function isModalTrigger(e: KeyboardEvent): boolean {
  // ? key (Shift+/)
  if (e.key === "?" || (e.shiftKey && e.key === "/")) {
    return !e.ctrlKey && !e.altKey && !e.metaKey;
  }
  // Ctrl+/
  if ((e.ctrlKey || e.metaKey) && e.key === "/") {
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

      // Skip if typing in input/textarea
      const inInput = isInputElement(e.target);

      // Handle modal trigger: Ctrl+/ works everywhere, ? only works outside inputs
      if (isModalTrigger(e)) {
        // Only allow ? to open modal when NOT in an input
        const isQuestionMark = e.key === "?" || (e.shiftKey && e.key === "/");
        const isCtrlSlash = (e.ctrlKey || e.metaKey) && e.key === "/";

        if (isCtrlSlash || !inInput) {
          e.preventDefault();
          keybindStore.setModalOpen(true);
          return;
        }
      }

      // Skip other keybinds if in input
      if (inInput) {
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
