import React, { useMemo, useState } from "react";
import type { QuestImage } from "./../../state/types";

export interface StepOption {
  stepId: number | undefined;
  stepNumber: number; // 1-based display number
  label: string; // step description
}

export interface QuestImagesPanelProps {
  questName: string;
  previewBaseUrl?: string;

  questImageList: QuestImage[];
  onRemoveQuestImage: (index: number) => void;

  onEditImage: (index: number, patch: { stepIds?: number[] }) => void;
  stepOptions: StepOption[];

  // Optional: collapse control
  isOpen?: boolean;
  onToggle?: () => void;
}

/** Resolve stepIds to display string like "Step 3" or "Steps 2, 5" */
function resolveStepLabel(
  stepIds: number[],
  stepOptions: StepOption[]
): string {
  if (stepIds.length === 0) return "Unlinked";
  const labels: string[] = [];
  for (const sid of stepIds) {
    const opt = stepOptions.find((o) => o.stepId === sid);
    if (opt) labels.push(`Step ${opt.stepNumber}`);
    else labels.push(`Step ?${sid}`);
  }
  return labels.join(", ");
}

/** Resolve stepIds to a tooltip with descriptions */
function resolveStepTooltip(
  stepIds: number[],
  stepOptions: StepOption[]
): string {
  if (stepIds.length === 0) return "Not linked to any step";
  return stepIds
    .map((sid) => {
      const opt = stepOptions.find((o) => o.stepId === sid);
      return opt
        ? `Step ${opt.stepNumber}: ${opt.label}`
        : `Step ID ${sid} (deleted?)`;
    })
    .join("\n");
}

export const QuestImagesPanel: React.FC<QuestImagesPanelProps> = ({
  questName,
  previewBaseUrl = "https://techpure.dev/images",

  questImageList,
  onRemoveQuestImage,

  onEditImage,
  stepOptions,

  isOpen = true,
}) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const buildPreviewUrl = (img: QuestImage): string => {
    const folder = encodeURIComponent(questName.replace(/:/g, ""));
    return `${previewBaseUrl}/${folder}/${img.src}`;
  };

  const toggleExpanded = (index: number): void => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  // Only steps that have a valid stepId can be linked
  const linkableSteps = useMemo(
    () => stepOptions.filter((o) => typeof o.stepId === "number"),
    [stepOptions]
  );

  return (
    <div className="panel-section">
      <label className="EditDescriptionLabel" style={{ marginBottom: 6 }}>
        <strong>Quest Images</strong>
      </label>

      {isOpen && (
        <div className="panel-section">
          {questImageList.length === 0 ? (
            <div className="qp-empty">No images yet</div>
          ) : (
            <ul className="search-results" style={{ maxHeight: 420 }}>
              {questImageList.map((img, i) => {
                const url = buildPreviewUrl(img);
                const isRowOpen = !!expanded[i];
                const stepIds = img.stepIds ?? [];
                const stepLabel = resolveStepLabel(stepIds, stepOptions);
                const stepTooltip = resolveStepTooltip(stepIds, stepOptions);
                const uniqueKey = `${i}_${img.src}`;

                return (
                  <li key={uniqueKey} style={{ padding: 8 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                        width: "100%",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: 13,
                        }}
                        title={`${img.src} (${img.width}x${img.height})\n${stepTooltip}`}
                      >
                        <span
                          style={{
                            color: stepIds.length > 0 ? "#93c5fd" : "#f87171",
                            fontWeight: 500,
                            marginRight: 6,
                          }}
                        >
                          {stepLabel}
                        </span>
                        {img.src}
                      </span>

                      <button
                        onClick={() => toggleExpanded(i)}
                        title={isRowOpen ? "Hide preview" : "Show preview"}
                      >
                        {isRowOpen ? "Hide" : "Preview"}
                      </button>

                      <button
                        onClick={() => onRemoveQuestImage(i)}
                        className="button--delete"
                        title="Remove image"
                      >
                        Remove
                      </button>
                    </div>

                    {/* Step linker */}
                    <div style={{ marginTop: 8 }}>
                      <div className="control-group">
                        <label style={{ fontSize: 11, color: "#9ca3af" }}>
                          Linked Steps
                        </label>

                        {/* Show current links as removable chips */}
                        {stepIds.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 4,
                              marginBottom: 6,
                            }}
                          >
                            {stepIds.map((sid) => {
                              const opt = stepOptions.find(
                                (o) => o.stepId === sid
                              );
                              return (
                                <span
                                  key={sid}
                                  style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: 4,
                                    background: "#1e3a5f",
                                    color: "#93c5fd",
                                    borderRadius: 4,
                                    padding: "2px 8px",
                                    fontSize: 11,
                                  }}
                                  title={
                                    opt
                                      ? opt.label
                                      : `Step ID ${sid} (not found)`
                                  }
                                >
                                  Step{" "}
                                  {opt ? opt.stepNumber : `?${sid}`}
                                  <button
                                    onClick={() => {
                                      const next = stepIds.filter(
                                        (id) => id !== sid
                                      );
                                      onEditImage(i, { stepIds: next });
                                    }}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "#f87171",
                                      cursor: "pointer",
                                      padding: 0,
                                      fontSize: 12,
                                      lineHeight: 1,
                                    }}
                                    title="Unlink this step"
                                  >
                                    ×
                                  </button>
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Dropdown to add a step link */}
                        <select
                          value=""
                          onChange={(e) => {
                            const newSid = Number(e.target.value);
                            if (
                              !isNaN(newSid) &&
                              !stepIds.includes(newSid)
                            ) {
                              onEditImage(i, {
                                stepIds: [...stepIds, newSid],
                              });
                            }
                          }}
                          style={{ fontSize: 12 }}
                        >
                          <option value="">
                            {stepIds.length === 0
                              ? "— Link to a step —"
                              : "— Add another step —"}
                          </option>
                          {linkableSteps
                            .filter((o) => !stepIds.includes(o.stepId!))
                            .map((opt) => (
                              <option key={opt.stepId} value={opt.stepId}>
                                Step {opt.stepNumber}:{" "}
                                {opt.label.length > 60
                                  ? opt.label.slice(0, 57) + "..."
                                  : opt.label}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {isRowOpen && (
                      <div
                        style={{
                          marginTop: 8,
                          background: "#111827",
                          border: "1px solid #4b5563",
                          borderRadius: 6,
                          padding: 8,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 6,
                            color: "#d1d5db",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 12,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "75%",
                            }}
                            title={stepTooltip}
                          >
                            {stepLabel}
                          </div>
                          <a
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "#93c5fd", fontSize: 12 }}
                            title="Open full size in new tab"
                          >
                            Open full
                          </a>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            justifyContent: "center",
                            background: "#0b1220",
                            padding: 8,
                            borderRadius: 4,
                          }}
                        >
                          <img
                            src={url}
                            alt={img.src}
                            style={{
                              maxWidth: 480,
                              maxHeight: 320,
                              width: "100%",
                              height: "auto",
                              objectFit: "contain",
                              borderRadius: 4,
                            }}
                            loading="lazy"
                          />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default QuestImagesPanel;
