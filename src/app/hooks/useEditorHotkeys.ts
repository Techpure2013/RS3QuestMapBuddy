import { useEffect, useCallback } from "react";
import { loadHotkeys, matchesHotkey, HotkeyMapping } from "../components/HotkeySettings";

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
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onToggleTarget?: () => void;
  onAddNpc?: () => void;
  onAddObject?: () => void;
  onAddStep?: () => void;
}

const ACTION_MAP: Record<string, keyof HotkeyActions> = {
  bold: "onBold",
  italic: "onItalic",
  underline: "onUnderline",
  strikethrough: "onStrikethrough",
  superscript: "onSuperscript",
  link: "onLink",
  color: "onColor",
  image: "onImage",
  steplink: "onStepLink",
  table: "onTable",
  clear: "onClear",
  save: "onSave",
  undo: "onUndo",
  redo: "onRedo",
  toggleTarget: "onToggleTarget",
  addNpc: "onAddNpc",
  addObject: "onAddObject",
  addStep: "onAddStep",
};

export function useEditorHotkeys(
  actions: HotkeyActions,
  enabled: boolean = true,
  targetRef?: React.RefObject<HTMLElement | null>
) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger if we're in an input that's not our target
      const target = e.target as HTMLElement;
      if (targetRef?.current && !targetRef.current.contains(target)) {
        return;
      }

      const hotkeys = loadHotkeys();

      for (const hotkey of hotkeys) {
        if (matchesHotkey(e, hotkey)) {
          const actionKey = ACTION_MAP[hotkey.id];
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
    element.addEventListener("keydown", handleKeyDown as EventListener);
    return () => element.removeEventListener("keydown", handleKeyDown as EventListener);
  }, [handleKeyDown, targetRef]);
}

// Helper to get current hotkey for display in tooltips
export function getHotkeyForAction(actionId: string): string | null {
  const hotkeys = loadHotkeys();
  const hotkey = hotkeys.find(h => h.id === actionId);
  if (!hotkey) return null;

  const parts: string[] = [];
  if (hotkey.ctrl) parts.push("Ctrl");
  if (hotkey.shift) parts.push("Shift");
  if (hotkey.alt) parts.push("Alt");
  parts.push(hotkey.key.toUpperCase());
  return parts.join("+");
}
