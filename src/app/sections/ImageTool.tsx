import React, { useMemo, useState } from "react";
import type { QuestImage } from "./../../state/types";

export interface StepOption {
  value: string; // string step key, e.g., "1", "1a"
  label: string; // step description
}

export interface QuestImagesPanelProps {
  questName: string;
  previewBaseUrl?: string;

  questImageList: QuestImage[];
  onRemoveQuestImage: (index: number) => void;

  // Editing
  onEditImage: (
    index: number,
    patch: { step?: string; stepDescription?: string }
  ) => void;
  stepOptions: StepOption[];

  // Optional: collapse control
  isOpen?: boolean;
  onToggle?: () => void;
}

export const QuestImagesPanel: React.FC<QuestImagesPanelProps> = ({
  questName,
  previewBaseUrl = "https://techpure.dev/images",

  questImageList,
  onRemoveQuestImage,

  onEditImage,
  stepOptions,

  isOpen = true,
  onToggle,
}) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const buildPreviewUrl = (img: QuestImage): string => {
    const folder = encodeURIComponent(questName);
    return `${previewBaseUrl}/${folder}/${img.src}`;
  };

  const toggleExpanded = (index: number): void => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const stepSelectOptions = useMemo(() => stepOptions, [stepOptions]);

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
                const stepString = String(img.step ?? "");
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
                        }}
                        title={`${img.src} (${img.width}x${img.height}) — ${img.stepDescription}`}
                      >
                        Step {stepString}: {img.src}
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

                    {/* Inline editor for step (string) and description */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                        marginTop: 8,
                      }}
                    >
                      <div className="control-group">
                        <label>Step (string)</label>
                        <input
                          type="text"
                          value={stepString}
                          onChange={(e) =>
                            onEditImage(i, { step: e.target.value })
                          }
                          placeholder="e.g., 1, 1a, 2, etc."
                        />
                      </div>

                      <div className="control-group">
                        <label>Step Description</label>
                        <select
                          value={img.stepDescription ?? ""}
                          onChange={(e) =>
                            onEditImage(i, {
                              stepDescription: e.target.value,
                            })
                          }
                        >
                          <option value="">— Select description —</option>
                          {stepSelectOptions.map((opt) => (
                            <option
                              key={opt.value + opt.label}
                              value={opt.label}
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <textarea
                          value={img.stepDescription ?? ""}
                          onChange={(e) =>
                            onEditImage(i, {
                              stepDescription: e.target.value,
                            })
                          }
                          rows={2}
                          placeholder="Edit description…"
                        />
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
                            title={img.stepDescription || ""}
                          >
                            {img.stepDescription || `Step ${stepString}`}
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
