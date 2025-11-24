// src/app/admin/PlotSubmissionItem.tsx
import { PlotSubmissionRow } from "api/plotSubmissionsAdmin";
import React from "react";

interface PlotSubmissionItemProps {
  item: PlotSubmissionRow;
  isSelected: boolean;
  onSelect: () => void;
}

export const PlotSubmissionItem: React.FC<PlotSubmissionItemProps> = React.memo(
  ({ item, isSelected, onSelect }) => {
    const npcCount = item.proposedhighlights.npc?.length ?? 0;
    const objCount = item.proposedhighlights.object?.length ?? 0;
    const totalPoints =
      npcCount +
      (item.proposedhighlights.object?.reduce(
        (sum, obj) => sum + (obj.objectLocation?.length ?? 0),
        0
      ) ?? 0);

    return (
      <li
        data-id={item.id}
        onClick={onSelect}
        className={`plot-submission-item ${isSelected ? "selected" : ""}`}
        role="option"
        aria-selected={isSelected}
      >
        <div className="submission-header">
          <div className="submission-quest-name">{item.quest_name}</div>
          <div className="submission-badge">
            {totalPoints} point{totalPoints !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="submission-meta">
          <span className="submission-step">Step {item.step_number}</span>
          <span className="submission-divider">•</span>
          <span className="submission-floor">Floor {item.floor}</span>
          <span className="submission-divider">•</span>
          <span className="submission-player">{item.playername}</span>
        </div>

        <div className="submission-details">
          <span className="submission-counts">
            {npcCount > 0 && `${npcCount} NPC${npcCount !== 1 ? "s" : ""}`}
            {npcCount > 0 && objCount > 0 && " • "}
            {objCount > 0 && `${objCount} Object${objCount !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="submission-timestamp">
          {new Date(item.createdat).toLocaleString()}
        </div>
      </li>
    );
  }
);

PlotSubmissionItem.displayName = "PlotSubmissionItem";
