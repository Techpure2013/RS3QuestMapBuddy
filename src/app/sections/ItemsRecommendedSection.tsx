import React, { useEffect, useRef, useState } from "react";
import { autoGrow, EditorStore } from "./../../state/editorStore";
import { RichText } from "../../utils/RichText";
import { FormattingToolbar } from "../components/FormattingToolbar";
import { useEditorSelector } from "../../state/useEditorSelector";

export interface ItemsRecommendedSectionProps {
  value: string;
  onChange: (v: string) => void;
}

export const ItemsRecommendedSection: React.FC<
  ItemsRecommendedSectionProps
> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const quest = useEditorSelector((s) => s.quest);

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
        <strong>Items Recommended</strong>
        <FormattingToolbar
          textareaRef={taRef}
          value={localValue}
          onChange={setLocalValue}
          defaultCollapsed={true}
        />
        <textarea
          ref={taRef}
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          rows={1}
          placeholder="Items that could be helpful at or beyond this step."
          style={{ resize: "none", overflow: "hidden" }}
        />
        {lines.length > 0 && (
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
            {lines.map((s, i) => (
              <label key={`${i}-${s}`} style={{ display: "flex", alignItems: "flex-start", gap: 6, cursor: "default" }}>
                <input type="checkbox" style={{ marginTop: 3, accentColor: "#22c55e" }} />
                <RichText
                  onStepClick={(step) => {
                    const stepIndex = step - 1;
                    if (stepIndex >= 0 && quest?.questSteps && stepIndex < quest.questSteps.length) {
                      EditorStore.autoSelectFirstValidTargetForStep(stepIndex);
                    }
                  }}
                >
                  {s}
                </RichText>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsRecommendedSection;
