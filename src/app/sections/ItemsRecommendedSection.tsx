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
          <ul style={{ marginTop: 6, paddingLeft: 18 }}>
            {lines.map((s, i) => (
              <li key={`${i}-${s}`}>
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ItemsRecommendedSection;
