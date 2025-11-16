import React from "react";

export const NpcToolsSection: React.FC<{
  onResetNpcLocation: () => void;
  onAddNpc: () => void;
  onDeleteNpc: () => void;
}> = ({ onResetNpcLocation, onAddNpc, onDeleteNpc }) => (
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
    </div>
  </div>
);
