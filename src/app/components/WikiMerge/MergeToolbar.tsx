// src/app/components/WikiMerge/MergeToolbar.tsx
// Toolbar with bulk actions, undo/redo, and progress

import React from "react";
import { MergeStore } from "../../../state/mergeStore";
import { useMergeUndoRedo } from "../../../state/useMergeSelector";
import type { StepFieldDiffs } from "../../../types/merge";

interface MergeToolbarProps {
  totalDecisions: number;
  pendingDecisions: number;
}

export const MergeToolbar: React.FC<MergeToolbarProps> = ({
  totalDecisions,
  pendingDecisions,
}) => {
  const { canUndo, canRedo, undoCount, redoCount } = useMergeUndoRedo();
  const decidedCount = totalDecisions - pendingDecisions;
  const progress = totalDecisions > 0 ? (decidedCount / totalDecisions) * 100 : 100;

  const buttonStyle: React.CSSProperties = {
    padding: "6px 12px",
    fontSize: 12,
    background: "#374151",
    border: "1px solid #4b5563",
    borderRadius: 4,
    color: "#e5e7eb",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 4,
  };

  const primaryButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "#22c55e",
    borderColor: "#16a34a",
    color: "#fff",
  };

  const dangerButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    background: "#dc2626",
    borderColor: "#b91c1c",
    color: "#fff",
  };

  const disabledStyle: React.CSSProperties = {
    opacity: 0.5,
    cursor: "not-allowed",
  };

  return (
    <div style={{ padding: "8px 12px", background: "#1f2937", borderBottom: "1px solid #374151" }}>
      {/* Top row: bulk actions */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        {/* Accept/Reject All */}
        <button
          onClick={() => MergeStore.acceptAll()}
          style={primaryButtonStyle}
          title="Accept all wiki changes"
        >
          ✓ Accept All
        </button>
        <button
          onClick={() => MergeStore.rejectAll()}
          style={dangerButtonStyle}
          title="Reject all wiki changes (keep local)"
        >
          ✕ Reject All
        </button>

        <div style={{ width: 1, height: 24, background: "#374151", margin: "0 4px" }} />

        {/* By field type */}
        <FieldTypeDropdown />

        <div style={{ flex: 1 }} />

        {/* Undo/Redo */}
        <button
          onClick={() => MergeStore.undo()}
          disabled={!canUndo}
          style={{ ...buttonStyle, ...(canUndo ? {} : disabledStyle) }}
          title={`Undo (${undoCount})`}
        >
          ↩ Undo
        </button>
        <button
          onClick={() => MergeStore.redo()}
          disabled={!canRedo}
          style={{ ...buttonStyle, ...(canRedo ? {} : disabledStyle) }}
          title={`Redo (${redoCount})`}
        >
          ↪ Redo
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            flex: 1,
            height: 6,
            background: "#374151",
            borderRadius: 3,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: progress === 100 ? "#22c55e" : "#3b82f6",
              transition: "width 0.2s ease",
            }}
          />
        </div>
        <span style={{ fontSize: 11, color: "#9ca3af", minWidth: 80, textAlign: "right" }}>
          {decidedCount} / {totalDecisions} decided
        </span>
      </div>
    </div>
  );
};

/** Dropdown for accepting all of a specific field type */
const FieldTypeDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = React.useState(false);

  const fieldTypes: { key: keyof StepFieldDiffs; label: string }[] = [
    { key: "stepDescription", label: "Descriptions" },
    { key: "itemsNeeded", label: "Items Needed" },
    { key: "itemsRecommended", label: "Items Recommended" },
    { key: "dialogOptions", label: "Dialog Options" },
    { key: "additionalStepInformation", label: "Additional Info" },
  ];

  const handleAcceptType = (fieldName: keyof StepFieldDiffs) => {
    MergeStore.acceptAllOfType(fieldName);
    setIsOpen(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        style={{
          padding: "6px 12px",
          fontSize: 12,
          background: "#374151",
          border: "1px solid #4b5563",
          borderRadius: 4,
          color: "#e5e7eb",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        Accept by Type ▾
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 100001 }}
            onClick={() => setIsOpen(false)}
          />
          {/* Dropdown */}
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              marginTop: 4,
              background: "#1f2937",
              border: "1px solid #374151",
              borderRadius: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              zIndex: 100002,
              minWidth: 160,
              overflow: "hidden",
            }}
          >
            {fieldTypes.map(({ key, label }) => (
              <button
                key={key}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAcceptType(key);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "8px 12px",
                  background: "transparent",
                  border: "none",
                  color: "#e5e7eb",
                  textAlign: "left",
                  cursor: "pointer",
                  fontSize: 12,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#374151")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                ✓ {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MergeToolbar;
