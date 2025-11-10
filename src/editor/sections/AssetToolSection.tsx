import React, { useState } from "react";
import { ImagePasteTarget } from "./ImagePasteTarget";
import type { QuestImage } from "state/types";

const AssetToolsSection: React.FC<{
  isOpen: boolean;
  onToggle: () => void;

  // Removed: questImageList, onRemoveQuestImage, onReorderQuestImage,
  //          onSelectImageDirectory, imageDirectoryName, onImagePaste,
  //          stepImageUrl, onStepImageUrlChange, onAddImage

  // For preview URL building (kept in case future needs)
  questName: string;
  previewBaseUrl?: string;

  isAlt1Environment: boolean;

  chatheadName: string;
  onChatheadNameChange: (v: string) => void;
  chatheadUrl: string;
  onChatheadUrlChange: (v: string) => void;
  onAddChathead: () => void;
}> = ({
  isOpen,
  onToggle,

  questName,
  previewBaseUrl = "https://techpure.dev/RS3QuestBuddy/Images",

  isAlt1Environment,

  chatheadName,
  onChatheadNameChange,
  chatheadUrl,
  onChatheadUrlChange,
  onAddChathead,
}) => {
  return (
    <div className="panel-section">
      <label className="EditDescriptionLabel">
        <strong>Asset Creation Tools</strong>
        <input type="checkbox" checked={isOpen} onChange={onToggle} />
      </label>

      {isOpen && (
        <div style={{ marginTop: 10 }}>
          {/* Chatheads only */}
          <div className="panel-section">
            <div className="control-group">
              <label>Chathead Override Name</label>
              <input
                type="text"
                value={chatheadName}
                onChange={(e) => onChatheadNameChange(e.target.value)}
                placeholder="e.g., Master Chef ( Beneath Cursed Tides )"
              />
            </div>
            <div className="control-group">
              <label>Chathead Image URL</label>
              <input
                type="text"
                value={chatheadUrl}
                onChange={(e) => onChatheadUrlChange(e.target.value)}
                placeholder="Paste wiki URL here"
              />
            </div>
            <div className="button-group">
              <button onClick={onAddChathead} className="button--add">
                Add/Update Chathead Override
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetToolsSection;
