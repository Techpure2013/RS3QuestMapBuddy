import React, { useState, useEffect } from "react";

export interface ItemsNeededSectionProps {
  value: string;
  onChange: (v: string) => void;
}

export const ItemsNeededSection: React.FC<ItemsNeededSectionProps> = ({
  value,
  onChange,
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync with external changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    // Only process and save when user is done editing
    onChange(localValue);
  };

  return (
    <div className="panel-section">
      <div className="item-list">
        <strong>Items Needed</strong>
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          rows={3}
          placeholder="Items Needed especially for the current quest step or future beyond this step."
        />
      </div>
    </div>
  );
};

export default ItemsNeededSection;
