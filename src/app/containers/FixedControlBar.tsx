// src/app/containers/StepControlBar.tsx
import React, { useCallback } from "react";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import { HandleFloorIncreaseDecrease } from "../../map/utils/MapFunctions";

export const StepControlBar: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const sel = useEditorSelector((s) => s.selection);

  const totalSteps = quest?.questSteps.length ?? 0;

  const incStep = useCallback(() => {
    if (sel.selectedStep < totalSteps - 1) {
      EditorStore.setSelection({
        selectedStep: sel.selectedStep + 1,
        targetIndex: 0,
      });
    }
  }, [sel.selectedStep, totalSteps]);

  const decStep = useCallback(() => {
    if (sel.selectedStep > 0) {
      EditorStore.setSelection({
        selectedStep: sel.selectedStep - 1,
        targetIndex: 0,
      });
    }
  }, [sel.selectedStep]);

  const onStepSelect = useCallback((stepIndex: number) => {
    EditorStore.setSelection({
      selectedStep: stepIndex,
      targetIndex: 0,
    });
  }, []);

  const floorInc = useCallback(() => {
    const nf = sel.floor + 1;
    if (!HandleFloorIncreaseDecrease(nf)) return;
    EditorStore.setSelection({ floor: nf });
    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[sel.selectedStep];
      if (step) step.floor = nf;
    });
  }, [sel.floor, sel.selectedStep]);

  const floorDec = useCallback(() => {
    const nf = sel.floor - 1;
    if (!HandleFloorIncreaseDecrease(nf)) return;
    EditorStore.setSelection({ floor: nf });
    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[sel.selectedStep];
      if (step) step.floor = nf;
    });
  }, [sel.floor, sel.selectedStep]);

  const addStep = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      draft.questSteps.push({
        stepDescription: "",
        floor: sel.floor,
        highlights: { npc: [], object: [] },
        itemsNeeded: [],
        itemsRecommended: [],
        additionalStepInformation: [],
      });
    });
  }, [sel.floor]);

  const deleteStep = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      if (draft.questSteps.length > 0) {
        draft.questSteps.splice(sel.selectedStep, 1);
      }
    });
    const total = EditorStore.getState().quest?.questSteps.length ?? 0;
    EditorStore.setSelection({
      selectedStep: Math.min(
        EditorStore.getState().selection.selectedStep,
        Math.max(0, total - 1)
      ),
      targetIndex: 0,
    });
  }, [sel.selectedStep]);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "0 16px",
        height: "100%",
      }}
    >
      {/* Step Navigation */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          onClick={decStep}
          disabled={sel.selectedStep === 0}
          className="control-btn"
        >
          ←
        </button>

        <select
          value={sel.selectedStep}
          onChange={(e) => onStepSelect(Number(e.target.value))}
          style={{
            padding: "4px 8px",
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: 4,
            color: "#3b82f6",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {Array.from({ length: totalSteps }, (_, i) => (
            <option key={i} value={i}>
              Step {i + 1}
            </option>
          ))}
        </select>

        <span style={{ fontSize: 11, color: "#6b7280" }}>/ {totalSteps}</span>

        <button
          onClick={incStep}
          disabled={sel.selectedStep === totalSteps - 1}
          className="control-btn"
        >
          →
        </button>
      </div>

      {/* Floor Controls */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button onClick={floorDec} className="control-btn">
          ↓
        </button>
        <div
          style={{
            padding: "4px 10px",
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: 4,
            color: "#10b981",
            fontSize: 12,
            fontWeight: 600,
            minWidth: 36,
            textAlign: "center",
          }}
        >
          F{sel.floor}
        </div>
        <button onClick={floorInc} className="control-btn">
          ↑
        </button>
      </div>

      {/* Step Actions */}
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={addStep} className="control-btn control-btn--add">
          + Step
        </button>
        <button
          onClick={deleteStep}
          className="control-btn control-btn--delete"
        >
          Delete
        </button>
      </div>
    </div>
  );
};
