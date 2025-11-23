// src/app/plot/PlotTargetsPanel.tsx
import React, { useCallback, useMemo, useState } from "react";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import type {
  NpcHighlight,
  NpcLocation,
  ObjectHighlight,
} from "../../state/types";

const styles: Record<string, React.CSSProperties> = {
  panel: { padding: 8 },
  btnGroup: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 },
  controlGroup: { marginTop: 8 },
  targetsHeader: { fontWeight: 600, margin: "8px 0 4px" },
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
    border: "1px solid #1f2937",
    borderRadius: 6,
    overflow: "hidden",
  },
  li: {
    padding: "6px 8px",
    borderBottom: "1px solid #1f2937",
    cursor: "pointer",
  },
  liActive: {
    padding: "6px 8px",
    borderBottom: "1px solid #1f2937",
    cursor: "pointer",
    background: "rgba(37, 99, 235, 0.12)",
    borderLeft: "3px solid #2563eb",
  },
  rowHeader: { display: "flex", alignItems: "center", gap: 6 },
  dot: { color: "#60a5fa", fontWeight: 700 },
  fieldLabel: {
    fontSize: 12,
    color: "#9ca3af",
    display: "block",
    marginBottom: 4,
  },
  inputText: {
    width: "100%",
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 4,
    color: "#e5e7eb",
    padding: "6px 8px",
  },
  colorInput: { width: 48, height: 28, padding: 0 },
  subRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
    padding: "6px 8px",
    background: "#0b1220",
    borderRadius: 4,
  },
  subRowMeta: { fontSize: 12, color: "#9ca3af" },
  smallBtn: {
    padding: "4px 8px",
    fontSize: 12,
  },
};

const PlotTargetsPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const sel = useEditorSelector((s) => s.selection);
  const ui = useEditorSelector((s) => s.ui);

  const step = quest?.questSteps?.[sel.selectedStep];

  const [npcChatheadUrl, setNpcChatheadUrl] = useState<string>("");

  const npcList = step?.highlights?.npc ?? [];
  const objList = step?.highlights?.object ?? [];

  const targetNameValue = useMemo(() => {
    if (!step) return "";
    if (sel.targetType === "npc") {
      return step.highlights.npc?.[sel.targetIndex]?.npcName ?? "";
    }
    return step.highlights.object?.[sel.targetIndex]?.name ?? "";
  }, [step, sel.targetType, sel.targetIndex]);

  const onTargetTypeChange = useCallback((t: "npc" | "object") => {
    EditorStore.setSelection({ targetType: t, targetIndex: 0 });
    EditorStore.setUi({ captureMode: t === "npc" ? "single" : "multi-point" });
  }, []);

  const onTargetIndexChange = useCallback(
    (i: number, type: "npc" | "object") => {
      if (type !== sel.targetType) {
        EditorStore.setSelection({ targetType: type, targetIndex: i });
      } else {
        EditorStore.setSelection({ targetIndex: i });
      }
      EditorStore.setUi({
        captureMode: type === "npc" ? "single" : "multi-point",
      });
    },
    [sel.targetType]
  );

  const onTargetNameChange = useCallback(
    (name: string) => {
      EditorStore.patchQuest((draft) => {
        const s = draft.questSteps[sel.selectedStep];
        if (!s) return;
        if (sel.targetType === "npc") {
          const t = s.highlights.npc?.[sel.targetIndex];
          if (t) t.npcName = name;
        } else {
          const t = s.highlights.object?.[sel.targetIndex];
          if (t) t.name = name;
        }
      });
    },
    [sel.selectedStep, sel.targetIndex, sel.targetType]
  );

  const onAddNpc = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[sel.selectedStep];
      if (!s) return;
      const list = s.highlights.npc ?? (s.highlights.npc = []);
      list.push({
        id: undefined,
        npcName: "",
        npcLocation: { lat: undefined, lng: undefined } as NpcLocation,
        wanderRadius: {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      });
    });
    const nextIndex =
      quest?.questSteps?.[sel.selectedStep]?.highlights.npc?.length ?? 1 - 1;
    EditorStore.setSelection({ targetType: "npc", targetIndex: nextIndex });
    EditorStore.setUi({ captureMode: "single" });
  }, [quest, sel.selectedStep]);

  const onDeleteNpc = useCallback(() => {
    if (sel.targetType !== "npc" || npcList.length === 0) return;
    const index = sel.targetIndex;
    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[sel.selectedStep];
      if (!s?.highlights.npc) return;
      if (index >= 0 && index < s.highlights.npc.length) {
        s.highlights.npc.splice(index, 1);
      }
    });
    const nextLen = npcList.length - 1;
    const nextIndex = Math.max(0, Math.min(index, Math.max(0, nextLen)));
    EditorStore.setSelection({ targetType: "npc", targetIndex: nextIndex });
  }, [npcList.length, sel.selectedStep, sel.targetIndex, sel.targetType]);

  const onAddObject = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[sel.selectedStep];
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
      quest?.questSteps?.[sel.selectedStep]?.highlights.object?.length ?? 1;
    EditorStore.setSelection({ targetType: "object", targetIndex: nextIndex });

    EditorStore.setUi({ captureMode: "multi-point" });
  }, [quest, sel.selectedStep]);

  const onDeleteObject = useCallback(() => {
    if (sel.targetType !== "object" || objList.length === 0) return;
    const index = sel.targetIndex;
    EditorStore.patchQuest((draft) => {
      const s = draft.questSteps[sel.selectedStep];
      if (!s?.highlights.object) return;
      if (index >= 0 && index < s.highlights.object.length) {
        s.highlights.object.splice(index, 1);
      }
    });
    const nextLen = objList.length - 1;
    const nextIndex = Math.max(0, Math.min(index, Math.max(0, nextLen)));
    EditorStore.setSelection({ targetType: "object", targetIndex: nextIndex });
  }, [objList.length, sel.selectedStep, sel.targetIndex, sel.targetType]);

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

  const clearNpcPoint = useCallback(
    (npcIndex: number) => {
      EditorStore.patchQuest((draft) => {
        const s = draft.questSteps[sel.selectedStep];
        const t = s?.highlights.npc?.[npcIndex];
        if (!t) return;
        t.npcLocation = undefined as unknown as { lat: number; lng: number };
      });
    },
    [sel.selectedStep]
  );

  const deleteObjectPoint = useCallback(
    (objIndex: number, locIndex: number) => {
      EditorStore.patchQuest((draft) => {
        const s = draft.questSteps[sel.selectedStep];
        const t = s?.highlights.object?.[objIndex];
        if (!t?.objectLocation) return;
        if (locIndex < 0 || locIndex >= t.objectLocation.length) return;
        t.objectLocation.splice(locIndex, 1);
      });
    },
    [sel.selectedStep]
  );

  return (
    <div style={styles.panel}>
      <div style={styles.btnGroup}>
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
          onClick={() =>
            EditorStore.setUi({
              captureMode:
                ui.captureMode === "radius"
                  ? sel.targetType === "npc"
                    ? "single"
                    : "multi-point"
                  : "radius",
            })
          }
          style={{
            background: ui.captureMode === "radius" ? "#10b981" : undefined,
            borderColor: ui.captureMode === "radius" ? "#10b981" : undefined,
            color: ui.captureMode === "radius" ? "#fff" : undefined,
          }}
          title="Toggle radius capture"
        >
          Radius
        </button>
      </div>

      <div style={styles.btnGroup}>
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

      <div style={styles.controlGroup}>
        <label style={styles.fieldLabel}>Name</label>
        <input
          type="text"
          value={targetNameValue}
          onChange={(e) => onTargetNameChange(e.target.value)}
          placeholder={sel.targetType === "npc" ? "NPC Name" : "Object Name"}
          style={styles.inputText}
        />
      </div>

      {sel.targetType === "npc" && (
        <div style={styles.controlGroup}>
          <label style={styles.fieldLabel}>Chathead URL (optional)</label>
          <input
            type="text"
            value={npcChatheadUrl}
            onChange={(e) => setNpcChatheadUrl(e.target.value)}
            placeholder="https://runescape.wiki/images/Foo_chathead.png"
            style={styles.inputText}
          />
        </div>
      )}

      {sel.targetType === "object" && (
        <div className="editor-controls-grid" style={styles.controlGroup}>
          <div>
            <label style={styles.fieldLabel}>Object Color</label>
            <input
              type="color"
              value={ui.selectedObjectColor || "#FFFFFF"}
              onChange={(e) => {
                EditorStore.setUi({ selectedObjectColor: e.target.value });
              }}
              style={styles.colorInput}
            />
          </div>
          <div>
            <label style={styles.fieldLabel}>Object Number</label>
            <input
              type="text"
              value={currentObjectNumber}
              onChange={(e) => {
                EditorStore.setUi({ objectNumberLabel: e.target.value });
              }}
              placeholder="Optional"
              style={styles.inputText}
            />
          </div>
        </div>
      )}

      <div style={styles.controlGroup}>
        <div style={styles.targetsHeader}>NPCs</div>
        {npcList.length === 0 ? (
          <div className="qp-empty">No NPCs yet</div>
        ) : (
          <ul style={styles.list}>
            {npcList.map((npc: NpcHighlight, i: number) => {
              const isActive =
                sel.targetType === "npc" && sel.targetIndex === i;
              const hasLoc =
                !!npc.npcLocation &&
                Number.isFinite((npc.npcLocation as NpcLocation).lat) &&
                Number.isFinite((npc.npcLocation as NpcLocation).lng);
              return (
                <li
                  key={`npc-${i}`}
                  style={isActive ? styles.liActive : styles.li}
                  onClick={() => onTargetIndexChange(i, "npc")}
                >
                  <div style={styles.rowHeader}>
                    {isActive && <span style={styles.dot}>•</span>}
                    <span>{npc.npcName || `NPC ${i + 1}`}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {hasLoc
                      ? `{${npc.npcLocation.lat}, ${npc.npcLocation.lng}}`
                      : "{unset}"}
                  </div>

                  {isActive && (
                    <div
                      style={styles.subRow}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span style={styles.subRowMeta}>Location controls</span>
                      <button
                        className="button--delete"
                        style={styles.smallBtn}
                        onClick={() => clearNpcPoint(i)}
                        title="Clear NPC point"
                      >
                        Clear point
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div style={styles.controlGroup}>
        <div style={styles.targetsHeader}>Objects</div>
        {objList.length === 0 ? (
          <div className="qp-empty">No Objects yet</div>
        ) : (
          <ul style={styles.list}>
            {objList.map((obj: ObjectHighlight, i: number) => {
              const isActive =
                sel.targetType === "object" && sel.targetIndex === i;
              const pts = obj.objectLocation ?? [];
              return (
                <li
                  key={`obj-${i}`}
                  style={isActive ? styles.liActive : styles.li}
                  onClick={() => onTargetIndexChange(i, "object")}
                >
                  <div style={styles.rowHeader}>
                    {isActive && <span style={styles.dot}>•</span>}
                    <span>{obj.name || `Object ${i + 1}`}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>
                    {pts.length === 0
                      ? "No points"
                      : `${pts.length} point${pts.length === 1 ? "" : "s"}`}
                  </div>

                  {isActive && pts.length > 0 && (
                    <div
                      style={{ marginTop: 6 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {pts.map((p, idx) => (
                        <div
                          key={idx}
                          style={{
                            ...styles.subRow,
                            justifyContent: "space-between",
                          }}
                        >
                          <div style={{ display: "flex", gap: 10 }}>
                            <span style={styles.subRowMeta}>
                              {`{${p.lat}, ${p.lng}}`}
                            </span>
                            {p.color && (
                              <span style={styles.subRowMeta}>
                                color: {p.color}
                              </span>
                            )}
                            {p.numberLabel && (
                              <span style={styles.subRowMeta}>
                                label: {p.numberLabel}
                              </span>
                            )}
                          </div>
                          <button
                            className="button--delete"
                            style={styles.smallBtn}
                            onClick={() => deleteObjectPoint(i, idx)}
                            title="Delete this point"
                          >
                            Delete point
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PlotTargetsPanel;
