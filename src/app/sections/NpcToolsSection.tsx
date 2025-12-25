import React from "react";

export const NpcToolsSection: React.FC<{
  onResetNpcLocation: () => void;
  onAddNpc: () => void;
  onDeleteNpc: () => void;
  onSaveToLibrary?: () => void;
}> = ({ onResetNpcLocation, onAddNpc, onDeleteNpc, onSaveToLibrary }) => (
  <div className="panel-section npc-tools-section">
    <strong>NPC Tools</strong>
    <div className="button-group">
      <button onClick={onResetNpcLocation} className="button--delete">
        Reset Location
      </button>
      <button onClick={onAddNpc} className="button--add">
        Add NPC
      </button>
      <button onClick={onDeleteNpc} className="button--delete">
        Delete NPC
      </button>
      {onSaveToLibrary && (
        <button
          onClick={onSaveToLibrary}
          className="button--add"
          style={{ background: "#065f46" }}
          title="Save this NPC to your library for use in other quests"
        >
          Save to Library
        </button>
      )}
    </div>
  </div>
);
