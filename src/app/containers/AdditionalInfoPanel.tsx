import React, { useCallback, useMemo } from "react";
import Panel from "./../sections/panel";
import AdditionalInfoSection from "./../sections/AdditionalInformationSection";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";

export const AdditionalInfoPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const selection = useEditorSelector((s) => s.selection);

  const value = useMemo(() => {
    const step = quest?.questSteps?.[selection.selectedStep];
    return step?.additionalStepInformation?.join("\n") ?? "";
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
        step.additionalStepInformation = lines;
      });
    },
    [selection.selectedStep]
  );

  return (
   
      <AdditionalInfoSection value={value} onChange={onChange} />

  );
};

export default AdditionalInfoPanel;
