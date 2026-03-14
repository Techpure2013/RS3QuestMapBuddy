// src/app/plot/PlotNpcList.tsx
import React from "react";
import type { NpcHighlight, NpcLocation } from "../../state/types";

interface PlotNpcListProps {
  npcs: NpcHighlight[];
  selectedIndex: number;
  isActive: boolean;
  onSelect: (index: number) => void;
  onClearPoint: (index: number) => void;
  onFloorChange: (index: number, floor: number) => void;
}

export const PlotNpcList: React.FC<PlotNpcListProps> = ({
  npcs,
  selectedIndex,
  isActive,
  onSelect,
  onClearPoint,
  onFloorChange,
}) => {
  if (npcs.length === 0) {
    return <div className="qp-empty">No NPCs yet</div>;
  }

  return (
    <ul className="plot-target-list">
      {npcs.map((npc, i) => (
        <PlotNpcItem
          key={`npc-${i}`}
          npc={npc}
          index={i}
          isActive={isActive && i === selectedIndex}
          onSelect={() => onSelect(i)}
          onClearPoint={() => onClearPoint(i)}
          onFloorChange={(floor) => onFloorChange(i, floor)}
        />
      ))}
    </ul>
  );
};

interface PlotNpcItemProps {
  npc: NpcHighlight;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onClearPoint: () => void;
  onFloorChange: (floor: number) => void;
}

const PlotNpcItem: React.FC<PlotNpcItemProps> = ({
  npc,
  index,
  isActive,
  onSelect,
  onClearPoint,
  onFloorChange,
}) => {
  const loc = npc.npcLocation as NpcLocation | undefined;
  const hasLoc = !!loc && Number.isFinite(loc.lat) && Number.isFinite(loc.lng);

  return (
    <li
      className={`plot-target-item ${isActive ? "active" : ""}`}
      onClick={onSelect}
    >
      <div className="plot-target-header">
        {isActive && <span className="plot-target-dot">•</span>}
        <span className="plot-target-name">
          {npc.npcName || `NPC ${index + 1}`}
        </span>
        <select
          value={npc.floor ?? 0}
          onChange={(e) => { e.stopPropagation(); onFloorChange(Number(e.target.value)); }}
          onClick={(e) => e.stopPropagation()}
          style={{ marginLeft: "auto", width: 52, fontSize: "0.7rem", background: "#1f2937", color: "#e5e7eb", border: "1px solid #4b5563", borderRadius: 3, padding: "1px 2px" }}
          title="Floor"
        >
          <option value={0}>F0</option>
          <option value={1}>F1</option>
          <option value={2}>F2</option>
          <option value={3}>F3</option>
        </select>
      </div>

      <div className="plot-target-coords">
        {hasLoc ? `{${loc.lat}, ${loc.lng}}` : "{unset}"}
      </div>

      {isActive && hasLoc && (
        <div
          className="plot-target-actions"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="button--delete plot-action-btn"
            onClick={onClearPoint}
            title="Clear NPC point"
          >
            Clear point
          </button>
        </div>
      )}
    </li>
  );
};

export default PlotNpcList;
