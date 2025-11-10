// src/editor/panel/sections/StepControlsSection.tsx
import React from "react";

interface StepControlsSectionProps {
  stepNumber: number;
  onIncrement: () => void;
  onDecrement: () => void;
  floor: number;
  onFloorInc: () => void;
  onFloorDec: () => void;
  onAddStep: () => void;
  onDeleteStep: () => void;
}

export const StepControlsSection: React.FC<StepControlsSectionProps> = ({
  stepNumber,
  onIncrement,
  onDecrement,
  floor,
  onFloorInc,
  onFloorDec,
  onAddStep,
  onDeleteStep,
}) => {
  return (
    <div className="panel-section">
      <div className="editor-controls-grid">
        <div className="control-group">
          <label>Step Number</label>
          <div className="step-input-group">
            <button onClick={onDecrement} className="step-button">
              -
            </button>
            <div className="step-display-label">{stepNumber}</div>
            <button onClick={onIncrement} className="step-button">
              +
            </button>
          </div>
        </div>
        <div className="control-group">
          <label>Floor</label>
          <div className="step-input-group">
            <button onClick={onFloorDec} className="step-button">
              -
            </button>
            <div className="step-display-label">{floor}</div>
            <button onClick={onFloorInc} className="step-button">
              +
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
