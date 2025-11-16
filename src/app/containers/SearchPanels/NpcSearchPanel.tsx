import React, { useCallback } from "react";
import Panel from "./../../sections/panel";
import { NpcSearch, type Npc } from "./../../sections/NpcSearch";
import { EditorStore } from "../../../state/editorStore";

export const NpcSearchPanel: React.FC = () => {
  const onNpcHighlight = useCallback((npc: Npc | null) => {
    EditorStore.setHighlights({ highlightedNpc: npc });
  }, []);

  const onNpcSelect = useCallback((npc: Npc) => {
    const sel = EditorStore.getState().selection;
    EditorStore.patchQuest((draft) => {
      const target =
        draft.questSteps[sel.selectedStep]?.highlights.npc?.[sel.targetIndex];
      if (!target) return;
      target.id = npc.id;
      target.npcName = npc.name;
      target.npcLocation = { lat: npc.lat, lng: npc.lng };
      draft.questSteps[sel.selectedStep].floor = npc.floor;
    });
    EditorStore.setHighlights({ highlightedNpc: null });
  }, []);

  return (
    <Panel title="NPC Search" defaultOpen={false}>
      <NpcSearch onNpcSelect={onNpcSelect} onNpcHighlight={onNpcHighlight} />
    </Panel>
  );
};

export default NpcSearchPanel;
