import React, { useCallback, useMemo } from "react";
import CompletionConditionsSection from "./../sections/CompletionConditionsSection";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import type { StepCompletionConditions, QuestHighlights } from "../../state/types";

export const CompletionConditionsPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const selection = useEditorSelector((s) => s.selection);

  const value = useMemo(() => {
    const step = quest?.questSteps?.[selection.selectedStep];
    return step?.completionConditions ?? null;
  }, [quest, selection.selectedStep]);

  const highlights = useMemo(() => {
    const step = quest?.questSteps?.[selection.selectedStep];
    return step?.highlights ?? { npc: [], object: [] };
  }, [quest, selection.selectedStep]);

  const dialogOptions = useMemo(() => {
    const step = quest?.questSteps?.[selection.selectedStep];
    return step?.dialogOptions ?? [];
  }, [quest, selection.selectedStep]);

  const onChange = useCallback(
    (conditions: StepCompletionConditions | null) => {
      EditorStore.patchQuest((draft) => {
        const step = draft.questSteps[selection.selectedStep];
        if (!step) return;
        step.completionConditions = conditions;
      });
    },
    [selection.selectedStep]
  );

  return (
    <CompletionConditionsSection
      value={value}
      onChange={onChange}
      highlights={highlights}
      stepDialogOptions={dialogOptions}
    />
  );
};

export default CompletionConditionsPanel;
