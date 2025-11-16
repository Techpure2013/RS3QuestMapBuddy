import React, { useEffect, useRef, useState } from "react";
import { handleEnterAsNewline } from "./textAreaHelper";

export interface AdditionalInfoSectionProps {
  value: string;
  onChange: (v: string) => void;
}

export const AdditionalInfoSection: React.FC<AdditionalInfoSectionProps> = ({
  value,
  onChange,
}) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    onChange(localValue);
  };

  return (
    <div className="panel-section">
      <div className="item-list full-width">
        <strong>Additional Info</strong>
        <textarea
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          rows={2}
          placeholder="Additional Information about the quest. A Catch ALL."
        />
      </div>
    </div>
  );
};

export default AdditionalInfoSection;
