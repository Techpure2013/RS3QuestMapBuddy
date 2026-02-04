import React, { useCallback, useRef, useEffect } from "react";
import type { Clipboard, Quest } from "../../state/types";
import type { NpcHighlight, ObjectHighlight } from "../../state/types";
import EditorStore from "./../../state/editorStore";
import { useEditorSelector } from "../../state/useEditorSelector";
import {
  IconCircle,
  IconCircleDashed,
} from "@tabler/icons-react";

interface TargetSelectionSectionProps {
  quest: Quest | null;
  selectedStep: number;
  targetType: "npc" | "object";
  onTargetTypeChange: (t: "npc" | "object") => void;
  targetIndex: number;
  onTargetIndexChange: (i: number, type: "npc" | "object") => void;
  clipboard: Clipboard;
  onCopyList: () => void;
  onPasteList: () => void;
  onCopySelected: () => void;
  onPasteSelected: () => void;
  onDeleteObjectLocation: (locationIndex: number) => void;
  targetNameValue: string;
  onTargetNameChange: (name: string) => void;
}

export const TargetSelectionSection: React.FC<TargetSelectionSectionProps> = ({
  quest,
  selectedStep,
  targetType,
  onTargetTypeChange,
  targetIndex,
  onTargetIndexChange,
  clipboard,
  onCopyList,
  onPasteList,
  onCopySelected,
  onPasteSelected,
  onDeleteObjectLocation,
  targetNameValue,
  onTargetNameChange,
}) => {
  const step = quest?.questSteps?.[selectedStep];
  const npcItems = step?.highlights?.npc ?? [];
  const objectItems = step?.highlights?.object ?? [];
  const zeroBox = {
    bottomLeft: { lat: null, lng: null },
    topRight: { lat: null, lng: null },
  };
  const captureMode = useEditorSelector((s) => s.ui.captureMode);
  const radiusFirstCorner = useEditorSelector((s) => s.ui.radiusFirstCorner);
  const focusTargetName = useEditorSelector((s) => s.ui.focusTargetName);

  // Ref for name input to enable focus on new NPC/Object creation
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus and select name input when focusTargetName flag is set
  useEffect(() => {
    if (focusTargetName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
      // Clear the flag after focusing
      EditorStore.setUi({ focusTargetName: false });
    }
  }, [focusTargetName]);

  const setHoveredPoint = useCallback(
    (
      type: "npc" | "object" | null,
      targetIdx: number | null,
      locationIdx?: number | null
    ) => {
      EditorStore.setSelection({
        hoveredTargetType: type,
        hoveredTargetIndex: targetIdx,
        hoveredLocationIndex: locationIdx ?? null,
      });
    },
    []
  );

  const clearHover = useCallback(() => {
    setHoveredPoint(null, null, null);
  }, [setHoveredPoint]);

  const clearCurrentRadius = useCallback(() => {
    const s = EditorStore.getState();
    const stepIdx = s.selection.selectedStep;
    const idx = s.selection.targetIndex;
    const t = s.selection.targetType;

    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[stepIdx];
      if (!step) return;

      if (t === "npc") {
        const item = step.highlights.npc?.[idx];
        if (!item) return;
        item.wanderRadius = { ...zeroBox };
      } else {
        const item = step.highlights.object?.[idx];
        if (!item) return;
        // Option A: zero-out radius
        item.objectRadius = { ...zeroBox };
        // Option B: remove field
        // delete item.objectRadius;
      }
    });
  }, []);
  const toggleRadius = useCallback(() => {
    const state = EditorStore.getState();
    const isRadius = state.ui.captureMode === "radius";
    const next = isRadius
      ? state.selection.targetType === "npc"
        ? "single"
        : "multi-point"
      : "radius";
    EditorStore.setUi({ captureMode: next });
  }, []);

  const labelCss: React.CSSProperties = {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 4,
  };
  const inputCss: React.CSSProperties = {
    padding: "4px 6px",
    fontSize: 12,
    height: 28,
    background: "#0f172a",
    border: "1px solid #334155",
    borderRadius: 6,
    color: "#e5e7eb",
    outline: "none",
  };
  const btnCss: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: 12,
    height: 28,
  };

  const pillBase: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    height: 28,
    padding: "0 10px",
    borderRadius: 999,
    border: "1px solid #334155",
    background: "#0b1220",
    color: "#d1d5db",
    cursor: "pointer",
    userSelect: "none",
    transition: "all 120ms ease",
  };

  const pillActive: React.CSSProperties = {
    background: "linear-gradient(135deg,#10b981,#059669)",
    borderColor: "#059669",
    color: "#ffffff",
    boxShadow:
      "0 0 0 1px rgba(16,185,129,0.25), 0 4px 18px rgba(16,185,129,0.20)",
  };

  const pillHover: React.CSSProperties = {
    boxShadow: "0 0 0 1px rgba(148,163,184,0.18)",
  };

  const iconStyle: React.CSSProperties = { width: 14, height: 14 };
  const isPasteableItem =
    !clipboard.type.endsWith("-list") && clipboard.type === targetType;
  const isRadius = captureMode === "radius";
  const modeHint =
    targetType === "npc"
      ? isRadius
        ? "Radius on (NPC)"
        : "Switch to Radius (NPC)"
      : isRadius
      ? "Radius on (Object)"
      : "Switch to Radius (Object)";

  // Get current radius values for selected target
  const currentTarget =
    targetType === "npc"
      ? npcItems[targetIndex]
      : objectItems[targetIndex];
  const currentRadius =
    targetType === "npc"
      ? (currentTarget as NpcHighlight)?.wanderRadius
      : (currentTarget as ObjectHighlight)?.objectRadius;
  const hasBL = currentRadius?.bottomLeft?.lat != null && currentRadius?.bottomLeft?.lng != null;
  const hasTR = currentRadius?.topRight?.lat != null && currentRadius?.topRight?.lng != null;

  return (
    <div className="panel-section" style={{ paddingTop: 6, paddingBottom: 6 }}>
      {/* Row 1: Name field (full width) */}
      <div className="control-group" style={{ margin: 0, marginBottom: 10 }}>
        <label style={labelCss}>Name</label>
        <input
          ref={nameInputRef}
          type="text"
          value={targetNameValue}
          onChange={(e) => onTargetNameChange(e.target.value)}
          placeholder={targetType === "npc" ? "NPC Name" : "Object Name"}
          style={{ ...inputCss, width: "100%" }}
        />
      </div>

      {/* Row 2: Type + Mode + Radius controls */}
      <div
        className="editor-controls-grid"
        style={{
          display: "flex",
          gap: 8,
          alignItems: "end",
          flexWrap: "wrap",
        }}
      >
        {/* Target Type */}
        <div className="control-group" style={{ margin: 0 }}>
          <label style={labelCss}>Type</label>
          <select
            value={targetType}
            onChange={(e) =>
              onTargetTypeChange(e.target.value as "npc" | "object")
            }
            style={{ ...inputCss, minWidth: 80 }}
          >
            <option value="npc">NPC</option>
            <option value="object">Object</option>
          </select>
        </div>

        {/* Radius toggle */}
        <div className="control-group" style={{ margin: 0 }}>
          <label style={labelCss}>Radius</label>
          <button
            onClick={toggleRadius}
            type="button"
            title={modeHint}
            style={{
              ...pillBase,
              ...(isRadius ? pillActive : {}),
            }}
            onMouseEnter={(e) => {
              if (!isRadius) Object.assign(e.currentTarget.style, pillHover);
            }}
            onMouseLeave={(e) => {
              if (!isRadius)
                Object.assign(e.currentTarget.style, { boxShadow: "none" });
            }}
          >
            {isRadius ? (
              <>
                <IconCircle style={iconStyle} />
                <span style={{ fontWeight: 600, letterSpacing: 0.2 }}>ON</span>
              </>
            ) : (
              <>
                <IconCircleDashed style={iconStyle} />
                <span style={{ fontWeight: 600, color: "#cbd5e1" }}>OFF</span>
              </>
            )}
          </button>
        </div>

        {/* Clear Radius button */}
        <div className="control-group" style={{ margin: 0 }}>
          <label style={{ ...labelCss, visibility: "hidden" }}>Clear</label>
          <button
            onClick={clearCurrentRadius}
            type="button"
            title="Clear the radius for the selected target"
            style={{
              height: 28,
              padding: "0 10px",
              borderRadius: 6,
              border: "1px solid #4b5563",
              background: "#1f2937",
              color: "#e5e7eb",
              cursor: "pointer",
              fontSize: 12,
              transition: "all 120ms ease",
            }}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, {
                borderColor: "#ef4444",
                color: "#fecaca",
                background: "#7f1d1d",
              });
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, {
                borderColor: "#4b5563",
                color: "#e5e7eb",
                background: "#1f2937",
              });
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Row 3: Radius display - show when in radius mode OR when radius is set */}
      {(isRadius || (hasBL && hasTR)) && (
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 8,
            padding: "8px 10px",
            background: hasBL && hasTR ? "rgba(16, 185, 129, 0.05)" : "rgba(59, 130, 246, 0.05)",
            border: hasBL && hasTR ? "1px solid #10b981" : "1px solid #3b82f6",
            borderRadius: 6,
          }}
        >
          {/* Bottom Left */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: radiusFirstCorner || (hasBL && hasTR) ? "#34d399" : "#9ca3af",
                marginBottom: 2,
              }}
            >
              Bottom Left
            </div>
            <div style={{ fontSize: 11, color: "#e5e7eb", fontFamily: "monospace" }}>
              {hasBL && hasTR ? (
                `${currentRadius!.bottomLeft!.lat}, ${currentRadius!.bottomLeft!.lng}`
              ) : radiusFirstCorner ? (
                `${radiusFirstCorner.lat}, ${radiusFirstCorner.lng}`
              ) : (
                <span style={{ color: "#6b7280", fontStyle: "italic" }}>Click map...</span>
              )}
            </div>
          </div>

          {/* Top Right */}
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                color: hasBL && hasTR ? "#34d399" : "#9ca3af",
                marginBottom: 2,
              }}
            >
              Top Right
            </div>
            <div style={{ fontSize: 11, color: "#e5e7eb", fontFamily: "monospace" }}>
              {hasBL && hasTR ? (
                `${currentRadius!.topRight!.lat}, ${currentRadius!.topRight!.lng}`
              ) : radiusFirstCorner ? (
                <span style={{ color: "#6b7280", fontStyle: "italic" }}>Click again...</span>
              ) : (
                <span style={{ color: "#6b7280", fontStyle: "italic" }}>—</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Targets */}
      <div className="control-group" style={{ marginTop: 10 }}>
        <label style={labelCss}>Targets</label>

        {npcItems.length > 0 && (
          <div className="target-section" style={{ marginBottom: 8 }}>
            <div
              className="target-section-header"
              style={{
                fontSize: 12,
                color: "#93c5fd",
                marginBottom: 4,
                letterSpacing: 0.2,
              }}
            >
              NPCs
            </div>
            <ul className="target-list" style={{ margin: 0 }}>
              {npcItems.map((npc: NpcHighlight, index: number) => {
                const isActive = targetType === "npc" && index === targetIndex;
                const displayName = npc.npcName || `NPC ${index + 1}`;
                const loc = npc.npcLocation;
                const isUnset = !loc || (loc.lat === 0 && loc.lng === 0);

                return (
                  <li
                    key={`npc-${index}`}
                    className={isActive ? "active" : ""}
                    onClick={() => onTargetIndexChange(index, "npc")}
                    onMouseEnter={() => setHoveredPoint("npc", index, null)}
                    onMouseLeave={clearHover}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 10px",
                      borderBottom: "1px solid #1f2937",
                      cursor: "pointer",
                      background: isActive
                        ? "rgba(37, 99, 235, 0.10)"
                        : undefined,
                      borderLeft: isActive ? "3px solid #2563eb" : undefined,
                    }}
                  >
                    <span style={{ fontSize: 13, color: "#e5e7eb" }}>
                      {displayName}
                    </span>
                    <span style={{ fontSize: 11, color: "#9ca3af" }}>
                      {isUnset ? "{unset}" : `{${loc.lat}, ${loc.lng}}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {objectItems.length > 0 && (
          <div className="target-section">
            <div
              className="target-section-header"
              style={{
                fontSize: 12,
                color: "#a3e635",
                marginBottom: 4,
                letterSpacing: 0.2,
              }}
            >
              Objects
            </div>
            <ul className="target-list" style={{ margin: 0 }}>
              {objectItems.map((obj: ObjectHighlight, index: number) => {
                const isActive =
                  targetType === "object" && index === targetIndex;
                const displayName = obj.name || `Object ${index + 1}`;
                const pts = obj.objectLocation ?? [];

                return (
                  <li
                    key={`object-${index}`}
                    className={isActive ? "active" : ""}
                    onClick={() => onTargetIndexChange(index, "object")}
                    style={{
                      padding: "6px 10px",
                      borderBottom: "1px solid #1f2937",
                      cursor: "pointer",
                      background: isActive
                        ? "rgba(37, 99, 235, 0.10)"
                        : undefined,
                      borderLeft: isActive ? "3px solid #2563eb" : undefined,
                    }}
                  >
                    <div
                      className="target-item-header"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: 13, color: "#e5e7eb" }}>
                        {displayName}
                      </span>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>
                        {pts.length === 0
                          ? "No points"
                          : `${pts.length} point${pts.length > 1 ? "s" : ""}`}
                      </span>
                    </div>

                    {isActive && pts.length > 0 && (
                      <ul
                        className="location-sublist"
                        style={{
                          marginTop: 6,
                          marginBottom: 0,
                          paddingLeft: 0,
                        }}
                      >
                        {pts.map((loc, locIndex) => (
                          <li
                            key={locIndex}
                            className="location-item"
                            onMouseEnter={() =>
                              setHoveredPoint("object", index, locIndex)
                            }
                            onMouseLeave={clearHover}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "4px 6px",
                              background: "#0b1220",
                              borderRadius: 6,
                              marginBottom: 4,
                              border: "1px solid #1f2937",
                              transition: "border-color 0.15s ease",
                            }}
                          >
                            <span style={{ fontSize: 11, color: "#9ca3af" }}>
                              {`{${loc.lat}, ${loc.lng}}`}
                              {loc.color ? ` • ${loc.color}` : ""}
                              {loc.numberLabel ? ` • #${loc.numberLabel}` : ""}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteObjectLocation(locIndex);
                              }}
                              className="location-delete-btn"
                              title="Delete this location"
                              style={{
                                ...btnCss,
                                height: 22,
                                padding: "0 8px",
                                borderRadius: 6,
                                background: "#1f2937",
                                border: "1px solid #334155",
                                color: "#e5e7eb",
                              }}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {/* Bottom row: copy/paste buttons */}
      <div
        className="control-group full-width-control"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}
      >
        <div className="button-group" style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onCopyList}
            style={{
              ...btnCss,
              borderRadius: 6,
              background: "#0b1220",
              border: "1px solid #334155",
              color: "#e5e7eb",
            }}
          >
            Copy List
          </button>
          <button
            onClick={onPasteList}
            disabled={!clipboard.type.endsWith("-list")}
            title={
              !clipboard.type.endsWith("-list")
                ? "Clipboard does not contain a list"
                : "Replace current list with clipboard"
            }
            style={{
              ...btnCss,
              borderRadius: 6,
              background: clipboard.type.endsWith("-list")
                ? "#0b1220"
                : "#0b1220",
              border: "1px solid #334155",
              color: clipboard.type.endsWith("-list") ? "#e5e7eb" : "#6b7280",
              opacity: clipboard.type.endsWith("-list") ? 1 : 0.6,
            }}
          >
            Paste List
          </button>
        </div>

        <div className="button-group" style={{ display: "flex", gap: 6 }}>
          <button
            onClick={onCopySelected}
            style={{
              ...btnCss,
              borderRadius: 6,
              background: "#0b1220",
              border: "1px solid #334155",
              color: "#e5e7eb",
            }}
          >
            Copy Selected
          </button>
          <button
            onClick={onPasteSelected}
            disabled={
              clipboard.type === "none" ||
              clipboard.type.endsWith("-list") ||
              clipboard.type !== targetType
            }
            title={
              clipboard.type === "none"
                ? "Clipboard is empty"
                : clipboard.type !== targetType
                ? `Cannot paste ${clipboard.type} over ${targetType}`
                : "Paste from clipboard"
            }
            style={{
              ...btnCss,
              borderRadius: 6,
              background: "#0b1220",
              border: "1px solid #334155",
              color: isPasteableItem ? "#e5e7eb" : "#6b7280",
              opacity: isPasteableItem ? 1 : 0.6,
            }}
          >
            Paste Over Selected
          </button>
        </div>
      </div>
    </div>
  );
};
