import React, { useState, useEffect, useRef } from "react";
import { autoGrow } from "./../../state/editorStore";

export interface ItemsNeededSectionProps {
  value: string;
  onChange: (v: string) => void;
}

export const ItemsNeededSection: React.FC<ItemsNeededSectionProps> = ({
  value,
  onChange,
}) => {
  const [localValue, setLocalValue] = useState(value);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLocalValue(value);
    if (taRef.current) autoGrow(taRef.current);
  }, [value]);

  useEffect(() => {
    if (taRef.current) autoGrow(taRef.current);
  }, [localValue]);

  const handleBlur = () => onChange(localValue);

  const lines = localValue
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="panel-section">
      <div className="item-list">
        <strong>Items Needed</strong>
        <textarea
          ref={taRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          rows={1}
          placeholder="Items Needed especially for the current quest step or future beyond this step."
          style={{ resize: "none", overflow: "hidden" }}
        />
        {lines.length > 0 && (
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {lines.map((s, i) => (
              <li key={`${i}-${s}`}>{s}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ItemsNeededSection;
