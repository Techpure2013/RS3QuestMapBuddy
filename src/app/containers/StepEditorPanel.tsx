// src/app/containers/StepEditorPanel.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import { IconDeviceFloppy, IconX } from "@tabler/icons-react";

export const StepEditorPanel: React.FC = () => {
  const quest = useEditorSelector((s) => s.quest);
  const sel = useEditorSelector((s) => s.selection);

  const stepDescription =
    quest?.questSteps[sel.selectedStep]?.stepDescription ?? "";

  const [localValue, setLocalValue] = useState(stepDescription);
  const [hasChanges, setHasChanges] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync with store when step changes
  useEffect(() => {
    setLocalValue(stepDescription);
    setHasChanges(false);
  }, [sel.selectedStep, stepDescription]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localValue]);

  const handleChange = useCallback(
    (text: string) => {
      setLocalValue(text);
      setHasChanges(text !== stepDescription);
    },
    [stepDescription]
  );

  const handleSave = useCallback(() => {
    EditorStore.patchQuest((draft) => {
      const step = draft.questSteps[sel.selectedStep];
      if (step) step.stepDescription = localValue;
    });
    setHasChanges(false);
  }, [localValue, sel.selectedStep]);

  const handleDiscard = useCallback(() => {
    setLocalValue(stepDescription);
    setHasChanges(false);
  }, [stepDescription]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Escape to discard
      if (e.key === "Escape" && hasChanges) {
        e.preventDefault();
        handleDiscard();
      }
    },
    [handleSave, handleDiscard, hasChanges]
  );

  const charCount = localValue.length;
  const wordCount = localValue.trim()
    ? localValue.trim().split(/\s+/).length
    : 0;

  return (
    <div
      style={{
        background: "#0b1220",
        border: "1px solid #374151",
        borderRadius: 8,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          background: "#111827",
          borderBottom: "1px solid #374151",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasChanges && (
            <span
              style={{
                fontSize: "0.6875rem",
                color: "#f59e0b",
                background: "rgba(245, 158, 11, 0.1)",
                padding: "2px 6px",
                borderRadius: 4,
                fontWeight: 500,
              }}
            >
              Modified
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          {hasChanges && (
            <>
              <button
                onClick={handleDiscard}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#374151",
                  border: "1px solid #4b5563",
                  borderRadius: 4,
                  color: "#d1d5db",
                }}
                title="Discard changes (Esc)"
              >
                <IconX size={14} />
                Discard
              </button>
              <button
                onClick={handleSave}
                style={{
                  padding: "4px 8px",
                  fontSize: "0.75rem",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  background: "#10b981",
                  border: "1px solid #059669",
                  borderRadius: 4,
                  color: "white",
                }}
                title="Save changes (Ctrl+S)"
              >
                <IconDeviceFloppy size={14} />
                Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div style={{ padding: 12 }}>
        <textarea
          ref={textareaRef}
          value={localValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Describe what the player needs to do in this step..."
          style={{
            width: "100%",
            minHeight: 80,
            maxHeight: 200,
            padding: "8px 10px",
            background: "#1f2937",
            border: hasChanges ? "1px solid #f59e0b" : "1px solid #374151",
            borderRadius: 6,
            color: "#e5e7eb",
            fontSize: "0.875rem",
            fontFamily: "inherit",
            lineHeight: 1.6,
            resize: "none",
            overflow: "auto",
            transition: "border-color 0.15s ease",
          }}
          onFocus={(e) => {
            if (!hasChanges) {
              e.currentTarget.style.borderColor = "#3b82f6";
            }
          }}
          onBlur={(e) => {
            if (!hasChanges) {
              e.currentTarget.style.borderColor = "#374151";
            }
          }}
        />

        {/* Footer Stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 6,
            fontSize: "0.6875rem",
            color: "#6b7280",
          }}
        >
          <div style={{ display: "flex", gap: 12 }}>
            <span>
              {wordCount} word{wordCount !== 1 ? "s" : ""}
            </span>
            <span>
              {charCount} character{charCount !== 1 ? "s" : ""}
            </span>
          </div>
          {hasChanges && (
            <span style={{ color: "#9ca3af", fontStyle: "italic" }}>
              Press Ctrl+S to save, Esc to discard
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default StepEditorPanel;
