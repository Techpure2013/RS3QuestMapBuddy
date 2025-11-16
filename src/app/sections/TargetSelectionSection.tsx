import React from "react";
import type { Clipboard, Quest } from "../../state/types";
import type { NpcHighlight, ObjectHighlight } from "../../state/types";

interface TargetSelectionSectionProps {
  quest: Quest | null;
  selectedStep: number;
  targetType: "npc" | "object";
  onTargetTypeChange: (t: "npc" | "object") => void;
  targetIndex: number;
  onTargetIndexChange: (i: number, type: "npc" | "object") => void; // CHANGED: Added type parameter
  clipboard: Clipboard;
  onCopyList: () => void;
  onPasteList: () => void;
  onCopySelected: () => void;
  onPasteSelected: () => void;
  onDeleteObjectLocation: (locationIndex: number) => void;
  targetNameValue: string;
  onTargetNameChange: (name: string) => void;
}

export const TargetSelectionSection: React.FC<TargetSelectionSectionProps> = ({
  quest,
  selectedStep,
  targetType,
  onTargetTypeChange,
  targetIndex,
  onTargetIndexChange,
  clipboard,
  onCopyList,
  onPasteList,
  onCopySelected,
  onPasteSelected,
  onDeleteObjectLocation,
  targetNameValue,
  onTargetNameChange,
}) => {
  const step = quest?.questSteps?.[selectedStep];
  const npcItems = step?.highlights?.npc ?? [];
  const objectItems = step?.highlights?.object ?? [];

  return (
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
        <label>Targets</label>

        {/* NPCs Section */}
        {npcItems.length > 0 && (
          <div className="target-section">
            <div className="target-section-header">NPCs</div>
            <ul className="target-list">
              {npcItems.map((npc: NpcHighlight, index: number) => {
                const isActive = targetType === "npc" && index === targetIndex;
                const displayName = npc.npcName || `NPC ${index + 1}`;

                return (
                  <li
                    key={`npc-${index}`}
                    className={isActive ? "active" : ""}
                    onClick={() => onTargetIndexChange(index, "npc")}
                  >
                    <div className="target-item-header">
                      <span>{displayName}</span>
                    </div>

                    {isActive && (
                      <ul className="location-sublist">
                        {(() => {
                          const loc = npc.npcLocation;
                          const isUnset =
                            !loc || (loc.lat === 0 && loc.lng === 0);
                          return (
                            <li className="location-item">
                              <span className="location-coords">
                                {isUnset
                                  ? "{unset}"
                                  : `{${loc.lat}, ${loc.lng}}`}
                              </span>
                            </li>
                          );
                        })()}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Objects Section */}
        {objectItems.length > 0 && (
          <div className="target-section">
            <div className="target-section-header">Objects</div>
            <ul className="target-list">
              {objectItems.map((obj: ObjectHighlight, index: number) => {
                const isActive =
                  targetType === "object" && index === targetIndex;
                const displayName = obj.name || `Object ${index + 1}`;

                return (
                  <li
                    key={`object-${index}`}
                    className={isActive ? "active" : ""}
                    onClick={() => onTargetIndexChange(index, "object")}
                  >
                    <div className="target-item-header">
                      <span>{displayName}</span>
                    </div>

                    {isActive && (
                      <ul className="location-sublist">
                        {(obj.objectLocation ?? []).map(
                          (
                            loc: { lat: number; lng: number },
                            locIndex: number
                          ) => (
                            <li key={locIndex} className="location-item">
                              <span className="location-coords">{`{${loc.lat}, ${loc.lng}}`}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteObjectLocation(locIndex);
                                }}
                                className="location-delete-btn"
                                title="Delete this location"
                              >
                                &times;
                              </button>
                            </li>
                          )
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <div className="control-group full-width-control">
        <div className="button-group">
          <button onClick={onCopyList}>Copy List</button>
          <button
            onClick={onPasteList}
            disabled={!clipboard.type.endsWith("-list")}
            title={
              !clipboard.type.endsWith("-list")
                ? "Clipboard does not contain a list"
                : "Replace current list with clipboard"
            }
          >
            Paste List
          </button>
        </div>
      </div>

      <div className="control-group full-width-control">
        <div className="button-group">
          <button onClick={onCopySelected}>Copy Selected</button>
          <button
            onClick={onPasteSelected}
            disabled={
              clipboard.type === "none" ||
              clipboard.type.endsWith("-list") ||
              clipboard.type !== targetType
            }
            title={
              clipboard.type === "none"
                ? "Clipboard is empty"
                : clipboard.type !== targetType
                ? `Cannot paste ${clipboard.type} over ${targetType}`
                : "Paste from clipboard"
            }
          >
            Paste Over Selected
          </button>
        </div>
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
  );
};
