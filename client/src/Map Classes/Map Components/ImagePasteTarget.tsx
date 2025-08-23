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
            // Reset visual state after a short delay
            setTimeout(() => setIsPasting(false), 1500);
          }
          return;
        }
      }
    };

    // The 'paste' event needs to be on the document to catch it globally when the div is focused
    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [onImagePaste, disabled]);

  const getClassName = () => {
    let base = "image-paste-target";
    if (disabled) return `${base} disabled`;
    if (isPasting) return `${base} pasting`;
    return base;
  };

  return (
    <div ref={pasteRef} className={getClassName()} tabIndex={0}>
      {isPasting
        ? "Processing Image..."
        : "Click here and paste image from clipboard"}
    </div>
  );
};
