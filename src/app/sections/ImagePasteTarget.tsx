import React, { useRef, useEffect, useState } from "react";

export interface ImagePasteTargetProps {
  onImagePaste: (imageBlob: Blob) => void;
  disabled: boolean;

  // New: optional URL ingest inside the same UI
  onAddImageFromUrl?: (url: string) => void;
  addUrlLabel?: string; // optional label override, defaults below
}

export const ImagePasteTarget: React.FC<ImagePasteTargetProps> = ({
  onImagePaste,
  disabled,
  onAddImageFromUrl,
  addUrlLabel = "Add image by URL",
}) => {
  const pasteRef = useRef<HTMLDivElement>(null);
  const [isPasting, setIsPasting] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [urlInput, setUrlInput] = useState<string>("");

  // Clipboard paste listener (document-level, as before)
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (disabled) return;

      const items = event.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            event.preventDefault();
            setIsPasting(true);
            onImagePaste(blob);
            setTimeout(() => setIsPasting(false), 1500);
          }
          return;
        }
      }
    };

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [onImagePaste, disabled]);

  // Drag & drop handlers
  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.startsWith("image/")) {
        setIsPasting(true);
        onImagePaste(file);
        setTimeout(() => setIsPasting(false), 1500);
      }
    }
  };

  const getClassName = (): string => {
    let base = "image-paste-target";
    if (disabled) return `${base} disabled`;
    if (isPasting) return `${base} pasting`;
    if (isDraggingOver) return `${base} dragging-over`;
    return base;
  };

  const getDisplayText = (): string => {
    if (disabled) return "Select an image directory first";
    if (isPasting) return "Processing Image...";
    if (isDraggingOver) return "Drop image here";
    return "Paste or drop image from clipboard";
  };

  const canSubmitUrl =
    !!onAddImageFromUrl && !disabled && urlInput.trim().length > 0;

  return (
    <div className="panel-section">
      <div
        ref={pasteRef}
        className={getClassName()}
        tabIndex={0}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        title="Paste an image (Ctrl+V) or drag-and-drop here"
        style={{ marginBottom: 8 }}
      >
        {getDisplayText()}
      </div>

      {onAddImageFromUrl && (
        <div
          className="control-group"
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste image URL here"
            disabled={disabled}
            style={{ flex: 1 }}
          />
          <button
            onClick={() => {
              if (!canSubmitUrl) return;
              onAddImageFromUrl(urlInput.trim());
              setUrlInput("");
            }}
            className="button--add"
            disabled={!canSubmitUrl}
            title={disabled ? "Please select an image directory first" : ""}
          >
            {addUrlLabel}
          </button>
        </div>
      )}
    </div>
  );
};
