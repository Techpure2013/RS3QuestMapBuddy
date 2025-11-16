import React, { useEffect, useRef, useState } from "react";
import { handleEnterAsNewline } from "./textAreaHelper";

export interface ItemsRecommendedSectionProps {
  value: string;
  onChange: (v: string) => void;
}

export const ItemsRecommendedSection: React.FC<
  ItemsRecommendedSectionProps
> = ({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    onChange(localValue);
  };

  return (
    <div className="panel-section">
      <div className="item-list">
        <strong>Items Recommended</strong>
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          rows={3}
          placeholder="Items that could be helpful at or beyond this step."
        />
      </div>
    </div>
  );
};

export default ItemsRecommendedSection;
