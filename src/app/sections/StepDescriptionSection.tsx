import React, { useRef } from "react";
import { RichText } from "../../utils/RichText";
import { FormattingToolbar } from "../components/FormattingToolbar";
import { EditorStore } from "../../state/editorStore";

export const StepDescriptionSection: React.FC<{
  stepNumber: number;
  value: string;
  editing: boolean;
  onToggleEdit: () => void;
  onChange: (text: string) => void;
}> = ({ stepNumber, value, editing, onToggleEdit, onChange }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
          <FormattingToolbar
            textareaRef={textareaRef}
            value={value}
            onChange={onChange}
            defaultCollapsed
          />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
          />
        </>
      )}
    </div>
  );
};
