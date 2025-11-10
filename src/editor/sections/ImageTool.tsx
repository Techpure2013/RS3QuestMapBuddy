import React, { useState } from "react";
import { ImagePasteTarget } from "./ImagePasteTarget";
import type { QuestImage } from "state/types";

export interface QuestImagesPanelProps {
  questName: string;
  previewBaseUrl?: string;

  // Current quest images
  questImageList: QuestImage[];
  onRemoveQuestImage: (index: number) => void;
  onReorderQuestImage?: (from: number, to: number) => void;

  // Directory + ingest
  onSelectImageDirectory: () => void;
  imageDirectoryName: string;
  onImagePaste: (blob: Blob) => void;

  // URL ingest
  stepImageUrl: string;
  onStepImageUrlChange: (value: string) => void;
  onAddImage: () => void;

  // Optional: controlled expand/collapse of panel if you want
  isOpen: boolean;
  onToggle: () => void;
}

export const QuestImagesPanel: React.FC<QuestImagesPanelProps> = ({
  questName,
  previewBaseUrl = "https://techpure.dev/RS3QuestBuddy/Images",

  questImageList,
  onRemoveQuestImage,
  onReorderQuestImage,

  onSelectImageDirectory,
  imageDirectoryName,
  onImagePaste,

  stepImageUrl,
  onStepImageUrlChange,
  onAddImage,

  isOpen,
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

  return (
    <div className="panel-section">
      <label className="EditDescriptionLabel">
        <strong>Quest Images</strong>
        <input type="checkbox" checked={isOpen} onChange={onToggle} />
      </label>

      {isOpen && (
        <div style={{ marginTop: 10 }}>
          {/* Directory + paste/URL ingest */}
          <div className="panel-section">
            <div className="button-group">
              <button
                onClick={onSelectImageDirectory}
                style={{ width: "100%", marginTop: 8 }}
              >
                {imageDirectoryName
                  ? `Saving to: ${imageDirectoryName}`
                  : "Select Image Save Directory"}
              </button>
            </div>

            <ImagePasteTarget
              onImagePaste={onImagePaste}
              disabled={!imageDirectoryName}
            />

            <div className="control-group">
              <label>Add Step Image from URL</label>
              <input
                type="text"
                value={stepImageUrl}
                onChange={(e) => onStepImageUrlChange(e.target.value)}
                placeholder="Paste image URL here"
              />
            </div>
            <button
              onClick={onAddImage}
              className="button--add"
              disabled={!imageDirectoryName}
              title={
                !imageDirectoryName
                  ? "Please select an image directory first"
                  : ""
              }
            >
              Add Image from URL
            </button>
          </div>

          {/* List + preview */}
          <div className="panel-section">
            {questImageList.length === 0 ? (
              <div className="qp-empty">No images yet</div>
            ) : (
              <ul className="search-results" style={{ maxHeight: 320 }}>
                {questImageList.map((img, i) => {
                  const url = buildPreviewUrl(img);
                  const isRowOpen = !!expanded[i];

                  return (
                    <li
                      key={`${img.step}-${img.src}-${i}`}
                      style={{ padding: 8 }}
                    >
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
                          Step {img.step}: {img.src}
                        </span>

                        <button
                          onClick={() => toggleExpanded(i)}
                          title={isRowOpen ? "Hide preview" : "Show preview"}
                        >
                          {isRowOpen ? "Hide" : "Preview"}
                        </button>

                        {onReorderQuestImage && (
                          <>
                            <button
                              onClick={() => onReorderQuestImage(i, i - 1)}
                              disabled={i === 0}
                              title="Move up"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => onReorderQuestImage(i, i + 1)}
                              disabled={i === questImageList.length - 1}
                              title="Move down"
                            >
                              ↓
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => onRemoveQuestImage(i)}
                          className="button--delete"
                          title="Remove image"
                        >
                          Remove
                        </button>
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
                              {img.stepDescription || `Step ${img.step}`}
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
        </div>
      )}
    </div>
  );
};

export default QuestImagesPanel;
