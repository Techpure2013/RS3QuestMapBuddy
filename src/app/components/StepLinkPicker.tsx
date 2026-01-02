import React, { useState, useRef, useEffect } from "react";

/** Simple picker for step links - just asks for step number */
export const StepLinkPicker: React.FC<{
  selectedText: string;
  onSelect: (stepNumber: number) => void;
  onClose: () => void;
}> = ({ selectedText, onSelect, onClose }) => {
  const [stepNumber, setStepNumber] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInsert = () => {
    const step = parseInt(stepNumber, 10);
    if (isNaN(step) || step < 1) return;
    onSelect(step);
  };

  const displayText = selectedText || `Skip to step ${stepNumber || "N"}`;

  return (
    <div
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        zIndex: 1000,
        background: "#1f2937",
        border: "1px solid #374151",
        borderRadius: 6,
        padding: 12,
        marginTop: 4,
        minWidth: 180,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 11, color: "#9ca3af", display: "block", marginBottom: 4 }}>
          Jump to Step #
        </label>
        <input
          ref={inputRef}
          type="number"
          min="1"
          value={stepNumber}
          onChange={(e) => setStepNumber(e.target.value)}
          placeholder="e.g. 22"
          style={{
            width: "100%",
            padding: "6px 8px",
            background: "#374151",
            border: "1px solid #4b5563",
            borderRadius: 4,
            color: "#e5e7eb",
            fontSize: 13,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleInsert();
            if (e.key === "Escape") onClose();
          }}
        />
      </div>
      {stepNumber && (
        <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 8, fontFamily: "monospace" }}>
          step({stepNumber}){`{${displayText}}`}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={handleInsert}
          disabled={!stepNumber || parseInt(stepNumber, 10) < 1}
          style={{
            flex: 1,
            padding: "6px 12px",
            background: parseInt(stepNumber, 10) >= 1 ? "#16a34a" : "#374151",
            border: "1px solid #22c55e",
            borderRadius: 4,
            color: parseInt(stepNumber, 10) >= 1 ? "#dcfce7" : "#6b7280",
            cursor: parseInt(stepNumber, 10) >= 1 ? "pointer" : "not-allowed",
            fontSize: 12,
          }}
        >
          Wrap
        </button>
        <button
          type="button"
          onClick={onClose}
          style={{
            padding: "6px 12px",
            background: "#374151",
            border: "1px solid #4b5563",
            borderRadius: 4,
            color: "#9ca3af",
            cursor: "pointer",
            fontSize: 12,
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default StepLinkPicker;
