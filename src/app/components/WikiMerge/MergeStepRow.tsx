// src/app/components/WikiMerge/MergeStepRow.tsx
// Single step comparison row in the merge UI

import React, { useState } from "react";
import type { StepDiff, StepFieldDiffs, TextFieldDiff, ArrayFieldDiff } from "../../../types/merge";
import { MergeStore } from "../../../state/mergeStore";
import { TextDiff } from "./TextDiff";
import { ArrayDiff, ArrayDiffSummary } from "./ArrayDiff";

interface MergeStepRowProps {
  diff: StepDiff;
  isFocused: boolean;
  onFocus: () => void;
}

export const MergeStepRow: React.FC<MergeStepRowProps> = ({ diff, isFocused, onFocus }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Calculate step status
  const allFields = Object.values(diff.fields);
  const pendingCount = allFields.filter((f) => f.status !== "same" && f.accepted === null).length;
  const acceptedCount = allFields.filter((f) => f.accepted === true).length;
  const rejectedCount = allFields.filter((f) => f.accepted === false).length;
  const changedCount = allFields.filter((f) => f.status !== "same").length;

  // Determine step label
  let stepLabel = "";
  if (diff.isNewFromWiki) {
    stepLabel = `NEW: Wiki Step ${diff.wikiStepIndex + 1}`;
  } else if (diff.isLocalOnly) {
    stepLabel = `LOCAL ONLY: Step ${diff.localStepIndex + 1}`;
  } else {
    stepLabel = `Step ${diff.localStepIndex + 1}`;
    if (diff.wikiStepIndex !== diff.localStepIndex) {
      stepLabel += ` ← Wiki ${diff.wikiStepIndex + 1}`;
    }
  }

  const headerBg = diff.isNewFromWiki
    ? "rgba(34, 197, 94, 0.1)"
    : diff.isLocalOnly
      ? "rgba(239, 68, 68, 0.1)"
      : isFocused
        ? "rgba(59, 130, 246, 0.15)"
        : "#1e293b";

  // Get step description preview for collapsed state
  const getDescriptionPreview = () => {
    const desc = diff.fields.stepDescription;
    if (!desc || desc.status === "same") return null;

    // Get the wiki value (the new/changed value)
    const wikiValue = (desc as TextFieldDiff).segments
      ?.map((seg) => seg.text)
      .join("")
      .trim();

    if (!wikiValue) return null;

    // Truncate to ~80 chars
    return wikiValue.length > 80 ? wikiValue.slice(0, 77) + "..." : wikiValue;
  };

  const descPreview = getDescriptionPreview();

  return (
    <div
      style={{
        marginBottom: 8,
        border: isFocused ? "1px solid #3b82f6" : "1px solid #374151",
        borderRadius: 6,
        overflow: "hidden",
        background: "#111827",
      }}
      onClick={onFocus}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "8px 12px",
          background: headerBg,
          cursor: "pointer",
          gap: 8,
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span style={{ fontSize: 12, color: "#6b7280" }}>{isExpanded ? "▼" : "▶"}</span>
        <span style={{ flex: 1, fontWeight: 500, fontSize: 13, color: "#e5e7eb" }}>
          {stepLabel}
        </span>

        {/* Show description preview when collapsed and no changes */}
        {!isExpanded && changedCount === 0 && descPreview && (
          <span style={{ fontSize: 11, color: "#9ca3af", fontStyle: "italic", marginRight: 8 }}>
            {descPreview}
          </span>
        )}

        {/* Status badges */}
        {changedCount === 0 ? (
          <span style={{ fontSize: 11, color: "#6b7280" }}>No changes</span>
        ) : (
          <div style={{ display: "flex", gap: 4 }}>
            {pendingCount > 0 && (
              <span style={badgeStyle("#f59e0b")}>{pendingCount} pending</span>
            )}
            {acceptedCount > 0 && (
              <span style={badgeStyle("#22c55e")}>{acceptedCount} accepted</span>
            )}
            {rejectedCount > 0 && (
              <span style={badgeStyle("#ef4444")}>{rejectedCount} rejected</span>
            )}
          </div>
        )}

        {/* Alignment score */}
        {diff.alignmentScore > 0 && diff.alignmentScore < 1 && (
          <span
            style={{
              fontSize: 10,
              color: "#6b7280",
              padding: "2px 6px",
              background: "#1f2937",
              borderRadius: 4,
            }}
            title="Text similarity score"
          >
            {Math.round(diff.alignmentScore * 100)}% match
          </span>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div style={{ padding: 12 }}>
          {/* Step Description */}
          <FieldRow
            label="Description"
            field={diff.fields.stepDescription}
            stepIndex={diff.diffIndex}
            fieldName="stepDescription"
            isText
          />

          {/* Items Needed */}
          <FieldRow
            label="Items Needed"
            field={diff.fields.itemsNeeded}
            stepIndex={diff.diffIndex}
            fieldName="itemsNeeded"
          />

          {/* Items Recommended */}
          <FieldRow
            label="Items Recommended"
            field={diff.fields.itemsRecommended}
            stepIndex={diff.diffIndex}
            fieldName="itemsRecommended"
          />

          {/* Dialog Options */}
          <FieldRow
            label="Dialog Options"
            field={diff.fields.dialogOptions}
            stepIndex={diff.diffIndex}
            fieldName="dialogOptions"
          />

          {/* Additional Info */}
          <FieldRow
            label="Additional Info"
            field={diff.fields.additionalStepInformation}
            stepIndex={diff.diffIndex}
            fieldName="additionalStepInformation"
          />
        </div>
      )}
    </div>
  );
};

interface FieldRowProps {
  label: string;
  field: TextFieldDiff | ArrayFieldDiff;
  stepIndex: number;
  fieldName: keyof StepFieldDiffs;
  isText?: boolean;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, field, stepIndex, fieldName, isText }) => {
  // Skip if no changes
  if (field.status === "same") return null;

  const buttonBase: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: 11,
    border: "none",
    borderRadius: 3,
    cursor: "pointer",
  };

  const acceptBtn: React.CSSProperties = {
    ...buttonBase,
    background: field.accepted === true ? "#22c55e" : "#1f4a2e",
    color: field.accepted === true ? "#fff" : "#86efac",
  };

  const rejectBtn: React.CSSProperties = {
    ...buttonBase,
    background: field.accepted === false ? "#ef4444" : "#4a1f1f",
    color: field.accepted === false ? "#fff" : "#fca5a5",
  };

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Field header */}
      <div style={{ display: "flex", alignItems: "center", marginBottom: 6, gap: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", minWidth: 120, flexShrink: 0 }}>
          {label}
        </span>
        <StatusBadge status={field.status} />
        <div style={{ flex: 1 }} />
        <button style={acceptBtn} onClick={() => MergeStore.acceptField(stepIndex, fieldName)}>
          ✓ Accept Wiki
        </button>
        <button style={rejectBtn} onClick={() => MergeStore.rejectField(stepIndex, fieldName)}>
          ✕ Keep Local
        </button>
      </div>

      {/* Field content */}
      <div style={{ background: "#1e293b", borderRadius: 4, padding: 10, border: "1px solid #374151" }}>
        {isText ? (
          <TextDiff segments={(field as TextFieldDiff).segments} />
        ) : (
          <>
            <ArrayDiffSummary items={(field as ArrayFieldDiff).items} />
            <div style={{ marginTop: 8 }}>
              <ArrayDiff
                items={(field as ArrayFieldDiff).items}
                onToggleItem={(i) => MergeStore.toggleArrayItem(stepIndex, fieldName, i)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors: Record<string, { bg: string; text: string }> = {
    added: { bg: "rgba(34, 197, 94, 0.2)", text: "#22c55e" },
    removed: { bg: "rgba(239, 68, 68, 0.2)", text: "#ef4444" },
    modified: { bg: "rgba(245, 158, 11, 0.2)", text: "#f59e0b" },
    same: { bg: "rgba(107, 114, 128, 0.2)", text: "#6b7280" },
  };

  const { bg, text } = colors[status] || colors.same;

  return (
    <span
      style={{
        fontSize: 9,
        fontWeight: 600,
        padding: "2px 6px",
        borderRadius: 3,
        background: bg,
        color: text,
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
};

const badgeStyle = (color: string): React.CSSProperties => ({
  fontSize: 10,
  padding: "2px 6px",
  borderRadius: 3,
  background: `${color}20`,
  color: color,
});

export default MergeStepRow;
