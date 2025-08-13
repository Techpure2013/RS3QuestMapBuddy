import React from "react";

interface EditorPanelProps {
  onResetRadius: () => void;
  itemsNeededValue: string;
  onItemsNeededChange: (items: string) => void;
  itemsRecommendedValue: string;
  onItemsRecommendedChange: (items: string) => void;
  additionalInfoValue: string;
  onAdditionalInfoChange: (info: string) => void;
  wanderRadiusInput: number;
  onWanderRadiusInputChange: (radius: number) => void;
  onWanderRadiusCapture: () => void;
  onApplyRadius: () => void;
  jsonString: string;
  onJsonChange: (newJson: string) => void;
  onFileLoad: (event: React.ChangeEvent<HTMLInputElement>) => void;
  stepDescriptionValue: string;
  onStepDescriptionChange: (newDescription: string) => void;
  targetNameValue: string;
  onTargetNameChange: (newName: string) => void;
  selectedStep: number;
  onStepChange: (step: number) => void;
  onStepIncrement: () => void;
  onStepDecrement: () => void;
  targetType: "npc" | "object";
  onTargetTypeChange: (type: "npc" | "object") => void;
  targetIndex: number;
  onTargetIndexChange: (index: number) => void;
  floor: number;
  onFloorChange: (floor: number) => void;
}

export const EditorPanel: React.FC<EditorPanelProps> = ({
  itemsNeededValue,
  onItemsNeededChange,
  itemsRecommendedValue,
  onItemsRecommendedChange,
  additionalInfoValue,
  onAdditionalInfoChange,
  wanderRadiusInput,
  onWanderRadiusInputChange,
  onWanderRadiusCapture,
  onApplyRadius,
  jsonString,
  onJsonChange,
  onFileLoad,
  stepDescriptionValue,
  onStepDescriptionChange,
  targetNameValue,
  onTargetNameChange,
  selectedStep,
  onStepChange,
  onStepIncrement,
  onStepDecrement,
  targetType,
  onTargetTypeChange,
  targetIndex,
  onTargetIndexChange,
  floor,
  onFloorChange,
  onResetRadius,
}) => {
  return (
    <div className="editor-panel">
      <h3>Quest Editor</h3>
      <input
        type="file"
        id="json-file-loader"
        accept=".json"
        style={{ display: "none" }}
        onChange={onFileLoad}
      />
      <label htmlFor="json-file-loader" className="file-loader-button">
        Load Quest File
      </label>

      <div className="step-description-display">
        <strong>Step Description:</strong>
        <textarea
          value={stepDescriptionValue}
          onChange={(e) => onStepDescriptionChange(e.target.value)}
          rows={4}
        />
      </div>
      <div className="item-lists-container">
        <div className="item-list">
          <strong>Items Needed:</strong>
          <textarea
            value={itemsNeededValue}
            onChange={(e) => onItemsNeededChange(e.target.value)}
            rows={3}
            placeholder="One item per line..."
          />
        </div>
        <div className="item-list">
          <strong>Items Recommended:</strong>
          <textarea
            value={itemsRecommendedValue}
            onChange={(e) => onItemsRecommendedChange(e.target.value)}
            rows={3}
            placeholder="One item per line..."
          />
        </div>
      </div>
      <div className="item-list">
        <strong>Additional Info:</strong>
        <textarea
          value={additionalInfoValue}
          onChange={(e) => onAdditionalInfoChange(e.target.value)}
          rows={3}
          placeholder="One line of info..."
        />
      </div>
      <div className="editor-controls">
        <div className="control-group step-control">
          <label>Step Index:</label>
          <div className="step-input-group">
            <button onClick={onStepDecrement} className="step-button">
              -
            </button>
            <input
              type="number"
              value={selectedStep}
              onChange={(e) => onStepChange(parseInt(e.target.value, 10))}
            />
            <button onClick={onStepIncrement} className="step-button">
              +
            </button>
          </div>
        </div>
        <div className="control-group">
          <label>Floor:</label>
          <input
            type="number"
            value={floor}
            onChange={(e) => onFloorChange(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="control-group">
          <label>Target Type:</label>
          <select
            value={targetType}
            onChange={(e) =>
              onTargetTypeChange(e.target.value as "npc" | "object")
            }
          >
            <option value="npc">NPC</option>
            <option value="object">Object</option>
          </select>
        </div>
        <div className="control-group">
          <label>Target Index:</label>
          <input
            type="number"
            value={targetIndex}
            onChange={(e) => onTargetIndexChange(parseInt(e.target.value, 10))}
          />
        </div>
        <div className="control-group">
          <label>Name:</label>
          <input
            type="text"
            value={targetNameValue}
            onChange={(e) => onTargetNameChange(e.target.value)}
            placeholder="NPC or Object Name"
          />
        </div>
      </div>
      <div className="tool-section">
        <strong>Radius Tools (NPCs)</strong>
        <div className="tool-controls">
          <label>Radius:</label>
          <input
            type="number"
            value={wanderRadiusInput}
            onChange={(e) =>
              onWanderRadiusInputChange(parseInt(e.target.value, 10))
            }
          />
          <button onClick={onWanderRadiusCapture}>Capture Center</button>
          <button onClick={onApplyRadius}>Apply to Center</button>
          <button
            onClick={onResetRadius}
            style={{ backgroundColor: "#ffdddd" }}
          >
            Reset Radius
          </button>
        </div>
      </div>
      <textarea
        value={jsonString}
        onChange={(e) => onJsonChange(e.target.value)}
        placeholder="Load a quest file or paste JSON here..."
        className="json-textarea"
      ></textarea>
    </div>
  );
};
