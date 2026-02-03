import React, { useRef, useState } from "react";
import { RichText } from "../../utils/RichText";
import { FormattingToolbar } from "../components/FormattingToolbar";
import { TableCreator } from "../components/TableCreator";
import { EditorStore } from "../../state/editorStore";

export const StepDescriptionSection: React.FC<{
  stepNumber: number;
  value: string;
  editing: boolean;
  onToggleEdit: () => void;
  onChange: (text: string) => void;
}> = ({ stepNumber, value, editing, onToggleEdit, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showTableCreator, setShowTableCreator] = useState(false);

  const handleInsertTable = (markup: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const end = textarea.selectionEnd;
    const newText = value.substring(0, end) + markup + value.substring(end);
    onChange(newText);
    setShowTableCreator(false);

    requestAnimationFrame(() => {
      textarea.focus();
      const newPos = end + markup.length;
      textarea.setSelectionRange(newPos, newPos);
    });
  };

  const handleStepClick = (step: number) => {
    const stepIndex = step - 1;
    const quest = EditorStore.getState().quest;
    if (stepIndex >= 0 && quest?.questSteps && stepIndex < quest.questSteps.length) {
      EditorStore.autoSelectFirstValidTargetForStep(stepIndex);
    }
  };

  return (
    <div className="panel-section step-description-display">
      <label className="EditDescriptionLabel">
        <span className="description-text">
          <strong>Step {stepNumber}:</strong>{" "}
          {value ? <RichText onStepClick={handleStepClick}>{value}</RichText> : null}
        </span>
        <input type="checkbox" checked={editing} onChange={onToggleEdit} />
      </label>
      {editing && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "center" }}>
            <button
              type="button"
              title="Create table (paste from wiki or build manually)"
              onClick={() => setShowTableCreator(true)}
              style={{
                padding: "6px 12px",
                background: "#7c3aed",
                border: "1px solid #8b5cf6",
                borderRadius: 4,
                color: "#ddd6fe",
                cursor: "pointer",
                fontSize: "0.8rem",
                fontWeight: 500,
              }}
            >
              ⊞ Table
            </button>
            <FormattingToolbar
              textareaRef={textareaRef}
              value={value}
              onChange={onChange}
              defaultCollapsed
            />
          </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
          />
        </>
      )}
      {showTableCreator && (
        <TableCreator
          onInsert={handleInsertTable}
          onClose={() => setShowTableCreator(false)}
        />
      )}
    </div>
  );
};
