import React, { useState } from "react";
import { ImagePasteTarget } from "./ImagePasteTarget";
import type { QuestImage } from "state/types";

const AssetToolsSection: React.FC<{
  isOpen: boolean;
  onToggle: () => void;

  questImageList: QuestImage[];
  onRemoveQuestImage: (index: number) => void;
  onReorderQuestImage?: (from: number, to: number) => void;

  // For preview URL building
  questName: string;
  previewBaseUrl?: string;

  isAlt1Environment: boolean;

  chatheadName: string;
  onChatheadNameChange: (v: string) => void;
  chatheadUrl: string;
  onChatheadUrlChange: (v: string) => void;
  onAddChathead: () => void;

  onSelectImageDirectory: () => void;
  imageDirectoryName: string;
  onImagePaste: (b: Blob) => void;

  stepImageUrl: string;
  onStepImageUrlChange: (v: string) => void;
  onAddImage: () => void;
}> = ({
  isOpen,
  onToggle,

  questImageList,
  onRemoveQuestImage,
  onReorderQuestImage,

  questName,
  previewBaseUrl = "https://techpure.dev/RS3QuestBuddy/Images",

  isAlt1Environment,

  chatheadName,
  onChatheadNameChange,
  chatheadUrl,
  onChatheadUrlChange,
  onAddChathead,

  onSelectImageDirectory,
  imageDirectoryName,
  onImagePaste,

  stepImageUrl,
  onStepImageUrlChange,
  onAddImage,
}) => {
  // Track which image rows are expanded for preview
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const buildPreviewUrl = (img: QuestImage) => {
    // Encode quest folder the same way your server expects
    const folder = encodeURIComponent(questName);
    return `${previewBaseUrl}/${folder}/${img.src}`;
  };

  const toggleExpanded = (idx: number) => {
    setExpanded((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="panel-section">
      <label className="EditDescriptionLabel">
        <strong>Asset Creation Tools</strong>
        <input type="checkbox" checked={isOpen} onChange={onToggle} />
      </label>

      {isOpen && (
        <div style={{ marginTop: 10 }}>
          {/* Chatheads */}
          <div className="panel-section">
            <div className="control-group">
              <label>Chathead Override Name</label>
              <input
                type="text"
                value={chatheadName}
                onChange={(e) => onChatheadNameChange(e.target.value)}
                placeholder="e.g., Master Chef ( Beneath Cursed Tides )"
              />
            </div>
            <div className="control-group">
              <label>Chathead Image URL</label>
              <input
                type="text"
                value={chatheadUrl}
                onChange={(e) => onChatheadUrlChange(e.target.value)}
                placeholder="Paste wiki URL here"
              />
            </div>
            <div className="button-group">
              <button onClick={onAddChathead} className="button--add">
                Add/Update Chathead Override
              </button>
            </div>
          </div>

          {/* Ingest tools */}
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
              <label>Or Add Step Image from URL</label>
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

          {/* Quest image list with inline preview */}
          <div className="panel-section">
            <strong>Quest Images</strong>
            {questImageList.length === 0 ? (
              <div className="qp-empty">No images yet</div>
            ) : (
              <ul className="search-results" style={{ maxHeight: 320 }}>
                {questImageList.map((img, i) => {
                  const url = buildPreviewUrl(img);
                  const isOpen = !!expanded[i];

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

                        {/* Preview Toggle */}
                        <button
                          onClick={() => toggleExpanded(i)}
                          title={isOpen ? "Hide preview" : "Show preview"}
                        >
                          {isOpen ? "Hide" : "Preview"}
                        </button>

                        {/* Move up/down */}
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

                        {/* Remove */}
                        <button
                          onClick={() => onRemoveQuestImage(i)}
                          className="button--delete"
                          title="Remove image"
                        >
                          Remove
                        </button>
                      </div>

                      {/* Inline preview content */}
                      {isOpen && (
                        <div
                          style={{
                            marginTop: 8,
                            background: "#111827",
                            border: "1px solid #4b5563",
                            borderRadius: 6,
                            padding: 8,
                          }}
                        >
                          {/* Optional compact header */}
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

                          {/* Thumbnail box */}
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

export default AssetToolsSection;
