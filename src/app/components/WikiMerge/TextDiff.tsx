// src/app/components/WikiMerge/TextDiff.tsx
// Inline text diff display component

import React from "react";
import type { TextSegment } from "../../../types/merge";

interface TextDiffProps {
  segments: TextSegment[];
  showFullText?: boolean;
}

export const TextDiff: React.FC<TextDiffProps> = ({ segments, showFullText = false }) => {
  if (segments.length === 0) {
    return <span style={{ color: "#6b7280", fontStyle: "italic" }}>(no changes)</span>;
  }

  return (
    <span style={{ lineHeight: 1.6 }}>
      {segments.map((segment, i) => {
        const style = getSegmentStyle(segment.type);
        return (
          <span key={i} style={style}>
            {segment.text}
          </span>
        );
      })}
    </span>
  );
};

function getSegmentStyle(type: TextSegment["type"]): React.CSSProperties {
  switch (type) {
    case "added":
      return {
        backgroundColor: "rgba(34, 197, 94, 0.3)",
        color: "#86efac",
        padding: "1px 2px",
        borderRadius: 2,
      };
    case "removed":
      return {
        backgroundColor: "rgba(239, 68, 68, 0.3)",
        color: "#fca5a5",
        textDecoration: "line-through",
        padding: "1px 2px",
        borderRadius: 2,
      };
    case "same":
    default:
      return {
        color: "#e5e7eb",
      };
  }
}

/** Simple side-by-side text comparison */
export const TextCompare: React.FC<{
  wikiValue: string;
  localValue: string;
  accepted: boolean | null;
}> = ({ wikiValue, localValue, accepted }) => {
  const wikiStyle: React.CSSProperties = {
    padding: "8px 10px",
    background: accepted === true ? "rgba(34, 197, 94, 0.1)" : "#1e293b",
    border: accepted === true ? "1px solid #22c55e" : "1px solid #374151",
    borderRadius: 4,
    fontSize: 13,
    color: "#e5e7eb",
    flex: 1,
    minHeight: 40,
  };

  const localStyle: React.CSSProperties = {
    ...wikiStyle,
    background: accepted === false ? "rgba(59, 130, 246, 0.1)" : "#1e293b",
    border: accepted === false ? "1px solid #3b82f6" : "1px solid #374151",
  };

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <div style={wikiStyle}>
        <div style={{ fontSize: 10, color: "#22c55e", marginBottom: 4 }}>WIKI</div>
        {wikiValue || <span style={{ color: "#6b7280", fontStyle: "italic" }}>(empty)</span>}
      </div>
      <div style={localStyle}>
        <div style={{ fontSize: 10, color: "#3b82f6", marginBottom: 4 }}>LOCAL</div>
        {localValue || <span style={{ color: "#6b7280", fontStyle: "italic" }}>(empty)</span>}
      </div>
    </div>
  );
};

export default TextDiff;
