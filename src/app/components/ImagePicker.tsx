import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";

export interface ImagePickerProps {
  onSelect: (markup: string) => void;
  onClose: () => void;
  anchorRef?: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Resolve wiki URLs to direct image URLs
 */
function resolveWikiImageUrl(inputUrl: string): string {
  let url = inputUrl.trim();

  // runescape.wiki media viewer: https://runescape.wiki/w/Something#/media/File:Image.png
  const rsWikiMediaMatch = url.match(/runescape\.wiki\/w\/[^#]+#\/media\/File:([^?#]+)/i);
  if (rsWikiMediaMatch) {
    return `https://runescape.wiki/images/${rsWikiMediaMatch[1]}`;
  }

  // runescape.wiki direct file page: https://runescape.wiki/w/File:Image.png
  const rsWikiFileMatch = url.match(/runescape\.wiki\/w\/File:([^?#]+)/i);
  if (rsWikiFileMatch) {
    return `https://runescape.wiki/images/${rsWikiFileMatch[1]}`;
  }

  // Fandom/wikia URLs with /revision/latest/... - strip everything after .png/.jpg/.gif
  const fandomRevisionMatch = url.match(/(https?:\/\/static\.wikia\.nocookie\.net\/[^/]+\/images\/[^/]+\/[^/]+\/[^/]+\.(png|jpg|jpeg|gif|webp))/i);
  if (fandomRevisionMatch) {
    return fandomRevisionMatch[1];
  }

  // oldschool.runescape.wiki same patterns
  const osrsWikiMediaMatch = url.match(/oldschool\.runescape\.wiki\/w\/[^#]+#\/media\/File:([^?#]+)/i);
  if (osrsWikiMediaMatch) {
    return `https://oldschool.runescape.wiki/images/${osrsWikiMediaMatch[1]}`;
  }

  const osrsWikiFileMatch = url.match(/oldschool\.runescape\.wiki\/w\/File:([^?#]+)/i);
  if (osrsWikiFileMatch) {
    return `https://oldschool.runescape.wiki/images/${osrsWikiFileMatch[1]}`;
  }

  return url;
}

export const ImagePicker: React.FC<ImagePickerProps> = ({ onSelect, onClose, anchorRef }) => {
  const [url, setUrl] = useState("");
  const [size, setSize] = useState("48");
  const [alt, setAlt] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [anchorPos, setAnchorPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchorRef?.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setAnchorPos({ top: rect.bottom + 4, left: rect.left });
  }, [anchorRef]);

  // Focus URL input on mount
  useEffect(() => {
    urlInputRef.current?.focus();
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handlePreview = () => {
    if (!url.trim() || !/^https?:\/\/.+/.test(url)) return;
    const resolved = resolveWikiImageUrl(url);
    setResolvedUrl(resolved !== url ? resolved : null);
    setPreviewError(false);
    setPreviewLoading(true);
    setPreviewUrl(resolved);
  };

  const handleApply = () => {
    if (!url.trim()) return;

    // Use resolved URL if available
    const finalUrl = resolvedUrl || resolveWikiImageUrl(url);
    const sizeNum = parseInt(size, 10) || 48;
    const markup = sizeNum === 48
      ? `![${alt}](${finalUrl})`
      : `![${alt}|${sizeNum}](${finalUrl})`;

    onSelect(markup);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleApply();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  const sizeNum = parseInt(size, 10) || 48;
  const isValidUrl = url.trim().length > 0 && /^https?:\/\/.+/.test(url);

  const buttonStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "0.7rem",
    background: "#374151",
    border: "1px solid #4b5563",
    borderRadius: 3,
    color: "#e5e7eb",
    cursor: "pointer",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "5px 8px",
    background: "#111827",
    border: "1px solid #374151",
    borderRadius: 3,
    color: "#e5e7eb",
    fontSize: "0.8rem",
  };

  const pickerContent = (
    <div
      ref={containerRef}
      onKeyDown={handleKeyDown}
      style={{
        position: anchorPos ? "fixed" : "absolute",
        top: anchorPos ? anchorPos.top : "100%",
        left: anchorPos ? anchorPos.left : 0,
        marginTop: anchorPos ? 0 : 4,
        background: "#1f2937",
        border: "1px solid #374151",
        borderRadius: 6,
        padding: 12,
        zIndex: 10000,
        width: 280,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      {/* Preview */}
      <div style={{ display: "flex", gap: 12, marginBottom: 12, alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div
            style={{
              width: 64,
              height: 64,
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}
          >
            {previewUrl && !previewError ? (
              <img
                src={previewUrl}
                alt={alt || "Preview"}
                style={{
                  maxWidth: 64,
                  maxHeight: 64,
                  objectFit: "contain",
                }}
                onLoad={() => setPreviewLoading(false)}
                onError={() => {
                  setPreviewError(true);
                  setPreviewLoading(false);
                }}
              />
            ) : (
              <span style={{ fontSize: "0.6rem", color: "#6b7280", textAlign: "center", padding: 4 }}>
                {previewError ? "Failed" : previewLoading ? "Loading..." : "No preview"}
              </span>
            )}
          </div>
          <span style={{ fontSize: "0.6rem", color: "#6b7280" }}>Max: {sizeNum}px</span>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 64 }}>
          <button
            type="button"
            onClick={handlePreview}
            disabled={!isValidUrl}
            style={{
              ...buttonStyle,
              opacity: isValidUrl ? 1 : 0.5,
              cursor: isValidUrl ? "pointer" : "not-allowed",
              width: "100%",
              padding: "8px 12px",
            }}
          >
            Preview
          </button>
        </div>
      </div>

      {/* URL Input */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: "0.65rem", color: "#9ca3af", display: "block", marginBottom: 3 }}>
          Image URL (wiki URLs auto-resolved)
        </label>
        <input
          ref={urlInputRef}
          type="text"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setResolvedUrl(null);
            setPreviewUrl(null);
            setPreviewError(false);
          }}
          placeholder="https://runescape.wiki/w/File:Image.png"
          style={inputStyle}
        />
        {resolvedUrl && (
          <div style={{
            marginTop: 4,
            padding: "4px 6px",
            background: "#14532d",
            border: "1px solid #166534",
            borderRadius: 3,
            fontSize: "0.65rem",
            color: "#86efac",
          }}>
            ✓ Resolved to: <span style={{ wordBreak: "break-all" }}>{resolvedUrl}</span>
          </div>
        )}
      </div>

      {/* Size Input */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: "0.65rem", color: "#9ca3af", display: "block", marginBottom: 3 }}>
          Size (pixels)
        </label>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="number"
            min={16}
            max={256}
            value={size}
            onChange={(e) => setSize(e.target.value)}
            style={{ ...inputStyle, width: 60, textAlign: "center" }}
          />
          {/* Quick size buttons */}
          {[24, 32, 48, 64].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s.toString())}
              style={{
                ...buttonStyle,
                background: parseInt(size) === s ? "#3b82f6" : "#374151",
                border: parseInt(size) === s ? "1px solid #60a5fa" : "1px solid #4b5563",
                flex: 1,
                textAlign: "center",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Alt Text Input */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: "0.65rem", color: "#9ca3af", display: "block", marginBottom: 3 }}>
          Alt Text (optional)
        </label>
        <input
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Description for accessibility"
          style={inputStyle}
        />
      </div>

      {/* Output Preview */}
      {isValidUrl && (
        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: "0.65rem", color: "#9ca3af", display: "block", marginBottom: 3 }}>
            Markup Preview
          </label>
          <div
            style={{
              padding: "6px 8px",
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: 3,
              fontSize: "0.7rem",
              color: "#9ca3af",
              fontFamily: "monospace",
              wordBreak: "break-all",
            }}
          >
            {(() => {
              const finalUrl = resolvedUrl || url;
              return sizeNum === 48 ? `![${alt}](${finalUrl})` : `![${alt}|${sizeNum}](${finalUrl})`;
            })()}
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
        <button onClick={onClose} style={buttonStyle}>
          Cancel
        </button>
        <button
          onClick={handleApply}
          disabled={!isValidUrl}
          style={{
            ...buttonStyle,
            background: isValidUrl ? "#22c55e" : "#374151",
            border: isValidUrl ? "1px solid #16a34a" : "1px solid #4b5563",
            opacity: isValidUrl ? 1 : 0.5,
            cursor: isValidUrl ? "pointer" : "not-allowed",
          }}
        >
          Insert Image
        </button>
      </div>
    </div>
  );

  return anchorPos
    ? ReactDOM.createPortal(pickerContent, document.body)
    : pickerContent;
};

export default ImagePicker;
