import React from "react";

interface EditorPanelProps {
  children?: React.ReactNode;
  questJson: any;
  isOpen: boolean;
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
  onFloorIncrement: () => void;
  onFloorDecrement: () => void;
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
  onAddStep: () => void;
  onNewQuest: () => void;
  onAddObject: () => void;
  onSubmitToGitHub: () => void;
  onDeleteNpc: () => void;
  onDeleteObject: () => void;
}

export const EditorPanel = React.memo<EditorPanelProps>(
  ({
    children,
    questJson,
    isOpen,
    onResetRadius,
    itemsNeededValue,
    onItemsNeededChange,
    itemsRecommendedValue,
    onItemsRecommendedChange,
    additionalInfoValue,
    onAdditionalInfoChange,
    wanderRadiusInput,
    onWanderRadiusInputChange,
    onApplyRadius,
    jsonString,
    onJsonChange,
    stepDescriptionValue,
    onStepDescriptionChange,
    targetNameValue,
    onTargetNameChange,
    selectedStep,
    onStepIncrement,
    onStepDecrement,
    targetType,
    onTargetTypeChange,
    targetIndex,
    onTargetIndexChange,
    floor,
    onFloorIncrement,
    onFloorDecrement,
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
    onAddStep,
    onNewQuest,
    onAddObject,
    onSubmitToGitHub,
    onDeleteNpc,
    onDeleteObject,
  }) => {
    const handleEnterAsNewline = (
      event: React.KeyboardEvent<HTMLTextAreaElement>,
      currentValue: string,
      onChange: (newValue: string) => void
    ) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        const { selectionStart, selectionEnd } = event.currentTarget;
        const newValue =
          currentValue.substring(0, selectionStart) +
          "\n" +
          currentValue.substring(selectionEnd);
        onChange(newValue);
      }
    };

    return (
      <div className={`editor-panel ${isOpen ? "" : "closed"}`}>
        <input
          type="file"
          id="json-file-loader"
          accept=".json"
          style={{ display: "none" }}
          onChange={onFileLoadFromInput}
        />

        <div className="file-actions">
          <button
            onClick={onNewQuest}
            className="file-loader-button button--new"
          >
            New Quest
          </button>
          <button onClick={onLoadFile} className="file-loader-button">
            Load Quest
          </button>
          <button
            onClick={onSaveFile}
            className="file-loader-button button--save"
          >
            Save
          </button>
          <button
            onClick={onSaveAsFile}
            className="file-loader-button button--save-as"
          >
            Save As...
          </button>
          <button
            onClick={onSubmitToGitHub}
            className="file-loader-button button--submit"
          >
            Submit to GitHub
          </button>
        </div>

        <div className="panel-section step-description-display">
          <label className="EditDescriptionLabel">
            <span className="description-text">
              <strong>Step {selectedStep + 1}:</strong> {stepDescriptionValue}
            </span>
            <input
              type="checkbox"
              checked={selectEditDescription}
              onChange={onSelectEditStepDescription}
            />
          </label>
          {selectEditDescription && (
            <textarea
              value={stepDescriptionValue}
              onChange={(e) => onStepDescriptionChange(e.target.value)}
              rows={6}
            />
          )}
        </div>

        <div className="panel-section info-grid">
          <div className="item-list">
            <strong>Items Needed</strong>
            <textarea
              value={itemsNeededValue}
              onChange={(e) => onItemsNeededChange(e.target.value)}
              onKeyDown={(e) =>
                handleEnterAsNewline(e, itemsNeededValue, onItemsNeededChange)
              }
              rows={3}
              placeholder="One item per line..."
            />
          </div>
          <div className="item-list">
            <strong>Items Recommended</strong>
            <textarea
              value={itemsRecommendedValue}
              onChange={(e) => onItemsRecommendedChange(e.target.value)}
              onKeyDown={(e) =>
                handleEnterAsNewline(
                  e,
                  itemsRecommendedValue,
                  onItemsRecommendedChange
                )
              }
              rows={3}
              placeholder="One item per line..."
            />
          </div>
          <div className="item-list full-width">
            <strong>Additional Info</strong>
            <textarea
              value={additionalInfoValue}
              onChange={(e) => onAdditionalInfoChange(e.target.value)}
              rows={2}
              placeholder="One line of info..."
            />
          </div>
        </div>

        <div className="panel-section">
          <div className="editor-controls-grid">
            <div className="control-group">
              <label>Step Number</label>
              <div className="step-input-group">
                <button onClick={onStepDecrement} className="step-button">
                  -
                </button>
                <div className="step-display-label">{selectedStep + 1}</div>
                <button onClick={onStepIncrement} className="step-button">
                  +
                </button>
              </div>
            </div>

            <div className="control-group">
              <label>Floor</label>
              <div className="step-input-group">
                <button onClick={onFloorDecrement} className="step-button">
                  -
                </button>
                <div className="step-display-label">{floor}</div>
                <button onClick={onFloorIncrement} className="step-button">
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

        <div className="panel-section editor-controls-grid">
          <div className="control-group">
            <label>Target Type</label>
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

          <div className="control-group full-width-control">
            <label>{targetType === "npc" ? "NPCs" : "Objects"}</label>
            <ul className="target-list">
              {(
                questJson?.questSteps[selectedStep]?.highlights?.[targetType] ||
                []
              ).map((item: any, index: number) => (
                <li
                  key={index}
                  className={index === targetIndex ? "active" : ""}
                  onClick={() => onTargetIndexChange(index)}
                >
                  {targetType === "npc"
                    ? item.npcName || `NPC ${index + 1}`
                    : item.name || `Object ${index + 1}`}
                </li>
              ))}
            </ul>
          </div>

          <div className="control-group full-width-control">
            <label>Name</label>
            <input
              type="text"
              value={targetNameValue}
              onChange={(e) => onTargetNameChange(e.target.value)}
              placeholder="NPC or Object Name"
            />
          </div>
        </div>
        {children}
        {targetType === "npc" && (
          <div className="panel-section">
            <strong>NPC Tools</strong>
            <div className="button-group">
              <button onClick={onResetNpcLocation} className="button--delete">
                Reset NPC Location
              </button>
              <button onClick={onAddNpc} className="button--add">
                Add New NPC
              </button>
              <button onClick={onDeleteNpc} className="button--delete">
                Delete NPC
              </button>
            </div>
          </div>
        )}

        {targetType === "object" && (
          <div className="panel-section editor-controls-grid">
            <div className="control-group">
              <label>Object Color</label>
              <label className="color-picker-label">
                <div
                  className="color-picker-swatch"
                  style={{ backgroundColor: selectedObjectColor }}
                />
                <input
                  type="color"
                  value={selectedObjectColor}
                  onChange={(e) => onSelectedObjectColorChange(e.target.value)}
                  className="color-input-hidden"
                />
              </label>
            </div>
            <div className="control-group">
              <label>Object Number</label>
              <input
                type="text"
                placeholder="Optional"
                value={objectNumberLabel}
                onChange={(e) => onObjectNumberLabelChange(e.target.value)}
              />
            </div>
            <div className="control-group full-width">
              <div className="button-group">
                <button
                  onClick={onClearObjectLocations}
                  className="button--delete"
                >
                  Clear Object Locations
                </button>
                <button onClick={onAddObject} className="button--add">
                  Add New Object
                </button>
                <button onClick={onDeleteObject} className="button--delete">
                  Delete Object
                </button>
              </div>
            </div>
          </div>
        )}

        {(targetType === "npc" || targetType === "object") && (
          <div className="panel-section tool-section">
            <strong>Area/Radius Tools</strong>
            <div className="tool-controls">
              {targetType === "npc" && (
                <div className="radius-control-group">
                  <div className="radius-input-group">
                    <label>Radius:</label>
                    <input
                      type="number"
                      value={wanderRadiusInput}
                      onChange={(e) =>
                        onWanderRadiusInputChange(parseInt(e.target.value, 10))
                      }
                    />
                    <button onClick={onApplyRadius}>Apply to Center</button>
                  </div>
                  <button onClick={onSetRadiusMode}>Set Area by Corners</button>
                </div>
              )}
              {targetType === "object" && (
                <button onClick={onSetRadiusMode}>Set Area by Corners</button>
              )}
              <button onClick={onResetRadius} className="button--delete">
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
