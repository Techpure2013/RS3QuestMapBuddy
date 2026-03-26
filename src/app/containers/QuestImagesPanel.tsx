import React, { useMemo, useCallback } from "react";
import QuestImagesPanel from "./../sections/ImageTool";
import { useEditorSelector } from "./../../state/useEditorSelector";
import { EditorStore } from "./../../state/editorStore";
import { questToBundle, type QuestImage } from "./../../state/types";
import { saveActiveBundle } from "./../../idb/bundleStore";

export const QuestImagesPanelContainer: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);

  // Build dropdown options from current steps, including stepId
  const stepOptions = useMemo(() => {
    const steps = quest?.questSteps ?? [];
    return steps.map((s, idx) => ({
      stepId: s.stepId,
      stepNumber: idx + 1,
      label: s.stepDescription ?? `Step ${idx + 1}`,
    }));
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
    (index: number, patch: { stepIds?: number[] }) => {
      EditorStore.patchQuest((draft) => {
        const img = draft.questImages?.[index];
        if (!img) return;
        if (patch.stepIds !== undefined) {
          img.stepIds = patch.stepIds;
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
        previewBaseUrl="https://www.techpure.dev/images"
        questImageList={quest?.questImages ?? []}
        onRemoveQuestImage={onRemoveQuestImage}
        onEditImage={onEditImage}
        stepOptions={stepOptions}
      />
    </>
  );
};

export default QuestImagesPanelContainer;
