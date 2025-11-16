import React, { useCallback, useState } from "react";
import { NpcSearch, type Npc } from "./../../sections/NpcSearch";
import {
  EditorStore,
  requestFlyToCurrentTargetAt,
  requestCaptureNavReturn,
  requestRestoreView,
} from "../../../state/editorStore";
import { useEditorSelector } from "../../../state/useEditorSelector";

export const NpcSearchPanel: React.FC = () => {
  const ui = useEditorSelector((s) => s.ui);
  const [session, setSession] = useState(0); // remount key to reset widget

  const onNpcHighlight = useCallback((npc: Npc | null) => {
    if (!EditorStore.getState().ui.navReturn) {
      requestCaptureNavReturn(true);
    }
    EditorStore.setHighlights({ highlightedNpc: npc });
  }, []);

  const onNpcSelect = useCallback((npc: Npc) => {
    EditorStore.setSelection({ targetType: "npc" });
    const sel = EditorStore.getState().selection;

    EditorStore.patchQuest((draft) => {
      const t =
        draft.questSteps[sel.selectedStep]?.highlights.npc?.[sel.targetIndex];
      if (!t) return;
      t.id = npc.id;
      t.npcName = npc.name;
      t.npcLocation = { lat: npc.lat, lng: npc.lng };
      draft.questSteps[sel.selectedStep].floor = npc.floor;
    });

    EditorStore.setHighlights({ highlightedNpc: null });
    requestFlyToCurrentTargetAt(5, "selection");
  }, []);

  const handleBack = useCallback(() => {
    EditorStore.setHighlights({ highlightedNpc: null });
    requestRestoreView(true);
    setSession((s) => s + 1); // reset search UI
  }, []);

  return (
    <>
      <div className="button-group" style={{ marginBottom: 6 }}>
        <button
          onClick={handleBack}
          disabled={!ui.navReturn}
          title="Return to previous view"
        >
          Back
        </button>
      </div>
      <NpcSearch
        key={session} // force reset term/results
        onNpcSelect={onNpcSelect}
        onNpcHighlight={onNpcHighlight}
      />
    </>
  );
};

export default NpcSearchPanel;
