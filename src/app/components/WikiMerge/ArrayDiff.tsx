// src/app/components/WikiMerge/ArrayDiff.tsx
// Array diff display with checkboxes

import React from "react";
import type { ArrayItemDiff } from "../../../types/merge";

interface ArrayDiffProps {
  items: ArrayItemDiff[];
  onToggleItem: (index: number) => void;
  disabled?: boolean;
}

export const ArrayDiff: React.FC<ArrayDiffProps> = ({ items, onToggleItem, disabled = false }) => {
  if (items.length === 0) {
    return <div style={{ color: "#6b7280", fontStyle: "italic", fontSize: 12 }}>(no items)</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((item, index) => (
        <ArrayDiffItem
          key={`${item.value}-${index}`}
          item={item}
          onToggle={() => onToggleItem(index)}
          disabled={disabled}
        />
      ))}
    </div>
  );
};

interface ArrayDiffItemProps {
  item: ArrayItemDiff;
  onToggle: () => void;
  disabled?: boolean;
}

const ArrayDiffItem: React.FC<ArrayDiffItemProps> = ({ item, onToggle, disabled }) => {
  const sourceColors = {
    wiki: { bg: "rgba(34, 197, 94, 0.15)", border: "#22c55e", text: "#86efac", label: "NEW" },
    local: { bg: "rgba(239, 68, 68, 0.15)", border: "#ef4444", text: "#fca5a5", label: "LOCAL" },
    both: { bg: "rgba(107, 114, 128, 0.15)", border: "#6b7280", text: "#e5e7eb", label: "BOTH" },
  };

  const colors = sourceColors[item.source];

  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 10px",
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : item.selected ? 1 : 0.5,
        transition: "opacity 0.15s",
      }}
    >
      <input
        type="checkbox"
        checked={item.selected}
        onChange={onToggle}
        disabled={disabled}
        style={{
          width: 14,
          height: 14,
          accentColor: colors.border,
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      />
      <span style={{ flex: 1, fontSize: 13, color: colors.text }}>{item.value}</span>
      <span
        style={{
          fontSize: 9,
          fontWeight: 600,
          color: colors.border,
          textTransform: "uppercase",
          padding: "2px 4px",
          background: "rgba(0,0,0,0.2)",
          borderRadius: 2,
        }}
      >
        {colors.label}
      </span>
    </label>
  );
};

/** Summary of array changes */
export const ArrayDiffSummary: React.FC<{ items: ArrayItemDiff[] }> = ({ items }) => {
  const counts = items.reduce(
    (acc, item) => {
      acc[item.source]++;
      if (item.selected) acc.selected++;
      return acc;
    },
    { wiki: 0, local: 0, both: 0, selected: 0 }
  );

  return (
    <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
      {counts.wiki > 0 && (
        <span style={{ color: "#22c55e" }}>+{counts.wiki} new</span>
      )}
      {counts.local > 0 && (
        <span style={{ color: "#ef4444" }}>{counts.local} local-only</span>
      )}
      {counts.both > 0 && (
        <span style={{ color: "#6b7280" }}>{counts.both} same</span>
      )}
      <span style={{ color: "#9ca3af" }}>({counts.selected} selected)</span>
    </div>
  );
};

export default ArrayDiff;
