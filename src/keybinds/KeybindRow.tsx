// src/keybinds/KeybindRow.tsx
// Individual keybind row with edit capability

import React, { useState, useCallback, useEffect, useRef } from "react";
import type { KeyCombo, ResolvedKeybind } from "./types";
import { keybindStore } from "./keybindStore";
import { formatKeyCombo, parseKeyComboFromEvent } from "./utils";

interface KeybindRowProps {
  keybind: ResolvedKeybind;
  isEditing: boolean;
}

export const KeybindRow: React.FC<KeybindRowProps> = ({ keybind, isEditing }) => {
  const [newKey, setNewKey] = useState<KeyCombo | null>(null);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const captureRef = useRef<HTMLDivElement>(null);

  // Focus the capture element when editing starts
  useEffect(() => {
    if (isEditing && captureRef.current) {
      captureRef.current.focus();
    }
  }, [isEditing]);

  // Reset state when editing ends
  useEffect(() => {
    if (!isEditing) {
      setNewKey(null);
      setConflicts([]);
    }
  }, [isEditing]);

  const handleKeyCapture = useCallback(
    (e: React.KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Escape cancels editing
      if (e.key === "Escape") {
        keybindStore.setEditingKeybind(null);
        return;
      }

      // Skip modifier-only keys
      if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
        return;
      }

      const combo = parseKeyComboFromEvent(e.nativeEvent);
      setNewKey(combo);
      setConflicts(keybindStore.findConflicts(combo, keybind.id));
    },
    [keybind.id]
  );

  const handleSave = () => {
    if (newKey && conflicts.length === 0) {
      keybindStore.setKeybind(keybind.id, newKey);
    }
    keybindStore.setEditingKeybind(null);
  };

  const handleCancel = () => {
    keybindStore.setEditingKeybind(null);
  };

  const handleReset = () => {
    if (window.confirm(`Clear keybind for "${keybind.label}"? This will set it back to unassigned.`)) {
      keybindStore.resetKeybind(keybind.id);
    }
  };

  const handleStartEdit = () => {
    keybindStore.setEditingKeybind(keybind.id);
  };

  return (
    <div
      className={`keybind-row ${isEditing ? "editing" : ""}`}
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: 4,
        background: isEditing ? "rgba(59, 130, 246, 0.1)" : "transparent",
        border: isEditing ? "1px solid #3b82f6" : "1px solid transparent",
        transition: "background 0.15s",
      }}
    >
      {/* Label */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 500, color: "#e5e7eb" }}>{keybind.label}</span>
        {keybind.isCustomized && (
          <span style={{ color: "#60a5fa", marginLeft: 6, fontSize: 11 }}>(custom)</span>
        )}
        {keybind.description && (
          <div style={{ fontSize: 11, color: "#6b7280", marginTop: 2 }}>
            {keybind.description}
          </div>
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: 12 }}>
        {isEditing ? (
          <>
            {/* Key capture input */}
            <div
              ref={captureRef}
              tabIndex={0}
              onKeyDown={handleKeyCapture}
              style={{
                padding: "6px 12px",
                background: "#1f2937",
                border: "2px dashed #4b5563",
                borderRadius: 4,
                color: newKey ? "#e5e7eb" : "#9ca3af",
                minWidth: 120,
                textAlign: "center",
                cursor: "text",
                outline: "none",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#3b82f6";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#4b5563";
              }}
            >
              {newKey ? formatKeyCombo(newKey) : "Press a key..."}
            </div>

            {/* Conflict warning */}
            {conflicts.length > 0 && (
              <span style={{ color: "#f87171", fontSize: 11, whiteSpace: "nowrap" }}>
                Conflict!
              </span>
            )}

            {/* Save/Cancel buttons */}
            <button
              onClick={handleSave}
              disabled={!newKey || conflicts.length > 0}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                background: !newKey || conflicts.length > 0 ? "#374151" : "#059669",
                color: !newKey || conflicts.length > 0 ? "#6b7280" : "#d1fae5",
                border: "none",
                borderRadius: 4,
                cursor: !newKey || conflicts.length > 0 ? "not-allowed" : "pointer",
              }}
            >
              Save
            </button>
            <button
              onClick={handleCancel}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                background: "#374151",
                color: "#9ca3af",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            {/* Key display */}
            <kbd
              style={{
                display: "inline-block",
                padding: "3px 8px",
                fontFamily: "ui-monospace, monospace",
                fontSize: 11,
                background: keybind.currentKey
                  ? "linear-gradient(180deg, #374151, #1f2937)"
                  : "transparent",
                border: keybind.currentKey
                  ? "1px solid #4b5563"
                  : "1px dashed #4b5563",
                borderRadius: 4,
                boxShadow: keybind.currentKey ? "0 2px 0 #111827" : "none",
                color: keybind.currentKey ? "#e5e7eb" : "#6b7280",
                fontStyle: keybind.currentKey ? "normal" : "italic",
              }}
            >
              {formatKeyCombo(keybind.currentKey)}
            </kbd>

            {/* Set/Edit button */}
            <button
              onClick={handleStartEdit}
              style={{
                padding: "4px 10px",
                fontSize: 11,
                background: keybind.currentKey ? "#374151" : "#2563eb",
                color: keybind.currentKey ? "#9ca3af" : "#fff",
                border: "none",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {keybind.currentKey ? "Edit" : "Set"}
            </button>

            {/* Reset button (only for customized) */}
            {keybind.isCustomized && (
              <button
                onClick={handleReset}
                style={{
                  padding: "4px 10px",
                  fontSize: 11,
                  background: "#7f1d1d",
                  color: "#fecaca",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
