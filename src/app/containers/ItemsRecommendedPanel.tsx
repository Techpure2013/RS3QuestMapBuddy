import React, { useCallback, useMemo } from "react";
import Panel from "./../sections/panel";
import ItemsRecommendedSection from "./../sections/ItemsRecommendedSection";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "./../../state/editorStore";

// Shared helpers
const onEnterAsNewline = (
  event: React.KeyboardEvent<HTMLTextAreaElement>,
  currentValue: string,
  onChange: (newValue: string) => void
) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    const { selectionStart, selectionEnd } = event.currentTarget;
    const newValue =
      currentValue.substring(0, selectionStart) +
      "\n" +
      currentValue.substring(selectionEnd);
    onChange(newValue);
  }
};

export const ItemsRecommendedPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const selection = useEditorSelector((s) => s.selection);

  const value = useMemo(() => {
    const step = quest?.questSteps?.[selection.selectedStep];
    return step?.itemsRecommended?.join("\n") ?? "";
  }, [quest, selection.selectedStep]);

  const onChange = useCallback(
    (text: string) => {
      EditorStore.patchQuest((draft) => {
        const step = draft.questSteps[selection.selectedStep];
        if (!step) return;
        const lines = text
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        step.itemsRecommended = lines;
      });
    },
    [selection.selectedStep]
  );

  return <ItemsRecommendedSection value={value} onChange={onChange} />;
};

export default ItemsRecommendedPanel;
