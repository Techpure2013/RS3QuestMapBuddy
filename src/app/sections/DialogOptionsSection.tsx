import React, { useEffect, useRef, useState } from "react";
import { autoGrow } from "./../../state/editorStore";

export interface DialogOptionsSectionProps {
  value: string;
  onChange: (v: string) => void;
}

export const DialogOptionsSection: React.FC<DialogOptionsSectionProps> = ({
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
      <div className="item-list full-width">
        <strong>Dialog Options</strong>
        <textarea
          ref={taRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          rows={1}
          placeholder="Dialog options for this step (one per line)"
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

export default DialogOptionsSection;
