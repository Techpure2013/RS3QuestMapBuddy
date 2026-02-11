import { useEffect, useCallback, useState } from "react";
import { keybindStore } from "../../keybinds/keybindStore";
import { keyEventMatches } from "../../keybinds/utils";
import type { KeyCombo } from "../../keybinds/types";

export interface HotkeyActions {
  onBold?: () => void;
  onItalic?: () => void;
  onUnderline?: () => void;
  onStrikethrough?: () => void;
  onSuperscript?: () => void;
  onLink?: () => void;
  onColor?: () => void;
  onImage?: () => void;
  onStepLink?: () => void;
  onTable?: () => void;
  onClear?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleTarget?: () => void;
  onAddNpc?: () => void;
  onAddObject?: () => void;
  onAddStep?: () => void;
}

const ACTION_MAP: Record<string, keyof HotkeyActions> = {
  "editor.bold": "onBold",
  "editor.italic": "onItalic",
  "editor.underline": "onUnderline",
  "editor.superscript": "onSuperscript",
  "editor.link": "onLink",
  "editor.color": "onColor",
  "editor.image": "onImage",
  "editor.stepLink": "onStepLink",
  "editor.table": "onTable",
  "editor.clearFormatting": "onClear",
  "editor.undo": "onUndo",
  "editor.redo": "onRedo",
  "editor.toggleTarget": "onToggleTarget",
  "editor.addNpc": "onAddNpc",
  "editor.addObject": "onAddObject",
  "editor.addStep": "onAddStep",
};

export function useEditorHotkeys(
  actions: HotkeyActions,
  enabled: boolean = true,
  targetRef?: React.RefObject<HTMLElement | null>
) {
  // Force re-render when keybinds change
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return keybindStore.subscribe(() => {
      forceUpdate((n) => n + 1);
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't intercept keys while keybind modal is recording
      if (keybindStore.modalOpen) return;

      // Don't trigger if we're in an input that's not our target
      const target = e.target as HTMLElement;
      if (targetRef?.current && !targetRef.current.contains(target)) {
        return;
      }

      const keybinds = keybindStore.getResolvedKeybinds();

      for (const keybind of keybinds) {
        // Skip if no key is set or if not in our action map
        if (!keybind.currentKey || !ACTION_MAP[keybind.id]) {
          continue;
        }

        if (keyEventMatches(e, keybind.currentKey)) {
          const actionKey = ACTION_MAP[keybind.id];
          const action = actionKey ? actions[actionKey] : undefined;

          if (action) {
            e.preventDefault();
            e.stopPropagation();
            action();
            return;
          }
        }
      }
    },
    [actions, enabled, targetRef]
  );

  useEffect(() => {
    const element = targetRef?.current || document;
    element.addEventListener("keydown", handleKeyDown as EventListener, true);
    return () => element.removeEventListener("keydown", handleKeyDown as EventListener, true);
  }, [handleKeyDown, targetRef]);
}

// Helper to get current hotkey for display in tooltips
// Maps old action IDs to new keybind IDs
const OLD_TO_NEW_ID_MAP: Record<string, string> = {
  bold: "editor.bold",
  italic: "editor.italic",
  underline: "editor.underline",
  superscript: "editor.superscript",
  link: "editor.link",
  color: "editor.color",
  image: "editor.image",
  steplink: "editor.stepLink",
  table: "editor.table",
  clear: "editor.clearFormatting",
  undo: "editor.undo",
  redo: "editor.redo",
  toggleTarget: "editor.toggleTarget",
  addNpc: "editor.addNpc",
  addObject: "editor.addObject",
  addStep: "editor.addStep",
};

export function getHotkeyForAction(actionId: string): string | null {
  // Support both old and new ID formats
  const keybindId = OLD_TO_NEW_ID_MAP[actionId] || actionId;
  const keybind = keybindStore.getKeybind(keybindId);

  if (!keybind || !keybind.currentKey) return null;

  const combo = keybind.currentKey;
  const parts: string[] = [];

  if (combo.ctrl) parts.push("Ctrl");
  if (combo.shift) parts.push("Shift");
  if (combo.alt) parts.push("Alt");
  if (combo.meta) parts.push("Cmd");

  // Format key nicely
  let keyName = combo.key;
  if (keyName.length === 1) {
    keyName = keyName.toUpperCase();
  }

  parts.push(keyName);
  return parts.join("+");
}
