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
    EditorStore.setSelection({ targetType: "npc", floor: npc.floor });
    const sel = EditorStore.getState().selection;

    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[sel.selectedStep];
      if (!step) return;

      const existing = step.highlights?.npc?.[sel.targetIndex];
      if (existing) {
        // Update existing NPC
        existing.id = npc.id;
        existing.npcName = npc.name;
        existing.npcLocation = { lat: npc.lat, lng: npc.lng };
        existing.floor = npc.floor;
      } else {
        // Auto-create new NPC highlight
        if (!step.highlights) step.highlights = { npc: [], object: [] };
        if (!step.highlights.npc) step.highlights.npc = [];
        step.highlights.npc.push({
          id: npc.id,
          npcName: npc.name,
          npcLocation: { lat: npc.lat, lng: npc.lng },
          wanderRadius: { bottomLeft: { lat: null, lng: null }, topRight: { lat: null, lng: null } },
          floor: npc.floor,
        } as any);
      }
    });

    // Update selection to point to the NPC (might be newly added)
    const updatedStep = EditorStore.getState().quest?.questSteps?.[sel.selectedStep];
    const npcCount = updatedStep?.highlights?.npc?.length ?? 0;
    if (npcCount > 0) {
      EditorStore.setSelection({ targetType: "npc", targetIndex: npcCount - 1 });
    }

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
