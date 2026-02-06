// src/app/components/WikiMerge/MergePreview.tsx
// Live preview of the merged result

import React from "react";
import { MergeStore } from "../../../state/mergeStore";
import { useMergeSelector, useMergeFocus } from "../../../state/useMergeSelector";
import type { QuestStep } from "../../../state/types";

export const MergePreview: React.FC = () => {
  const focus = useMergeFocus();
  const mergedSteps = MergeStore.derived.getMergedSteps();
  const focusedStep = mergedSteps[focus.stepIndex];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          padding: "8px 12px",
          background: "#1e293b",
          borderBottom: "1px solid #374151",
          fontSize: 12,
          fontWeight: 600,
          color: "#93c5fd",
        }}
      >
        PREVIEW (Step {focus.stepIndex + 1})
      </div>

      <div style={{ flex: 1, overflow: "auto", padding: 12 }}>
        {focusedStep ? (
          <StepPreview step={focusedStep} stepIndex={focus.stepIndex} />
        ) : (
          <div style={{ color: "#6b7280", fontStyle: "italic" }}>
            No step to preview
          </div>
        )}
      </div>

      {/* Summary at bottom */}
      <div
        style={{
          padding: "8px 12px",
          background: "#1e293b",
          borderTop: "1px solid #374151",
          fontSize: 11,
          color: "#6b7280",
        }}
      >
        {mergedSteps.length} steps in merged result
      </div>
    </div>
  );
};

interface StepPreviewProps {
  step: QuestStep;
  stepIndex: number;
}

const StepPreview: React.FC<StepPreviewProps> = ({ step, stepIndex }) => {
  const sectionStyle: React.CSSProperties = {
    marginBottom: 12,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 4,
  };

  const contentStyle: React.CSSProperties = {
    fontSize: 13,
    color: "#e5e7eb",
    background: "#1e293b",
    padding: "8px 10px",
    borderRadius: 4,
    border: "1px solid #374151",
  };

  return (
    <div>
      {/* Step Description */}
      <div style={sectionStyle}>
        <div style={labelStyle}>Step Description</div>
        <div style={contentStyle}>
          {step.stepDescription || (
            <span style={{ color: "#6b7280", fontStyle: "italic" }}>(empty)</span>
          )}
        </div>
      </div>

      {/* Items Needed */}
      {step.itemsNeeded && step.itemsNeeded.length > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Items Needed ({step.itemsNeeded.length})</div>
          <div style={contentStyle}>
            <ItemList items={step.itemsNeeded} color="#22c55e" />
          </div>
        </div>
      )}

      {/* Items Recommended */}
      {step.itemsRecommended && step.itemsRecommended.length > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Items Recommended ({step.itemsRecommended.length})</div>
          <div style={contentStyle}>
            <ItemList items={step.itemsRecommended} color="#f59e0b" />
          </div>
        </div>
      )}

      {/* Dialog Options */}
      {step.dialogOptions && step.dialogOptions.length > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Dialog Options ({step.dialogOptions.length})</div>
          <div style={contentStyle}>
            <ItemList items={step.dialogOptions} color="#8b5cf6" />
          </div>
        </div>
      )}

      {/* Additional Info */}
      {step.additionalStepInformation && step.additionalStepInformation.length > 0 && (
        <div style={sectionStyle}>
          <div style={labelStyle}>Additional Info ({step.additionalStepInformation.length})</div>
          <div style={contentStyle}>
            <ItemList items={step.additionalStepInformation} color="#6b7280" />
          </div>
        </div>
      )}

      {/* Preserved fields notice */}
      <div style={{ ...sectionStyle, marginTop: 16 }}>
        <div style={{ fontSize: 10, color: "#4b5563", fontStyle: "italic" }}>
          ℹ️ Highlights, floor, and path data are preserved from local
        </div>
      </div>
    </div>
  );
};

const ItemList: React.FC<{ items: string[]; color: string }> = ({ items, color }) => (
  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
    {items.map((item, i) => (
      <span
        key={i}
        style={{
          padding: "3px 8px",
          background: `${color}20`,
          border: `1px solid ${color}40`,
          borderRadius: 4,
          fontSize: 12,
          color: color,
        }}
      >
        {item}
      </span>
    ))}
  </div>
);

export default MergePreview;
