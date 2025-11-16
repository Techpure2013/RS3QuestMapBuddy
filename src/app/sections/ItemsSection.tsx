// src/editor/panel/sections/ItemsSection.tsx
import React from "react";

interface ItemsSectionProps {
  itemsNeeded: string;
  onItemsNeededChange: (v: string) => void;
  itemsRecommended: string;
  onItemsRecommendedChange: (v: string) => void;
  additionalInfo: string;
  onAdditionalInfoChange: (v: string) => void;
  onEnterAsNewline: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    currentValue: string,
    onChange: (v: string) => void
  ) => void;
}

export const ItemsSection: React.FC<ItemsSectionProps> = ({
  itemsNeeded,
  onItemsNeededChange,
  itemsRecommended,
  onItemsRecommendedChange,
  additionalInfo,
  onAdditionalInfoChange,
  onEnterAsNewline,
}) => {
  return (
    <div className="panel-section info-grid">
      <div className="item-list">
        <strong>Items Needed</strong>
        <textarea
          value={itemsNeeded}
          onChange={(e) => onItemsNeededChange(e.target.value)}
          onKeyDown={(e) =>
            onEnterAsNewline(e, itemsNeeded, onItemsNeededChange)
          }
          rows={3}
          placeholder="One item per line..."
        />
      </div>
      <div className="item-list">
        <strong>Items Recommended</strong>
        <textarea
          value={itemsRecommended}
          onChange={(e) => onItemsRecommendedChange(e.target.value)}
          onKeyDown={(e) =>
            onEnterAsNewline(e, itemsRecommended, onItemsRecommendedChange)
          }
          rows={3}
          placeholder="One item per line..."
        />
      </div>
      <div className="item-list full-width">
        <strong>Additional Info</strong>
        <textarea
          value={additionalInfo}
          onChange={(e) => onAdditionalInfoChange(e.target.value)}
          rows={2}
          placeholder="One line of info..."
        />
      </div>
    </div>
  );
};
