// add to imports
import React from "react";
import type { Clipboard, Quest } from "./../../state/types";
import type { NpcHighlight, ObjectHighlight } from "./../../state/types";
type TargetType = "npc" | "object";

interface TargetSelectionSectionProps {
  quest: Quest | null;
  selectedStep: number;
  targetType: TargetType;
  onTargetTypeChange: (t: TargetType) => void;
  targetIndex: number;
  onTargetIndexChange: (i: number) => void;
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
  const items =
    quest?.questSteps?.[selectedStep]?.highlights?.[targetType] ?? [];
  const isNpcList = (
    arr: NpcHighlight[] | ObjectHighlight[]
  ): arr is NpcHighlight[] => targetType === "npc";
  const isObjectList = (
    arr: NpcHighlight[] | ObjectHighlight[]
  ): arr is ObjectHighlight[] => targetType === "object";
  return (
    <div className="panel-section editor-controls-grid">
      <div className="control-group">
        <label>Target Type</label>
        <select
          value={targetType}
          onChange={(e) => onTargetTypeChange(e.target.value as TargetType)}
        >
          <option value="npc">NPC</option>
          <option value="object">Object</option>
        </select>
      </div>

      <div className="control-group full-width-control">
        <label>{targetType === "npc" ? "NPCs" : "Objects"}</label>
        <ul className="target-list">
          {items.map((item: NpcHighlight | ObjectHighlight, index: number) => {
            // Narrow item type based on targetType
            const npcItem = isNpcList(items)
              ? (item as NpcHighlight)
              : undefined;
            const objItem = isObjectList(items)
              ? (item as ObjectHighlight)
              : undefined;

            // Display name
            const displayName =
              targetType === "npc"
                ? npcItem?.npcName || `NPC ${index + 1}`
                : objItem?.name || `Object ${index + 1}`;

            return (
              <li
                key={index}
                className={index === targetIndex ? "active" : ""}
                onClick={() => onTargetIndexChange(index)}
              >
                <div className="target-item-header">
                  <span>{displayName}</span>
                </div>

                {/* NPC: show single coord when selected */}
                {targetType === "npc" && index === targetIndex && npcItem && (
                  <ul className="location-sublist">
                    {(() => {
                      const loc = npcItem.npcLocation;
                      const isUnset = !loc || (loc.lat === 0 && loc.lng === 0);
                      return (
                        <li className="location-item">
                          <span className="location-coords">
                            {isUnset ? "{unset}" : `{${loc.lat}, ${loc.lng}}`}
                          </span>
                        </li>
                      );
                    })()}
                  </ul>
                )}

                {/* Object: show list of coords when selected */}
                {targetType === "object" &&
                  index === targetIndex &&
                  objItem && (
                    <ul className="location-sublist">
                      {(objItem.objectLocation ?? []).map(
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

      {/* ADD THIS CONTROL */}
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
