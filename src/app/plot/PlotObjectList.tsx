// src/app/plot/PlotObjectList.tsx
import React from "react";
import type { ObjectHighlight } from "../../state/types";

interface PlotObjectListProps {
  objects: ObjectHighlight[];
  selectedIndex: number;
  isActive: boolean;
  onSelect: (index: number) => void;
  onDeletePoint: (objIndex: number, locIndex: number) => void;
  onFloorChange?: (index: number, floor: number) => void;
}

export const PlotObjectList: React.FC<PlotObjectListProps> = ({
  objects,
  selectedIndex,
  isActive,
  onSelect,
  onDeletePoint,
  onFloorChange,
}) => {
  if (objects.length === 0) {
    return <div className="qp-empty">No Objects yet</div>;
  }

  return (
    <ul className="plot-target-list">
      {objects.map((obj, i) => (
        <PlotObjectItem
          key={`obj-${i}`}
          object={obj}
          index={i}
          isActive={isActive && i === selectedIndex}
          onSelect={() => onSelect(i)}
          onDeletePoint={(locIdx) => onDeletePoint(i, locIdx)}
          onFloorChange={(floor) => onFloorChange?.(i, floor)}
        />
      ))}
    </ul>
  );
};

interface PlotObjectItemProps {
  object: ObjectHighlight;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDeletePoint: (locIndex: number) => void;
  onFloorChange: (floor: number) => void;
}

const PlotObjectItem: React.FC<PlotObjectItemProps> = ({
  object,
  index,
  isActive,
  onSelect,
  onDeletePoint,
  onFloorChange,
}) => {
  const pts = object.objectLocation ?? [];

  return (
    <li
      className={`plot-target-item ${isActive ? "active" : ""}`}
      onClick={onSelect}
    >
      <div className="plot-target-header">
        {isActive && <span className="plot-target-dot">•</span>}
        <span className="plot-target-name">
          {object.name || `Object ${index + 1}`}
        </span>
        <select
          value={object.floor ?? 0}
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
        {pts.length === 0
          ? "No points"
          : `${pts.length} point${pts.length === 1 ? "" : "s"}`}
      </div>

      {isActive && pts.length > 0 && (
        <div
          className="plot-object-points"
          onClick={(e) => e.stopPropagation()}
        >
          {pts.map((p, idx) => (
            <div key={idx} className="plot-object-point-row">
              <div className="plot-object-point-info">
                <span className="plot-object-point-coords">
                  {`{${p.lat}, ${p.lng}}`}
                </span>
                {p.color && (
                  <span className="plot-object-point-meta">
                    color: {p.color}
                  </span>
                )}
                {p.numberLabel && (
                  <span className="plot-object-point-meta">
                    Object Label: {p.numberLabel}
                  </span>
                )}
              </div>
              <button
                className="button--delete plot-action-btn"
                onClick={() => onDeletePoint(idx)}
                title="Delete this point"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </li>
  );
};

export default PlotObjectList;
