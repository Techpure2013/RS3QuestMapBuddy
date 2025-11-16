import React, { useMemo, useCallback } from "react";
import Panel from "./../sections/panel";
import QuestImagesPanel from "./../sections/ImageTool";
import { useEditorSelector } from "./../../state/useEditorSelector";
import { EditorStore } from "./../../state/editorStore";
import { questToBundle, type QuestImage } from "./../../state/types";
import { saveActiveBundle } from "./../../idb/bundleStore";

export const QuestImagesPanelContainer: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);

  // Build dropdown options from current steps
  const stepOptions = useMemo(() => {
    const steps = quest?.questSteps ?? [];
    return steps.map((s, idx) => {
      const value = String(idx + 1); // string step key for UI options
      const label = s.stepDescription ?? `Step ${value}`;
      return { value, label };
    });
  }, [quest]);

  const persist = useCallback(() => {
    const q = EditorStore.getState().quest;
    if (q) void saveActiveBundle(questToBundle(q));
  }, []);

  const onRemoveQuestImage = useCallback(
    (index: number) => {
      EditorStore.patchQuest((draft) => {
        const list = draft.questImages ?? [];
        if (index < 0 || index >= list.length) return;
        const next: QuestImage[] = list
          .slice(0, index)
          .concat(list.slice(index + 1));
        draft.questImages = next;
      });
      persist();
    },
    [persist]
  );

  const onEditImage = useCallback(
    (index: number, patch: { step?: string; stepDescription?: string }) => {
      EditorStore.patchQuest((draft) => {
        const img = draft.questImages?.[index];
        if (!img) return;
        if (typeof patch.step !== "undefined") {
          // QuestImage.step is definitively a string
          (img as QuestImage).step = patch.step;
        }
        if (typeof patch.stepDescription !== "undefined") {
          img.stepDescription = patch.stepDescription;
        }
      });
      persist();
    },
    [persist]
  );

  return (
    <>
      <QuestImagesPanel
        isOpen={true}
        onToggle={() => {}}
        questName={quest?.questName ?? ""}
        previewBaseUrl="https://techpure.dev/RS3QuestBuddy/Images"
        questImageList={quest?.questImages ?? []}
        onRemoveQuestImage={onRemoveQuestImage}
        onEditImage={onEditImage}
        stepOptions={stepOptions}
      />
    </>
  );
};

export default QuestImagesPanelContainer;
