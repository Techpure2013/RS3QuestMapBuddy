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
  onResetNpcLocation: () => void;
  objectNumberLabel: string;
  onObjectNumberLabelChange: (label: string) => void;
  onFileLoadFromInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadFile: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;
  selectEditDescription: boolean;
  onSelectEditStepDescription: () => void;
  onAddNpc: () => void;
  onDeleteStep: () => void;
  onFloorIncrement: () => void; // New prop
  onFloorDecrement: () => void;

  onSubmitToGitHub: () => void;
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
    selectEditDescription,
    onSelectEditStepDescription,
    onResetNpcLocation,
    onAddNpc,
    onDeleteStep,
    onFloorIncrement,
    onFloorDecrement,

    onSubmitToGitHub,
  }) => {
    return (
      <div className="editor-panel">
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
          <button
            onClick={onSubmitToGitHub}
            className="file-loader-button"
            style={{ backgroundColor: "#e2e3e5", color: "#383d41" }}
          >
            Submit to GitHub
          </button>
        </div>
        <label className="EditDescriptionLabel">
          Edit Step Description
          <input type="checkbox" onClick={onSelectEditStepDescription} />
        </label>
        <div className="step-description-display">
          <strong>Step {selectedStep + 1}: </strong>
          {selectEditDescription ? (
            <textarea
              value={stepDescriptionValue}
              onChange={(e) => onStepDescriptionChange(e.target.value)}
              rows={10}
            />
          ) : (
            <label>{stepDescriptionValue}</label>
          )}
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
            <label>Step Number:</label>
            <div className="step-input-group">
              <button onClick={onStepDecrement} className="step-button">
                -
              </button>
              <label
                style={{
                  minWidth: "40px",
                  padding: "6px 12px",
                  textAlign: "center",
                  backgroundColor: "#e9ecef",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  margin: "0 4px",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  color: "#495057",
                  display: "inline-block",
                  verticalAlign: "middle",
                }}
              >
                {selectedStep + 1}
              </label>
              <button onClick={onStepIncrement} className="step-button">
                +
              </button>
              <button
                onClick={onDeleteStep}
                style={{
                  width: "100%",
                  backgroundColor: "#f8d7da",
                  color: "#721c24",
                  marginTop: "4px",
                  border: "1px solid #f5c6cb",
                  marginLeft: "10px",
                }}
              >
                Delete Current Step
              </button>
            </div>
          </div>
          <div className="control-group">
            <label>Floor:</label>
            {/* ✅ NEW UI FOR FLOOR CONTROL */}
            <div className="step-input-group">
              <button onClick={onFloorDecrement} className="step-button">
                -
              </button>
              <label
                style={{
                  minWidth: "40px",
                  padding: "6px 12px",
                  textAlign: "center",
                  backgroundColor: "#e9ecef",
                  border: "1px solid #ced4da",
                  borderRadius: "4px",
                  margin: "0 4px",
                  fontWeight: "bold",
                  fontSize: "1rem",
                  color: "#495057",
                  display: "inline-block",
                  verticalAlign: "middle",
                }}
              >
                {floor}
              </label>
              <button onClick={onFloorIncrement} className="step-button">
                +
              </button>
            </div>
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
          {targetType === "npc" && (
            <div className="control-group">
              <button
                onClick={onResetNpcLocation}
                style={{ width: "100%", backgroundColor: "#ffdddd" }}
              >
                Reset NPC Location
              </button>
              <button
                onClick={onAddNpc}
                style={{
                  width: "100%",
                  backgroundColor: "#ddffdd",
                  marginTop: "4px",
                }}
              >
                Add New NPC
              </button>
            </div>
          )}
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
              value={targetIndex + 1}
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
                  <button onClick={onSetRadiusMode} style={{ width: "100%" }}>
                    Set Area by Corners
                  </button>
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
