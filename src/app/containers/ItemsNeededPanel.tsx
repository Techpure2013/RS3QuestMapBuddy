import React, { useCallback } from "react";
import Panel from "./../sections/panel";
import ItemsNeededSection from "./../sections/ItemsNeededSection";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";

export const ItemsNeededPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const sel = useEditorSelector((s) => s.selection);
  const value =
    quest?.questSteps[sel.selectedStep]?.itemsNeeded?.join("\n") ?? "";

  const onChange = useCallback(
    (text: string) => {
      EditorStore.patchQuest((draft) => {
        const step = draft.questSteps[sel.selectedStep];
        if (!step) return;
        const lines = text
          .split("\n")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        step.itemsNeeded = lines;
      });
    },
    [sel.selectedStep]
  );

  return <ItemsNeededSection value={value} onChange={onChange} />;
};

export default ItemsNeededPanel;
