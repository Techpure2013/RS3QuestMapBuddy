import React from "react";
export const NpcToolsSection: React.FC<{
  onResetNpcLocation: () => void;
  onAddNpc: () => void;
  onDeleteNpc: () => void;
  canRecordNpcLocation: boolean;
  onRecordNpcLocation: () => void;
}> = ({
  onResetNpcLocation,
  onAddNpc,
  onDeleteNpc,
  canRecordNpcLocation,
  onRecordNpcLocation,
}) => (
  <>
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

    {canRecordNpcLocation && (
      <div className="panel-section">
        <strong>DB Actions</strong>
        <button
          onClick={onRecordNpcLocation}
          className="button--add"
          title="Record this NPC location to the database"
        >
          Record NPC Location
        </button>
        <p className="help-text">
          Saves the selected NPC’s current location to your DB. This is
          permanent.
        </p>
      </div>
    )}
  </>
);
