// src/app/containers/StepControlBar.tsx
import React, { useCallback, useEffect, useState } from "react";
import { useEditorSelector } from "../../state/useEditorSelector";
import {
  EditorStore,
  requestFlyToCurrentTargetAt,
} from "../../state/editorStore";
import { HandleFloorIncreaseDecrease } from "../../map/utils/MapFunctions";
import { IconGridDots, IconKeyboard } from "@tabler/icons-react";
import { hardLocalReset } from "./../../state/hardLocalReset";
import { keybindStore } from "../../keybinds";

const StepControlBar: React.FC = React.memo(() => {
  // Minimal subscriptions (primitives only)
  const totalSteps = useEditorSelector((s) => s.quest?.questSteps.length ?? 0);
  const selStep = useEditorSelector((s) => s.selection.selectedStep);
  const selFloor = useEditorSelector((s) => s.selection.floor);
  const showGrids = useEditorSelector((s) => s.ui.showGrids);

  // Cursor info: local only
  const [cursor, setCursor] = useState<{ x: number; y: number; zoom: number }>({
    x: 0,
    y: 0,
    zoom: 0,
  });
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ x: number; y: number; zoom: number }>;
      setCursor(ce.detail);
    };
    window.addEventListener("mapCursorInfo", handler);
    return () => window.removeEventListener("mapCursorInfo", handler);
  }, []);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "r"
      ) {
        e.preventDefault();
        const ok = confirm("Hard reset local state now?");
        if (ok) void hardLocalReset();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  // Step editor visibility (local + broadcast)
  const [showEditor, setShowEditor] = useState<boolean>(true);
  const emitEditorVisibility = useCallback((visible: boolean) => {
    window.dispatchEvent(
      new CustomEvent("toggleStepEditorVisibility", {
        detail: { show: visible },
      })
    );
  }, []);

  const toggleEditor = useCallback(() => {
    setShowEditor((prev) => {
      const next = !prev;
      emitEditorVisibility(next);
      return next;
    });
  }, [emitEditorVisibility]);

  // Stable handlers reading fresh state
  const toggleGrids = useCallback(() => {
    const curr = EditorStore.getState().ui.showGrids;
    EditorStore.setUi({ showGrids: !curr });
  }, []);

  const incStep = useCallback(() => {
    const state = EditorStore.getState();
    const total = state.quest?.questSteps.length ?? 0;
    const curr = state.selection.selectedStep;
    if (curr < total - 1) {
      const next = curr + 1;
      EditorStore.autoSelectFirstValidTargetForStep(next);
      requestFlyToCurrentTargetAt(5, "auto-select");
    }
  }, []);

  const decStep = useCallback(() => {
    const curr = EditorStore.getState().selection.selectedStep;
    if (curr > 0) {
      const next = curr - 1;
      EditorStore.autoSelectFirstValidTargetForStep(next);
      requestFlyToCurrentTargetAt(5, "auto-select");
    }
  }, []);

  const onStepSelect = useCallback((stepIndex: number) => {
    EditorStore.autoSelectFirstValidTargetForStep(stepIndex);
    requestFlyToCurrentTargetAt(5, "auto-select");
  }, []);

  const floorInc = useCallback(() => {
    const state = EditorStore.getState();
    const nf = state.selection.floor + 1;
    if (!HandleFloorIncreaseDecrease(nf)) return;
    EditorStore.setSelection({ floor: nf });
    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[state.selection.selectedStep];
      if (!step) return;
      // Set floor on the selected NPC or object
      const { targetType, targetIndex } = state.selection;
      if (targetType === "npc" && step.highlights.npc[targetIndex]) {
        step.highlights.npc[targetIndex].floor = nf;
      } else if (targetType === "object" && step.highlights.object[targetIndex]) {
        step.highlights.object[targetIndex].floor = nf;
      }
    });
  }, []);

  const floorDec = useCallback(() => {
    const state = EditorStore.getState();
    const nf = state.selection.floor - 1;
    if (!HandleFloorIncreaseDecrease(nf)) return;
    EditorStore.setSelection({ floor: nf });
    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[state.selection.selectedStep];
      if (!step) return;
      // Set floor on the selected NPC or object
      const { targetType, targetIndex } = state.selection;
      if (targetType === "npc" && step.highlights.npc[targetIndex]) {
        step.highlights.npc[targetIndex].floor = nf;
      } else if (targetType === "object" && step.highlights.object[targetIndex]) {
        step.highlights.object[targetIndex].floor = nf;
      }
    });
  }, []);

  const addStep = useCallback(() => {
    const state = EditorStore.getState();
    const floor = state.selection.floor;
    const currentIndex = state.selection.selectedStep;
    const total = state.quest?.questSteps.length ?? 0;

    const hasSelection =
      Number.isInteger(currentIndex) &&
      currentIndex >= 0 &&
      currentIndex < total;

    // Insert AFTER current selection; use currentIndex for "insert before"
    const targetIndex = hasSelection ? currentIndex + 1 : total;

    let insertedIndex = targetIndex;

    EditorStore.patchQuest((draft) => {
      const length = draft.questSteps.length;
      const clamped =
        targetIndex < 0 ? 0 : targetIndex > length ? length : targetIndex;

      draft.questSteps.splice(clamped, 0, {
        stepDescription: "",
        floor,
        highlights: { npc: [], object: [] },
        itemsNeeded: [],
        itemsRecommended: [],
        additionalStepInformation: [],
        dialogOptions: [],
      });

      // capture the authoritative index from the draft
      insertedIndex = clamped;
    });

    // update selection in the correct slice
    EditorStore.setSelection({ selectedStep: insertedIndex, targetIndex: 0 });

    // focus the new step
    EditorStore.autoSelectFirstValidTargetForStep(insertedIndex);
    requestFlyToCurrentTargetAt(5, "auto-select");
  }, []);

  const deleteStep = useCallback(() => {
    const state = EditorStore.getState();
    const idx = state.selection.selectedStep;
    EditorStore.patchQuest((draft) => {
      if (draft.questSteps.length > 0) {
        draft.questSteps.splice(idx, 1);
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
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "0 16px",
        height: "100%",
        pointerEvents: "auto",
      }}
    >
      {/* Step Navigation */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button
          onClick={decStep}
          disabled={selStep === 0}
          className="control-btn"
          type="button"
        >
          ←
        </button>
        <select
          value={selStep}
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
          disabled={selStep === totalSteps - 1}
          className="control-btn"
          type="button"
        >
          →
        </button>
      </div>

      {/* Floor Controls */}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button onClick={floorDec} className="control-btn" type="button">
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
          F{selFloor}
        </div>
        <button onClick={floorInc} className="control-btn" type="button">
          ↑
        </button>
      </div>

      {/* Step Actions (show/hide as needed) */}
      <div style={{ display: "flex", gap: 6 }}>
        <button
          onClick={addStep}
          className="control-btn control-btn--add"
          type="button"
        >
          + Step
        </button>
        <button
          onClick={deleteStep}
          className="control-btn control-btn--delete"
          type="button"
        >
          Delete
        </button>
      </div>

      {/* Cursor info */}
      <div
        style={{
          marginLeft: "auto",
          display: "flex",
          gap: 12,
          alignItems: "center",
          padding: "4px 8px",
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: 4,
          color: "#d1d5db",
          fontSize: 12,
        }}
        title="Map cursor info"
      >
        <span>Zoom: {cursor.zoom}</span>
        <span>X: {cursor.x}</span>
        <span>Y: {cursor.y}</span>
      </div>

      {/* Editor toggle */}
      <button
        onClick={toggleEditor}
        className="control-btn"
        type="button"
        style={{ minWidth: 64 }}
        title={showEditor ? "Hide step editor" : "Show step editor"}
      >
        {showEditor ? "Hide" : "Show"}
      </button>

      {/* Grid toggle */}
      <button
        onClick={toggleGrids}
        className="control-btn"
        type="button"
        title={showGrids ? "Hide grids" : "Show grids"}
        style={{
          marginLeft: 8,
          background: showGrids ? "#2563eb" : undefined,
          borderColor: showGrids ? "#2563eb" : undefined,
          color: showGrids ? "#fff" : undefined,
          minWidth: 64,
        }}
      >
        <IconGridDots size={14} style={{ marginRight: 4 }} />
        {showGrids ? "Grids: On" : "Grids: Off"}
      </button>
      {/* Keyboard Shortcuts */}
      <button
        onClick={() => keybindStore.setModalOpen(true)}
        className="control-btn"
        type="button"
        title="Keyboard Shortcuts (Shift + ?)"
        style={{ minWidth: 32, padding: "4px 8px" }}
      >
        <IconKeyboard size={16} />
      </button>

      <button
        onClick={async () => {
          const ok = confirm(
            "This will clear local editor state, image cache, and chathead queues.\nContinue?"
          );
          if (!ok) return;
          await hardLocalReset();
        }}
        className="control-btn"
        type="button"
        title="Clear local caches and reset editor"
        style={{ minWidth: 92 }}
      >
        Local Reset
      </button>
    </div>
  );
});

export default StepControlBar;
