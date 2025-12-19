import React from "react";
import { RichText } from "../../utils/RichText";

export const StepDescriptionSection: React.FC<{
  stepNumber: number;
  value: string;
  editing: boolean;
  onToggleEdit: () => void;
  onChange: (text: string) => void;
}> = ({ stepNumber, value, editing, onToggleEdit, onChange }) => (
  <div className="panel-section step-description-display">
    <label className="EditDescriptionLabel">
      <span className="description-text">
        <strong>Step {stepNumber}:</strong>{" "}
        {value ? <RichText>{value}</RichText> : null}
      </span>
      <input type="checkbox" checked={editing} onChange={onToggleEdit} />
    </label>
    {editing && (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={6}
      />
    )}
  </div>
);
