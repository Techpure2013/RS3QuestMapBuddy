import React, { useRef, useEffect, useState } from "react";

interface ImagePasteTargetProps {
  onImagePaste: (imageBlob: Blob) => void;
  disabled: boolean;
}

export const ImagePasteTarget: React.FC<ImagePasteTargetProps> = ({
  onImagePaste,
  disabled,
}) => {
  const pasteRef = useRef<HTMLDivElement>(null);
  const [isPasting, setIsPasting] = useState(false);
  // --- NEW: State for drag-over visual feedback ---
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // This useEffect for pasting remains unchanged
  useEffect(() => {
    const div = pasteRef.current;
    if (!div) return;

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

  // --- NEW: Drag and Drop Event Handlers ---

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    // Check if the dragged items are files
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
    e.preventDefault(); // This is crucial to allow the drop event to fire
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
      // Ensure the dropped file is an image
      if (file.type.startsWith("image/")) {
        setIsPasting(true);
        onImagePaste(file);
        setTimeout(() => setIsPasting(false), 1500);
      }
    }
  };

  // --- MODIFIED: Updated className and text logic ---

  const getClassName = () => {
    let base = "image-paste-target";
    if (disabled) return `${base} disabled`;
    if (isPasting) return `${base} pasting`;
    if (isDraggingOver) return `${base} dragging-over`; // New class
    return base;
  };

  const getDisplayText = () => {
    if (disabled) {
      return "Select an image directory first";
    }
    if (isPasting) {
      return "Processing Image...";
    }
    if (isDraggingOver) {
      return "Drop image here";
    }
    return "Paste or drop image from clipboard";
  };

  return (
    <div
      ref={pasteRef}
      className={getClassName()}
      tabIndex={0}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {getDisplayText()}
    </div>
  );
};
