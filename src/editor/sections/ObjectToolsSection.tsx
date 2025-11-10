import React from "react";
export const ObjectToolsSection: React.FC<{
  selectedObjectColor: string;
  onSelectedObjectColorChange: (c: string) => void;
  objectNumberLabel: string;
  onObjectNumberLabelChange: (v: string) => void;
  onAddObject: () => void;
  onDeleteObject: () => void;
}> = ({
  selectedObjectColor,
  onSelectedObjectColorChange,
  objectNumberLabel,
  onObjectNumberLabelChange,
  onAddObject,
  onDeleteObject,
}) => (
  <div className="panel-section editor-controls-grid">
    <div className="control-group">
      <label>Object Color</label>
      <label className="color-picker-label">
        <div
          className="color-picker-swatch"
          style={{ backgroundColor: selectedObjectColor }}
        />
        <input
          type="color"
          value={selectedObjectColor}
          onChange={(e) => onSelectedObjectColorChange(e.target.value)}
          className="color-input-hidden"
        />
      </label>
    </div>

    <div className="control-group">
      <label>Object Number</label>
      <input
        type="text"
        placeholder="Optional"
        value={objectNumberLabel}
        onChange={(e) => onObjectNumberLabelChange(e.target.value)}
      />
    </div>

    <div className="control-group full-width">
      <div className="button-group">
        <button onClick={onAddObject} className="button--add">
          Add New Object
        </button>
        <button onClick={onDeleteObject} className="button--delete">
          Delete Object
        </button>
      </div>
    </div>
  </div>
);
