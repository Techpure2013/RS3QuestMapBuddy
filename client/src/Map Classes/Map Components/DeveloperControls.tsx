import React, { useState } from "react";
import { ImagePasteTarget } from "./ImagePasteTarget";

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
  onAddChatheadOverride: (name: string, url: string) => void;
  onAddStepImage: (url: string) => void;
  onLoadChatheadOverrides: () => void;
  onSaveChatheadOverrides: () => void;
  onLoadQuestImageList: () => void;
  onSaveQuestImageList: () => void;
  onSelectImageDirectory: () => void;
  imageDirectoryName: string;
  onImagePaste: (imageBlob: Blob) => void;
  // --- NEW: Add Save As props ---
  onSaveChatheadOverridesAs: () => void;
  onSaveQuestImageListAs: () => void;
  //Alt1 Detection
  isAlt1Environment: boolean;
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
    onAddChatheadOverride,
    onAddStepImage,
    onLoadChatheadOverrides,
    onSaveChatheadOverrides,
    onLoadQuestImageList,
    onSaveQuestImageList,
    onSelectImageDirectory,
    imageDirectoryName,
    onImagePaste,
    // --- NEW: Destructure Save As props ---
    onSaveChatheadOverridesAs,
    onSaveQuestImageListAs,
    isAlt1Environment,
  }) => {
    const [chatheadName, setChatheadName] = useState("");
    const [chatheadUrl, setChatheadUrl] = useState("");
    const [stepImageUrl, setStepImageUrl] = useState("");
    const [isAssetToolsOpen, setIsAssetToolsOpen] = useState(false);

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

    const handleAddChathead = () => {
      onAddChatheadOverride(chatheadName, chatheadUrl);
      setChatheadName("");
      setChatheadUrl("");
    };

    const handleAddImage = () => {
      onAddStepImage(stepImageUrl);
      setStepImageUrl("");
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
            disabled={isAlt1Environment}
            title={
              isAlt1Environment
                ? "Direct save is disabled in Alt1. Use 'Save As'."
                : ""
            }
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
        <div className="panel-section">
          <label className="EditDescriptionLabel">
            <strong>Asset Creation Tools</strong>
            <input
              type="checkbox"
              checked={isAssetToolsOpen}
              onChange={() => setIsAssetToolsOpen(!isAssetToolsOpen)}
            />
          </label>

          {isAssetToolsOpen && (
            <div style={{ marginTop: "10px" }}>
              <div className="panel-section">
                <div className="button-group">
                  <button onClick={onLoadChatheadOverrides}>
                    Load Chathead JSON
                  </button>
                  <button
                    onClick={onSaveChatheadOverrides}
                    disabled={isAlt1Environment}
                    title={
                      isAlt1Environment
                        ? "Direct save is disabled in Alt1. Use 'Save As'."
                        : ""
                    }
                  >
                    Save
                  </button>
                  {/* --- NEW: Save As button for chatheads --- */}
                  <button onClick={onSaveChatheadOverridesAs}>Save As</button>
                </div>
                <div className="control-group">
                  <label>Chathead Override Name</label>
                  <input
                    type="text"
                    value={chatheadName}
                    onChange={(e) => setChatheadName(e.target.value)}
                    placeholder="e.g., Master Chef ( Beneath Cursed Tides )"
                  />
                </div>
                <div className="control-group">
                  <label>Chathead Image URL</label>
                  <input
                    type="text"
                    value={chatheadUrl}
                    onChange={(e) => setChatheadUrl(e.target.value)}
                    placeholder="Paste wiki URL here"
                  />
                </div>
                <button onClick={handleAddChathead} className="button--add">
                  Add/Update Chathead Override
                </button>
              </div>

              <div className="panel-section">
                <div className="button-group">
                  <button onClick={onLoadQuestImageList}>
                    Load Quest Image List JSON
                  </button>
                  <button
                    onClick={onSaveQuestImageList}
                    disabled={isAlt1Environment}
                    title={
                      isAlt1Environment
                        ? "Direct save is disabled in Alt1. Use 'Save As'."
                        : ""
                    }
                  >
                    Save
                  </button>
                  {/* --- NEW: Save As button for image list --- */}
                  <button onClick={onSaveQuestImageListAs}>Save As</button>
                </div>
                <button
                  onClick={onSelectImageDirectory}
                  style={{ width: "100%", marginTop: "8px" }}
                >
                  {imageDirectoryName
                    ? `Saving to: ${imageDirectoryName}`
                    : "Select Image Save Directory"}
                </button>
                <ImagePasteTarget
                  onImagePaste={onImagePaste}
                  disabled={!imageDirectoryName}
                />
                <div className="control-group">
                  <label>Or Add Step Image from URL</label>
                  <input
                    type="text"
                    value={stepImageUrl}
                    onChange={(e) => setStepImageUrl(e.target.value)}
                    placeholder="Paste image URL here"
                  />
                </div>
                <button
                  onClick={handleAddImage}
                  className="button--add"
                  disabled={!imageDirectoryName}
                  title={
                    !imageDirectoryName
                      ? "Please select an image directory first"
                      : ""
                  }
                >
                  Add Image from URL
                </button>
              </div>
            </div>
          )}
        </div>

        {children}

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
