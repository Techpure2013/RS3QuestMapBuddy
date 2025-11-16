import React, { useState } from "react";

import { addPendingChathead } from "./../../idb/chatheadQueue";

const AssetToolsSection: React.FC<{
  isOpen: boolean;
  onToggle: () => void;
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

  chatheadName,
  onChatheadNameChange,
  chatheadUrl,
  onChatheadUrlChange,
  onAddChathead,
}) => {
  async function handleQueueChathead() {
    // Example: variant from parentheses in name, or UI input
    const variant = "default"; // normalize as you do elsewhere
    await addPendingChathead({
      // if you have an active NPC target with an id, pass npcId
      // otherwise pass the name (exact string you want to match)
      name: chatheadName.trim(), // or npc.npcName
      variant,
      sourceUrl: chatheadUrl.trim(),
    });
    alert("Queued chathead for publish.");
  }
  return (
    <div className="panel-section">
      <label className="EditDescriptionLabel">
        <strong>Chathead Creation Tool</strong>
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
                placeholder="Input the name you want of the chathead."
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
              <button
                onClick={() => void handleQueueChathead()}
                className="button--add"
              >
                Queue for Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetToolsSection;
