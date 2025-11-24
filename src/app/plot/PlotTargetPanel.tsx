// src/app/plot/PlotTargetsPanel.tsx
import React, { useCallback, useMemo, useEffect } from "react";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import type { NpcLocation } from "../../state/types";
import { PlotNpcList } from "./PlotNpcList";
import { PlotObjectList } from "./PlotObjectList";

const PlotTargetsPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const sel = useEditorSelector((s) => s.selection);
  const ui = useEditorSelector((s) => s.ui);

  const step = quest?.questSteps?.[sel.selectedStep];
  const npcList = step?.highlights?.npc ?? [];
  const objList = step?.highlights?.object ?? [];

  const targetNameValue = useMemo(() => {
    if (!step) return "";
    if (sel.targetType === "npc") {
      return step.highlights.npc?.[sel.targetIndex]?.npcName ?? "";
    }
    return step.highlights.object?.[sel.targetIndex]?.name ?? "";
  }, [step, sel.targetType, sel.targetIndex]);

  const currentObjectColor = useMemo(() => {
    if (ui.selectedObjectColor) return ui.selectedObjectColor;
    if (!step || sel.targetType !== "object") return "#FFFFFF";
    const t = step.highlights.object?.[sel.targetIndex];
    const last = (t?.objectLocation ?? []).at(-1);
    return last?.color ?? "#FFFFFF";
  }, [ui.selectedObjectColor, step, sel.targetType, sel.targetIndex]);

  const currentObjectNumber = useMemo(() => {
    if (ui.objectNumberLabel !== undefined) return ui.objectNumberLabel;
    if (!step || sel.targetType !== "object") return "";
    const t = step.highlights.object?.[sel.targetIndex];
    const last = (t?.objectLocation ?? []).at(-1);
    return last?.numberLabel ?? "";
  }, [ui.objectNumberLabel, step, sel.targetType, sel.targetIndex]);

  // Stable callbacks (no deps that change frequently)
  const onTargetTypeChange = useCallback((t: "npc" | "object") => {
    EditorStore.setSelection({ targetType: t, targetIndex: 0 });
    EditorStore.setUi({ captureMode: t === "npc" ? "single" : "multi-point" });
  }, []);

  const onTargetIndexChange = useCallback(
    (i: number, type: "npc" | "object") => {
      const currentType = EditorStore.getState().selection.targetType;
      if (type !== currentType) {
        EditorStore.setSelection({ targetType: type, targetIndex: i });
      } else {
        EditorStore.setSelection({ targetIndex: i });
      }
      EditorStore.setUi({
        captureMode: type === "npc" ? "single" : "multi-point",
      });
    },
    []
  );

  const onTargetNameChange = useCallback((name: string) => {
    const state = EditorStore.getState();
    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[state.selection.selectedStep];
      if (!s) return;
      if (state.selection.targetType === "npc") {
        const t = s.highlights.npc?.[state.selection.targetIndex];
        if (t) t.npcName = name;
      } else {
        const t = s.highlights.object?.[state.selection.targetIndex];
        if (t) t.name = name;
      }
    });
  }, []);

  const onAddNpc = useCallback(() => {
    const state = EditorStore.getState();
    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[state.selection.selectedStep];
      if (!s) return;
      const list = s.highlights.npc ?? (s.highlights.npc = []);
      list.push({
        id: undefined,
        npcName: "",
        npcLocation: { lat: 0, lng: 0 } as NpcLocation,
        wanderRadius: {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      });
    });
    const nextIndex =
      EditorStore.getState().quest?.questSteps?.[
        EditorStore.getState().selection.selectedStep
      ]?.highlights.npc?.length ?? 1;
    EditorStore.setSelection({
      targetType: "npc",
      targetIndex: Math.max(0, nextIndex - 1),
    });
    EditorStore.setUi({ captureMode: "single" });
  }, []);

  const onDeleteNpc = useCallback(() => {
    const state = EditorStore.getState();
    if (state.selection.targetType !== "npc") return;
    const index = state.selection.targetIndex;
    const npcList =
      state.quest?.questSteps?.[state.selection.selectedStep]?.highlights.npc;
    if (!npcList || npcList.length === 0) return;

    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[state.selection.selectedStep];
      if (!s?.highlights.npc) return;
      if (index >= 0 && index < s.highlights.npc.length) {
        s.highlights.npc.splice(index, 1);
      }
    });

    const nextLen = npcList.length - 1;
    const nextIndex = Math.max(0, Math.min(index, Math.max(0, nextLen - 1)));
    EditorStore.setSelection({ targetType: "npc", targetIndex: nextIndex });
  }, []);

  const onAddObject = useCallback(() => {
    const state = EditorStore.getState();
    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[state.selection.selectedStep];
      if (!s) return;
      const list = s.highlights.object ?? (s.highlights.object = []);
      list.push({
        name: "",
        objectLocation: [],
        objectRadius: {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      });
    });
    const nextIndex =
      EditorStore.getState().quest?.questSteps?.[
        EditorStore.getState().selection.selectedStep
      ]?.highlights.object?.length ?? 1;
    EditorStore.setSelection({
      targetType: "object",
      targetIndex: Math.max(0, nextIndex - 1),
    });
    EditorStore.setUi({ captureMode: "multi-point" });
  }, []);

  const onDeleteObject = useCallback(() => {
    const state = EditorStore.getState();
    if (state.selection.targetType !== "object") return;
    const index = state.selection.targetIndex;
    const objList =
      state.quest?.questSteps?.[state.selection.selectedStep]?.highlights
        .object;
    if (!objList || objList.length === 0) return;

    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[state.selection.selectedStep];
      if (!s?.highlights.object) return;
      if (index >= 0 && index < s.highlights.object.length) {
        s.highlights.object.splice(index, 1);
      }
    });

    const nextLen = objList.length - 1;
    const nextIndex = Math.max(0, Math.min(index, Math.max(0, nextLen - 1)));
    EditorStore.setSelection({ targetType: "object", targetIndex: nextIndex });
  }, []);

  const clearNpcPoint = useCallback((npcIndex: number) => {
    const selectedStep = EditorStore.getState().selection.selectedStep;
    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[selectedStep];
      const t = s?.highlights.npc?.[npcIndex];
      if (!t) return;
      t.npcLocation = { lat: 0, lng: 0 } as NpcLocation;
    });
  }, []);

  const deleteObjectPoint = useCallback(
    (objIndex: number, locIndex: number) => {
      const selectedStep = EditorStore.getState().selection.selectedStep;
      EditorStore.patchQuest((draft) => {
        const s = draft.questSteps[selectedStep];
        const t = s?.highlights.object?.[objIndex];
        if (!t?.objectLocation) return;
        if (locIndex < 0 || locIndex >= t.objectLocation.length) return;
        t.objectLocation.splice(locIndex, 1);
      });
    },
    []
  );

  const toggleRadius = useCallback(() => {
    const state = EditorStore.getState();
    const next =
      state.ui.captureMode === "radius"
        ? state.selection.targetType === "npc"
          ? "single"
          : "multi-point"
        : "radius";
    EditorStore.setUi({ captureMode: next });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts if not typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const state = EditorStore.getState();
      const currentType = state.selection.targetType;
      const currentIndex = state.selection.targetIndex;

      switch (e.key) {
        case "ArrowUp":
          if (currentIndex > 0) {
            e.preventDefault();
            onTargetIndexChange(currentIndex - 1, currentType);
          }
          break;

        case "ArrowDown": {
          e.preventDefault();
          const max =
            currentType === "npc" ? npcList.length - 1 : objList.length - 1;
          if (currentIndex < max) {
            onTargetIndexChange(currentIndex + 1, currentType);
          }
          break;
        }

        case "Delete":
        case "Backspace":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (currentType === "npc") {
              onDeleteNpc();
            } else {
              onDeleteObject();
            }
          }
          break;

        case "n":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (currentType === "npc") {
              onAddNpc();
            } else {
              onAddObject();
            }
          }
          break;

        case "Tab":
          e.preventDefault();
          onTargetTypeChange(currentType === "npc" ? "object" : "npc");
          break;

        case "r":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            toggleRadius();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    npcList.length,
    objList.length,
    onTargetIndexChange,
    onTargetTypeChange,
    onAddNpc,
    onAddObject,
    onDeleteNpc,
    onDeleteObject,
    toggleRadius,
  ]);

  return (
    <div className="plot-targets-panel">
      <div className="plot-btn-group">
        <button
          className="control-btn"
          onClick={() => onTargetTypeChange("npc")}
          style={{
            background: sel.targetType === "npc" ? "#2563eb" : undefined,
            borderColor: sel.targetType === "npc" ? "#2563eb" : undefined,
            color: sel.targetType === "npc" ? "#fff" : undefined,
          }}
        >
          NPC
        </button>
        <button
          className="control-btn"
          onClick={() => onTargetTypeChange("object")}
          style={{
            background: sel.targetType === "object" ? "#2563eb" : undefined,
            borderColor: sel.targetType === "object" ? "#2563eb" : undefined,
            color: sel.targetType === "object" ? "#fff" : undefined,
          }}
        >
          Object
        </button>
        <button
          className="control-btn"
          onClick={toggleRadius}
          style={{
            background: ui.captureMode === "radius" ? "#10b981" : undefined,
            borderColor: ui.captureMode === "radius" ? "#10b981" : undefined,
            color: ui.captureMode === "radius" ? "#fff" : undefined,
          }}
          title="Toggle radius capture (Ctrl+R)"
        >
          Radius
        </button>
      </div>

      <div className="plot-btn-group">
        <button className="button--add" onClick={onAddNpc}>
          + NPC
        </button>
        <button
          className="button--delete"
          onClick={onDeleteNpc}
          disabled={sel.targetType !== "npc" || npcList.length === 0}
        >
          Delete NPC
        </button>
        <button className="button--add" onClick={onAddObject}>
          + Object
        </button>
        <button
          className="button--delete"
          onClick={onDeleteObject}
          disabled={sel.targetType !== "object" || objList.length === 0}
        >
          Delete Object
        </button>
      </div>

      <div className="plot-control-group">
        <label className="plot-field-label">Name</label>
        <input
          type="text"
          value={targetNameValue}
          onChange={(e) => onTargetNameChange(e.target.value)}
          placeholder={sel.targetType === "npc" ? "NPC Name" : "Object Name"}
          className="plot-input-text"
        />
      </div>

      {sel.targetType === "object" && (
        <div className="plot-object-controls">
          <div className="plot-control-group">
            <label className="plot-field-label">Object Color</label>
            <input
              type="color"
              value={currentObjectColor}
              onChange={(e) =>
                EditorStore.setUi({ selectedObjectColor: e.target.value })
              }
              className="plot-color-input"
            />
          </div>
          <div className="plot-control-group">
            <label className="plot-field-label">Object Number</label>
            <input
              type="text"
              value={currentObjectNumber}
              onChange={(e) =>
                EditorStore.setUi({ objectNumberLabel: e.target.value })
              }
              placeholder="Optional"
              className="plot-input-text"
            />
          </div>
        </div>
      )}

      <div className="plot-control-group">
        <div className="plot-targets-header">NPCs</div>
        <PlotNpcList
          npcs={npcList}
          selectedIndex={sel.targetIndex}
          isActive={sel.targetType === "npc"}
          onSelect={(i) => onTargetIndexChange(i, "npc")}
          onClearPoint={clearNpcPoint}
        />
      </div>

      <div className="plot-control-group">
        <div className="plot-targets-header">Objects</div>
        <PlotObjectList
          objects={objList}
          selectedIndex={sel.targetIndex}
          isActive={sel.targetType === "object"}
          onSelect={(i) => onTargetIndexChange(i, "object")}
          onDeletePoint={deleteObjectPoint}
        />
      </div>

      <div className="plot-keyboard-hints">
        <div className="plot-hint-title">Keyboard Shortcuts:</div>
        <div className="plot-hint-row">
          <kbd>↑/↓</kbd> Navigate targets
        </div>
        <div className="plot-hint-row">
          <kbd>Tab</kbd> Switch NPC/Object
        </div>
        <div className="plot-hint-row">
          <kbd>Ctrl+N</kbd> Add new
        </div>
        <div className="plot-hint-row">
          <kbd>Ctrl+Del</kbd> Delete
        </div>
        <div className="plot-hint-row">
          <kbd>Ctrl+R</kbd> Toggle radius
        </div>
      </div>
    </div>
  );
};

export default PlotTargetsPanel;
