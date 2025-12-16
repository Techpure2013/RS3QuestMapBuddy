import React, { useCallback, useMemo } from "react";
import DialogOptionsSection from "./../sections/DialogOptionsSection";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";

export const DialogOptionsPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const selection = useEditorSelector((s) => s.selection);

  const value = useMemo(() => {
    const step = quest?.questSteps?.[selection.selectedStep];
    return step?.dialogOptions?.join("\n") ?? "";
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
        step.dialogOptions = lines;
      });
    },
    [selection.selectedStep]
  );

  return (
    <DialogOptionsSection value={value} onChange={onChange} />
  );
};

export default DialogOptionsPanel;
