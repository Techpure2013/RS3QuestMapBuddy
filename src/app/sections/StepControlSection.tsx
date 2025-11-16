import React from "react";

interface StepControlsSectionProps {
  stepNumber: number;
  totalSteps: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onStepSelect: (step: number) => void;
  floor: number;
  onFloorInc: () => void;
  onFloorDec: () => void;
  onAddStep: () => void;
  onDeleteStep: () => void;
}

export const StepControlsSection: React.FC<StepControlsSectionProps> = ({
  stepNumber,
  totalSteps,
  onIncrement,
  onDecrement,
  onStepSelect,
  floor,
  onFloorInc,
  onFloorDec,
  onAddStep,
  onDeleteStep,
}) => {
  return (
    <div className="panel-section">
      <div className="editor-controls-grid">
        {/* Step Navigation with Dropdown */}
        <div className="control-group">
          <label>Step Navigation</label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button
              onClick={onDecrement}
              disabled={stepNumber === 1}
              className="step-button"
              style={{ minWidth: 36 }}
              title="Previous step"
            >
              ←
            </button>

            <div
              style={{ flex: 1, display: "flex", gap: 4, alignItems: "center" }}
            >
              <select
                value={stepNumber - 1}
                onChange={(e) => onStepSelect(Number(e.target.value))}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--accent-primary)",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                }}
              >
                {Array.from({ length: totalSteps }, (_, i) => (
                  <option key={i} value={i}>
                    Step {i + 1}
                  </option>
                ))}
              </select>
              <span
                style={{
                  fontSize: "0.75rem",
                  color: "var(--text-muted)",
                  whiteSpace: "nowrap",
                }}
              >
                / {totalSteps}
              </span>
            </div>

            <button
              onClick={onIncrement}
              disabled={stepNumber === totalSteps}
              className="step-button"
              style={{ minWidth: 36 }}
              title="Next step"
            >
              →
            </button>
          </div>
        </div>

        {/* Floor Controls */}
        <div className="control-group">
          <label>Floor</label>
          <div className="step-input-group">
            <button onClick={onFloorDec} className="step-button">
              ↓
            </button>
            <div className="step-display-label">F{floor}</div>
            <button onClick={onFloorInc} className="step-button">
              ↑
            </button>
          </div>
        </div>
      </div>

      <div className="step-action-buttons">
        <button onClick={onAddStep} className="button--add">
          Add Step
        </button>
        <button onClick={onDeleteStep} className="button--delete">
          Delete Step
        </button>
      </div>
    </div>
  );
};
