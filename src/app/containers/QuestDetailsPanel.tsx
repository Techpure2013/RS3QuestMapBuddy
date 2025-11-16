import React, { useCallback } from "react";
import Panel from "./../sections/panel";
import { QuestDetailsEditor } from "./../sections/QuestDetailsEditor";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import type { Quest } from "../../state/types";

export const QuestDetailsPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);

  const onUpdateQuest = useCallback((updated: Quest) => {
    // Replace quest in store
    EditorStore.setQuest(updated);
  }, []);

  return <QuestDetailsEditor questJson={quest} onUpdateQuest={onUpdateQuest} />;
};

export default QuestDetailsPanel;
