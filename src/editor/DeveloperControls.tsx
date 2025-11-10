import React, { useState } from "react";
import { QuestDetailsEditor } from "./sections/QuestDetailsEditor";
import type { Clipboard, Quest, QuestImage } from "../state/types";
import AssetToolsSection from "./sections/AssetToolSection";
import { ObjectToolsSection } from "./sections/ObjectToolsSection";
import { NpcToolsSection } from "./sections/NpcToolsSection";
import { TargetSelectionSection } from "./sections/TargetSelectionSection";
import { StepControlsSection } from "./sections/StepControlSection";
import { ItemsSection } from "./sections/ItemsSection";
import { StepDescriptionSection } from "./sections/StepDescriptionSection";
import { QuestPickerModal } from "./sections/QuestPickerModal";
import QuestImagesPanel from "./sections/ImageTool";

type TargetType = "npc" | "object";

interface QuestListItem {
  name: string;
}

export interface EditorPanelProps {
  children?: React.ReactNode;

  // Core quest and state
  questJson: Quest | null;
  isOpen: boolean;

  // Area/Radius
  onResetRadius: () => void;
  wanderRadiusInput: number;
  onWanderRadiusInputChange: (radius: number) => void;
  onWanderRadiusCapture: () => void;
  onApplyRadius: () => void;

  // Step fields and JSON
  itemsNeededValue: string;
  onItemsNeededChange: (items: string) => void;
  itemsRecommendedValue: string;
  onItemsRecommendedChange: (items: string) => void;
  additionalInfoValue: string;
  onAdditionalInfoChange: (info: string) => void;

  jsonString: string;
  onJsonChange: (newJson: string) => void;

  stepDescriptionValue: string;
  onStepDescriptionChange: (newDescription: string) => void;

  // Target fields
  targetNameValue: string;
  onTargetNameChange: (newName: string) => void;

  // Step navigation
  selectedStep: number;
  onStepChange: (step: number) => void;
  onStepIncrement: () => void;
  onStepDecrement: () => void;

  // Target selection
  targetType: TargetType;
  onTargetTypeChange: (type: TargetType) => void;
  targetIndex: number;
  onTargetIndexChange: (index: number) => void;

  // Floor
  floor: number;
  onFloorIncrement: () => void;
  onFloorDecrement: () => void;

  // Object location ops
  onDeleteObjectLocation: (locationIndex: number) => void;

  // Object styling
  selectedObjectColor: string;
  onSelectedObjectColorChange: (color: string) => void;
  onSetRadiusMode: () => void;

  // NPC helpers
  onResetNpcLocation: () => void;

  // Object labels
  objectNumberLabel: string;
  onObjectNumberLabelChange: (label: string) => void;

  // Legacy file IO (no longer used; keep as no-ops for compatibility)
  onFileLoadFromInput: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLoadFile: () => void;
  onSaveFile: () => void;
  onSaveAsFile: () => void;

  // Step editing toggle
  selectEditDescription: boolean;
  onSelectEditStepDescription: () => void;

  // Step CRUD
  onAddNpc: () => void;
  onDeleteStep: () => void;
  onAddStep: () => void;
  onNewQuest: () => void;
  onAddObject: () => void;

  // PR submission
  onSubmitToGitHub: () => void;

  // Delete targets
  onDeleteNpc: () => void;
  onDeleteObject: () => void;

  // Assets management (DB-first; no file load/save now)
  onAddChatheadOverride: (name: string, url: string) => void;

  // Quest images: live list for current quest, mutate immediately
  questImageList: QuestImage[];
  onQuestImageListChange: (images: QuestImage[]) => void;
  onRemoveQuestImage: (index: number) => void;
  onReorderQuestImage?: (from: number, to: number) => void;

  // Image ingest (paste/URL) and local dir (optional)
  onAddStepImage: (url: string) => void;
  onSelectImageDirectory: () => void;
  imageDirectoryName: string;
  onImagePaste: (imageBlob: Blob) => void;

  isAlt1Environment: boolean;

  // Clipboard ops
  clipboard: Clipboard;
  onCopyTarget: () => void;
  onPasteTarget: () => void;
  onCopyTargetList: () => void;
  onPasteTargetList: () => void;

  // Quest updates
  onUpdateQuest: (updatedQuest: Quest) => void;
  onSaveEditsToIDB: () => void;
  onPublishEdits: () => void;
  // Master DB tools (legacy/back-compat)
  onSaveMasterQuestFile: () => void;
  onLoadMasterFile: () => void;

  // DB actions
  canRecordNpcLocation: boolean;
  onRecordNpcLocation: () => void;

  // Quest search (DB)
  onSearchQuests: (
    term: string,
    page?: number
  ) => Promise<{ items: { name: string }[]; total: number }>;
  onLoadQuestFromDb: (name: string) => Promise<void>;
  questSearchResults: QuestListItem[];
  questSearchTotal: number;
  questSearchLoading: boolean;
}

export const EditorPanel: React.FC<EditorPanelProps> = React.memo((props) => {
  const {
    // Core
    children,
    questJson,
    isOpen,

    // Search
    onSearchQuests,
    onLoadQuestFromDb,
    questSearchResults,
    questSearchLoading,

    // Clipboard
    clipboard,
    onCopyTarget,
    onPasteTarget,
    onCopyTargetList,
    onPasteTargetList,

    // Radius/Area
    onResetRadius,
    wanderRadiusInput,
    onWanderRadiusInputChange,
    onApplyRadius,
    onSetRadiusMode,

    // Step/JSON fields
    itemsNeededValue,
    onItemsNeededChange,
    itemsRecommendedValue,
    onItemsRecommendedChange,
    additionalInfoValue,
    onAdditionalInfoChange,

    jsonString,
    onJsonChange,

    stepDescriptionValue,
    onStepDescriptionChange,

    targetNameValue,
    onTargetNameChange,

    // Step navigation
    selectedStep,
    onStepIncrement,
    onStepDecrement,

    // Target selection
    targetType,
    onTargetTypeChange,
    targetIndex,
    onTargetIndexChange,

    // Floor
    floor,
    onFloorIncrement,
    onFloorDecrement,

    // Object location ops
    onDeleteObjectLocation,

    // Object styling
    selectedObjectColor,
    onSelectedObjectColorChange,

    // NPC
    onResetNpcLocation,

    // Object labels
    objectNumberLabel,
    onObjectNumberLabelChange,

    // Legacy file IO (kept as no-ops)
    onFileLoadFromInput,
    onLoadFile,
    onSaveFile,
    onSaveAsFile,

    // Step description toggle
    selectEditDescription,
    onSelectEditStepDescription,

    // Step CRUD
    onAddNpc,
    onDeleteStep,
    onAddStep,
    onNewQuest,
    onAddObject,

    // PR
    onSubmitToGitHub,

    // Delete targets
    onDeleteNpc,
    onDeleteObject,

    // Chatheads
    onAddChatheadOverride,

    // Quest images (live)
    questImageList,
    onQuestImageListChange,
    onRemoveQuestImage,
    onReorderQuestImage,
    onSaveEditsToIDB,
    onPublishEdits,
    // Image ingest and local dir
    onAddStepImage,
    onSelectImageDirectory,
    imageDirectoryName,
    onImagePaste,

    isAlt1Environment,

    // Quest updates
    onUpdateQuest,

    // Master tools
    onSaveMasterQuestFile,
    onLoadMasterFile,

    // DB actions
    canRecordNpcLocation,
    onRecordNpcLocation,
  } = props;

  // Local UI state
  const [chatheadName, setChatheadName] = useState("");
  const [chatheadUrl, setChatheadUrl] = useState("");
  const [stepImageUrl, setStepImageUrl] = useState("");
  const [isAssetToolsOpen, setIsAssetToolsOpen] = useState(false);
  const [isQuestPickerOpen, setIsQuestPickerOpen] = useState(false);

  // Helpers
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
  const [isQuestImagesOpen, setIsQuestImagesOpen] = useState(true);
  const handleAddChathead = () => {
    onAddChatheadOverride(chatheadName.trim(), chatheadUrl.trim());
    setChatheadName("");
    setChatheadUrl("");
  };

  const handleAddImage = () => {
    if (!stepImageUrl.trim()) return;
    onAddStepImage(stepImageUrl.trim());
    setStepImageUrl("");
  };

  return (
    <div className={`editor-panel ${isOpen ? "" : "closed"}`}>
      {/* Legacy hidden file input (kept as a no-op for compatibility) */}
      <input
        type="file"
        id="json-file-loader"
        accept=".json"
        style={{ display: "none" }}
        onChange={onFileLoadFromInput}
      />

      <button
        className="file-loader-button"
        onClick={() => setIsQuestPickerOpen(true)}
      >
        Open Quest Picker
      </button>
      <div className="button-group" style={{ marginTop: 8 }}>
        <button onClick={onSaveEditsToIDB} className="button--save">
          Save Edits (Local)
        </button>
        <button onClick={onPublishEdits} className="button--add">
          Publish Edits (DB)
        </button>
      </div>
      <QuestPickerModal
        isOpen={isQuestPickerOpen}
        onClose={() => setIsQuestPickerOpen(false)}
        onPick={onLoadQuestFromDb}
      />

      {!!questJson && (
        <div className="panel-section">
          <QuestDetailsEditor
            questJson={questJson}
            onUpdateQuest={onUpdateQuest}
          />
        </div>
      )}

      <StepDescriptionSection
        stepNumber={selectedStep + 1}
        value={stepDescriptionValue}
        editing={selectEditDescription}
        onToggleEdit={onSelectEditStepDescription}
        onChange={onStepDescriptionChange}
      />

      <ItemsSection
        itemsNeeded={itemsNeededValue}
        onItemsNeededChange={onItemsNeededChange}
        itemsRecommended={itemsRecommendedValue}
        onItemsRecommendedChange={onItemsRecommendedChange}
        additionalInfo={additionalInfoValue}
        onAdditionalInfoChange={onAdditionalInfoChange}
        onEnterAsNewline={handleEnterAsNewline}
      />

      <StepControlsSection
        stepNumber={selectedStep + 1}
        onIncrement={onStepIncrement}
        onDecrement={onStepDecrement}
        floor={floor}
        onFloorInc={onFloorIncrement}
        onFloorDec={onFloorDecrement}
        onAddStep={onAddStep}
        onDeleteStep={onDeleteStep}
      />

      <TargetSelectionSection
        quest={questJson}
        selectedStep={selectedStep}
        targetType={targetType}
        onTargetTypeChange={onTargetTypeChange}
        targetIndex={targetIndex}
        onTargetIndexChange={onTargetIndexChange}
        clipboard={clipboard}
        onCopyList={onCopyTargetList}
        onPasteList={onPasteTargetList}
        onCopySelected={onCopyTarget}
        onPasteSelected={onPasteTarget}
        onDeleteObjectLocation={onDeleteObjectLocation}
        targetNameValue={targetNameValue}
        onTargetNameChange={onTargetNameChange}
      />

      {targetType === "npc" && (
        <NpcToolsSection
          onResetNpcLocation={onResetNpcLocation}
          onAddNpc={onAddNpc}
          onDeleteNpc={onDeleteNpc}
          canRecordNpcLocation={canRecordNpcLocation}
          onRecordNpcLocation={onRecordNpcLocation}
        />
      )}

      {targetType === "object" && (
        <ObjectToolsSection
          selectedObjectColor={selectedObjectColor}
          onSelectedObjectColorChange={onSelectedObjectColorChange}
          objectNumberLabel={objectNumberLabel}
          onObjectNumberLabelChange={onObjectNumberLabelChange}
          onAddObject={onAddObject}
          onDeleteObject={onDeleteObject}
        />
      )}

      <AssetToolsSection
        isOpen={isAssetToolsOpen}
        onToggle={() => setIsAssetToolsOpen((v) => !v)}
        isAlt1Environment={isAlt1Environment}
        questName={questJson?.questName ?? ""}
        previewBaseUrl="https://techpure.dev/RS3QuestBuddy/Images"
        chatheadName={chatheadName}
        onChatheadNameChange={setChatheadName}
        chatheadUrl={chatheadUrl}
        onChatheadUrlChange={setChatheadUrl}
        onAddChathead={handleAddChathead}
      />

      <QuestImagesPanel
        isOpen={isQuestImagesOpen}
        onToggle={() => setIsQuestImagesOpen((v) => !v)}
        questName={questJson?.questName ?? ""}
        previewBaseUrl="https://techpure.dev/RS3QuestBuddy/Images"
        questImageList={questImageList}
        onRemoveQuestImage={onRemoveQuestImage}
        onReorderQuestImage={onReorderQuestImage}
        onSelectImageDirectory={onSelectImageDirectory}
        imageDirectoryName={imageDirectoryName}
        onImagePaste={onImagePaste}
        stepImageUrl={stepImageUrl}
        onStepImageUrlChange={setStepImageUrl}
        onAddImage={handleAddImage}
      />

      {children}
    </div>
  );
});
