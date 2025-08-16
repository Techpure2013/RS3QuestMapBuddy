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
  onClearObjectLocations: () => void;
  selectedObjectColor: string;
  onSelectedObjectColorChange: (color: string) => void;
  onSetRadiusMode: () => void;
  objectNumberLabel: string;
  onObjectNumberLabelChange: (label: string) => void;
  onFileLoadFromInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadFile: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;
}

export const EditorPanel = React.memo<EditorPanelProps>(
  ({
    onResetRadius,
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
    onClearObjectLocations,
    selectedObjectColor,
    onSelectedObjectColorChange,
    onSetRadiusMode,
    objectNumberLabel,
    onObjectNumberLabelChange,
    onFileLoadFromInput,
    onLoadFile,
    onSaveFile,
    onSaveAsFile,
  }) => {
    return (
      <div className="editor-panel">
        <h3>Quest Editor</h3>
        <input
          type="file"
          id="json-file-loader"
          accept=".json"
          style={{ display: "none" }}
          onChange={onFileLoadFromInput}
        />

        <div className="file-actions">
          <button onClick={onLoadFile} className="file-loader-button">
            Load Quest File
          </button>
          <button
            onClick={onSaveFile}
            className="file-loader-button"
            style={{ backgroundColor: "#d4edda" }}
          >
            Save
          </button>
          <button
            onClick={onSaveAsFile}
            className="file-loader-button"
            style={{ backgroundColor: "#d1ecf1" }}
          >
            Save As...
          </button>
        </div>

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
          {targetType === "object" && (
            <>
              <div className="control-group">
                <label>Object Color:</label>
                <input
                  type="color"
                  value={selectedObjectColor}
                  onChange={(e) => onSelectedObjectColorChange(e.target.value)}
                  style={{ width: "100%", height: "30px" }}
                />
              </div>
              <div className="control-group">
                <label>Object Number:</label>
                <input
                  type="text"
                  placeholder="Optional"
                  value={objectNumberLabel}
                  onChange={(e) => onObjectNumberLabelChange(e.target.value)}
                />
              </div>
              <div className="control-group">
                <button
                  onClick={onClearObjectLocations}
                  style={{ width: "100%", backgroundColor: "#ffdddd" }}
                >
                  Clear Object Locations
                </button>
              </div>
            </>
          )}
          <div className="control-group">
            <label>Target Index:</label>
            <input
              type="number"
              value={targetIndex}
              onChange={(e) =>
                onTargetIndexChange(parseInt(e.target.value, 10))
              }
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
        {(targetType === "npc" || targetType === "object") && (
          <div className="tool-section">
            <strong>Area/Radius Tools</strong>
            <div className="tool-controls">
              {targetType === "npc" && (
                <>
                  <label>Radius:</label>
                  <input
                    type="number"
                    value={wanderRadiusInput}
                    onChange={(e) =>
                      onWanderRadiusInputChange(parseInt(e.target.value, 10))
                    }
                  />
                  <button onClick={onApplyRadius}>Apply to Center</button>
                </>
              )}
              {targetType === "object" && (
                <button onClick={onSetRadiusMode}>Set Area by Corners</button>
              )}
              <button
                onClick={onResetRadius}
                style={{ backgroundColor: "#ffdddd" }}
              >
                Reset Area
              </button>
            </div>
          </div>
        )}
        <textarea
          value={jsonString}
          onChange={(e) => onJsonChange(e.target.value)}
          placeholder="Load a quest file or paste JSON here..."
          className="json-textarea"
        ></textarea>
      </div>
    );
  }
);
