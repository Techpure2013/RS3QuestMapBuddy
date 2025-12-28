// src/app/sections/panel.tsx
import React, { useState } from "react";
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";

export interface PanelProps {
  title: string;
  defaultOpen?: boolean;
  rightAdornment?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean; // New prop for even more compact mode
}

export const Panel: React.FC<PanelProps> = ({
  title,
  defaultOpen = false,
  rightAdornment,
  children,
  compact = false,
}) => {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  return (
    <div
      style={{
        margin: compact ? "4px 6px" : "6px 8px",
        borderRadius: 6,
        border: "1px solid #374151",
        background: "#111827",
      }}
    >
      {/* Header */}
      <div
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          padding: compact ? "6px 8px" : "8px 10px",
          background: open ? "#1f2937" : "#111827",
          cursor: "pointer",
          userSelect: "none",
          transition: "all 0.15s ease",
          borderBottom: open ? "1px solid #374151" : "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#1f2937";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = open ? "#1f2937" : "#111827";
        }}
      >
        {/* Expand/Collapse Icon */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginRight: 6,
            color: "#9ca3af",
          }}
        >
          {open ? (
            <IconChevronDown size={16} />
          ) : (
            <IconChevronRight size={16} />
          )}
        </div>

        {/* Title */}
        <strong
          style={{
            color: "#e5e7eb",
            flex: 1,
            fontSize: compact ? "0.8125rem" : "0.875rem",
            fontWeight: 600,
          }}
        >
          {title}
        </strong>

        {/* Right adornment */}
        {rightAdornment}
      </div>

      {/* Content */}
      {open && (
        <div
          style={{
            padding: compact ? "6px 8px" : "8px 10px",
            background: "#0b1220",
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default Panel;
