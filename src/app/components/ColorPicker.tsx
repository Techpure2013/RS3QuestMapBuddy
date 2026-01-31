import React, { useState, useEffect, useRef } from "react";

const STORAGE_KEY = "richtext-color-palette";

interface SavedColor {
  hex: string;
  favorite: boolean;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, x)).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
      .toUpperCase()
  );
}

function loadPalette(): SavedColor[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function savePalette(palette: SavedColor[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(palette));
}

// Default RS3-style colors
const DEFAULT_COLORS = [
  "#FFFFFF", // White
  "#FFFF00", // Yellow
  "#00FF00", // Green
  "#00FFFF", // Cyan
  "#FF0000", // Red
  "#FF00FF", // Magenta
  "#FFA500", // Orange
  "#FFD700", // Gold
  "#7CFC00", // Lawn green
  "#1E90FF", // Dodger blue
  "#9400D3", // Dark violet
  "#FF69B4", // Hot pink
];

interface ColorPickerProps {
  onSelect: (colorCode: string) => void;
  onClose: () => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ onSelect, onClose }) => {
  const [palette, setPalette] = useState<SavedColor[]>([]);
  const [hexInput, setHexInput] = useState("#");
  const [rgbR, setRgbR] = useState("");
  const [rgbG, setRgbG] = useState("");
  const [rgbB, setRgbB] = useState("");
  const [previewColor, setPreviewColor] = useState("#FFFFFF");
  const [useRgbFormat, setUseRgbFormat] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPalette(loadPalette());
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

  // Update preview when hex changes
  useEffect(() => {
    if (/^#[0-9A-Fa-f]{6}$/.test(hexInput)) {
      setPreviewColor(hexInput);
      const rgb = hexToRgb(hexInput);
      if (rgb) {
        setRgbR(rgb.r.toString());
        setRgbG(rgb.g.toString());
        setRgbB(rgb.b.toString());
      }
    }
  }, [hexInput]);

  // Update preview when RGB changes
  useEffect(() => {
    const r = parseInt(rgbR) || 0;
    const g = parseInt(rgbG) || 0;
    const b = parseInt(rgbB) || 0;
    if (r >= 0 && r <= 255 && g >= 0 && g <= 255 && b >= 0 && b <= 255) {
      const hex = rgbToHex(r, g, b);
      setPreviewColor(hex);
      if (rgbR && rgbG && rgbB) {
        setHexInput(hex);
      }
    }
  }, [rgbR, rgbG, rgbB]);

  const handleApply = () => {
    if (useRgbFormat) {
      const r = parseInt(rgbR) || 0;
      const g = parseInt(rgbG) || 0;
      const b = parseInt(rgbB) || 0;
      onSelect(`[${r},${g},${b}]`);
    } else {
      onSelect(`[${previewColor}]`);
    }
  };

  const handleSelectFromPalette = (color: string) => {
    setHexInput(color);
    const rgb = hexToRgb(color);
    if (rgb) {
      setRgbR(rgb.r.toString());
      setRgbG(rgb.g.toString());
      setRgbB(rgb.b.toString());
    }
    setPreviewColor(color);
  };

  const handleAddToPalette = () => {
    if (!/^#[0-9A-Fa-f]{6}$/.test(previewColor)) return;
    const exists = palette.some((c) => c.hex.toUpperCase() === previewColor.toUpperCase());
    if (!exists) {
      const newPalette = [...palette, { hex: previewColor.toUpperCase(), favorite: false }];
      setPalette(newPalette);
      savePalette(newPalette);
    }
  };

  const handleToggleFavorite = (hex: string) => {
    const newPalette = palette.map((c) =>
      c.hex === hex ? { ...c, favorite: !c.favorite } : c
    );
    setPalette(newPalette);
    savePalette(newPalette);
  };

  const handleRemoveFromPalette = (hex: string) => {
    const newPalette = palette.filter((c) => c.hex !== hex);
    setPalette(newPalette);
    savePalette(newPalette);
  };

  const favorites = palette.filter((c) => c.favorite);
  const nonFavorites = palette.filter((c) => !c.favorite);

  const buttonStyle: React.CSSProperties = {
    padding: "4px 8px",
    fontSize: "0.7rem",
    background: "#374151",
    border: "1px solid #4b5563",
    borderRadius: 3,
    color: "#e5e7eb",
    cursor: "pointer",
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: "absolute",
        top: "100%",
        right: 0,
        marginTop: 4,
        background: "#1f2937",
        border: "1px solid #374151",
        borderRadius: 6,
        padding: 12,
        zIndex: 1200,
        width: 280,
        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      {/* Preview */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
        <div
          style={{
            width: 40,
            height: 40,
            background: previewColor,
            border: "2px solid #4b5563",
            borderRadius: 4,
          }}
        />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.7rem", color: "#9ca3af", marginBottom: 2 }}>Preview</div>
          <div style={{ fontSize: "0.85rem", color: "#e5e7eb", fontFamily: "monospace" }}>
            {previewColor}
          </div>
        </div>
        <button onClick={handleAddToPalette} style={buttonStyle} title="Add to palette">
          + Save
        </button>
      </div>

      {/* Hex Input */}
      <div style={{ marginBottom: 8 }}>
        <label style={{ fontSize: "0.65rem", color: "#9ca3af", display: "block", marginBottom: 3 }}>
          HEX
        </label>
        <input
          type="text"
          value={hexInput}
          onChange={(e) => setHexInput(e.target.value.toUpperCase())}
          placeholder="#FFFFFF"
          maxLength={7}
          style={{
            width: "100%",
            padding: "5px 8px",
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: 3,
            color: "#e5e7eb",
            fontSize: "0.8rem",
            fontFamily: "monospace",
          }}
        />
      </div>

      {/* RGB Input */}
      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: "0.65rem", color: "#9ca3af", display: "block", marginBottom: 3 }}>
          RGB
        </label>
        <div style={{ display: "flex", gap: 6 }}>
          <input
            type="number"
            min={0}
            max={255}
            value={rgbR}
            onChange={(e) => setRgbR(e.target.value)}
            placeholder="R"
            style={{
              flex: 1,
              padding: "5px 6px",
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: 3,
              color: "#ef4444",
              fontSize: "0.8rem",
              fontFamily: "monospace",
            }}
          />
          <input
            type="number"
            min={0}
            max={255}
            value={rgbG}
            onChange={(e) => setRgbG(e.target.value)}
            placeholder="G"
            style={{
              flex: 1,
              padding: "5px 6px",
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: 3,
              color: "#22c55e",
              fontSize: "0.8rem",
              fontFamily: "monospace",
            }}
          />
          <input
            type="number"
            min={0}
            max={255}
            value={rgbB}
            onChange={(e) => setRgbB(e.target.value)}
            placeholder="B"
            style={{
              flex: 1,
              padding: "5px 6px",
              background: "#111827",
              border: "1px solid #374151",
              borderRadius: 3,
              color: "#3b82f6",
              fontSize: "0.8rem",
              fontFamily: "monospace",
            }}
          />
        </div>
      </div>

      {/* Format Toggle */}
      <div style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
        <label style={{ fontSize: "0.7rem", color: "#9ca3af" }}>Output format:</label>
        <button
          onClick={() => setUseRgbFormat(false)}
          style={{
            ...buttonStyle,
            background: !useRgbFormat ? "#3b82f6" : "#374151",
          }}
        >
          Hex
        </button>
        <button
          onClick={() => setUseRgbFormat(true)}
          style={{
            ...buttonStyle,
            background: useRgbFormat ? "#3b82f6" : "#374151",
          }}
        >
          RGB
        </button>
      </div>

      {/* Default Colors */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginBottom: 4 }}>Quick Colors</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
          {DEFAULT_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => handleSelectFromPalette(color)}
              title={color}
              style={{
                width: 20,
                height: 20,
                background: color,
                border: previewColor === color ? "2px solid #fff" : "1px solid #4b5563",
                borderRadius: 3,
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
      </div>

      {/* Favorites */}
      {favorites.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: "0.65rem", color: "#fbbf24", marginBottom: 4 }}>★ Favorites</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {favorites.map((c) => (
              <div key={c.hex} style={{ position: "relative" }}>
                <button
                  onClick={() => handleSelectFromPalette(c.hex)}
                  title={c.hex}
                  style={{
                    width: 24,
                    height: 24,
                    background: c.hex,
                    border: previewColor === c.hex ? "2px solid #fff" : "1px solid #4b5563",
                    borderRadius: 3,
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
                <button
                  onClick={() => handleToggleFavorite(c.hex)}
                  title="Unfavorite"
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 12,
                    height: 12,
                    background: "#fbbf24",
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: "8px",
                    lineHeight: "10px",
                    padding: 0,
                    color: "#000",
                  }}
                >
                  ★
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Saved Palette */}
      {nonFavorites.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginBottom: 4 }}>Saved Colors</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {nonFavorites.map((c) => (
              <div key={c.hex} style={{ position: "relative" }}>
                <button
                  onClick={() => handleSelectFromPalette(c.hex)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleRemoveFromPalette(c.hex);
                  }}
                  title={`${c.hex} (right-click to remove)`}
                  style={{
                    width: 24,
                    height: 24,
                    background: c.hex,
                    border: previewColor === c.hex ? "2px solid #fff" : "1px solid #4b5563",
                    borderRadius: 3,
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
                <button
                  onClick={() => handleToggleFavorite(c.hex)}
                  title="Add to favorites"
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 12,
                    height: 12,
                    background: "#4b5563",
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    fontSize: "8px",
                    lineHeight: "10px",
                    padding: 0,
                    color: "#9ca3af",
                  }}
                >
                  ☆
                </button>
              </div>
            ))}
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
          style={{
            ...buttonStyle,
            background: "#22c55e",
            border: "1px solid #16a34a",
          }}
        >
          Apply Color
        </button>
      </div>
    </div>
  );
};

export default ColorPicker;
