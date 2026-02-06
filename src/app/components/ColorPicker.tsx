import React, { useState, useEffect, useRef, useCallback } from "react";

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

// Convert HSV to RGB
function hsvToRgb(h: number, s: number, v: number): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
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
  const [previewColor, setPreviewColor] = useState("#FFFFFF");
  const [useRgbFormat, setUseRgbFormat] = useState(false);
  const [hue, setHue] = useState(0);
  const [isDraggingSwatch, setIsDraggingSwatch] = useState(false);
  const [isDraggingHue, setIsDraggingHue] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const swatchRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);

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

  // Draw the saturation/value swatch
  const drawSwatch = useCallback(() => {
    const canvas = swatchRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw color gradient (saturation horizontal, value vertical)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const s = x / width;
        const v = 1 - y / height;
        const { r, g, b } = hsvToRgb(hue, s, v);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }, [hue]);

  // Draw the hue bar
  const drawHueBar = useCallback(() => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Draw hue gradient
    for (let x = 0; x < width; x++) {
      const h = (x / width) * 360;
      const { r, g, b } = hsvToRgb(h, 1, 1);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, 0, 1, height);
    }
  }, []);

  useEffect(() => {
    drawSwatch();
    drawHueBar();
  }, [drawSwatch, drawHueBar]);

  // Handle swatch click/drag
  const handleSwatchInteraction = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = swatchRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width, (e.clientX - rect.left) * (canvas.width / rect.width)));
    const y = Math.max(0, Math.min(canvas.height, (e.clientY - rect.top) * (canvas.height / rect.height)));

    const s = x / canvas.width;
    const v = 1 - y / canvas.height;
    const { r, g, b } = hsvToRgb(hue, s, v);
    setPreviewColor(rgbToHex(r, g, b));
  }, [hue]);

  // Handle hue bar click/drag
  const handleHueInteraction = useCallback((e: React.MouseEvent<HTMLCanvasElement> | MouseEvent) => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(canvas.width, (e.clientX - rect.left) * (canvas.width / rect.width)));
    const newHue = (x / canvas.width) * 360;
    setHue(newHue);
  }, []);

  // Mouse move/up handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingSwatch) handleSwatchInteraction(e);
      if (isDraggingHue) handleHueInteraction(e);
    };
    const handleMouseUp = () => {
      setIsDraggingSwatch(false);
      setIsDraggingHue(false);
    };

    if (isDraggingSwatch || isDraggingHue) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDraggingSwatch, isDraggingHue, handleSwatchInteraction, handleHueInteraction]);

  const handleApply = () => {
    if (useRgbFormat) {
      const rgb = hexToRgb(previewColor);
      if (rgb) {
        onSelect(`[${rgb.r},${rgb.g},${rgb.b}]`);
      } else {
        onSelect(`[${previewColor}]`);
      }
    } else {
      onSelect(`[${previewColor}]`);
    }
  };

  const handleSelectFromPalette = (color: string) => {
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

  const handleRemoveFromPalette = (hex: string) => {
    const newPalette = palette.filter((c) => c.hex !== hex);
    setPalette(newPalette);
    savePalette(newPalette);
  };

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
        left: 0,
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
      {/* Color Swatch */}
      <div style={{ marginBottom: 10 }}>
        <canvas
          ref={swatchRef}
          width={256}
          height={120}
          style={{
            width: "100%",
            height: 120,
            borderRadius: 4,
            cursor: "crosshair",
            display: "block",
          }}
          onMouseDown={(e) => {
            setIsDraggingSwatch(true);
            handleSwatchInteraction(e);
          }}
        />
      </div>

      {/* Hue Bar */}
      <div style={{ marginBottom: 10 }}>
        <canvas
          ref={hueRef}
          width={256}
          height={16}
          style={{
            width: "100%",
            height: 16,
            borderRadius: 3,
            cursor: "pointer",
            display: "block",
          }}
          onMouseDown={(e) => {
            setIsDraggingHue(true);
            handleHueInteraction(e);
          }}
        />
      </div>

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


      {/* Saved Palette */}
      {palette.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: "0.65rem", color: "#9ca3af", marginBottom: 4 }}>Saved Colors</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {palette.map((c) => (
              <div
                key={c.hex}
                style={{ position: "relative" }}
                className="saved-color-item"
              >
                <button
                  onClick={() => handleSelectFromPalette(c.hex)}
                  title={c.hex}
                  style={{
                    width: 20,
                    height: 20,
                    background: c.hex,
                    border: previewColor === c.hex ? "2px solid #fff" : "1px solid #4b5563",
                    borderRadius: 3,
                    cursor: "pointer",
                    padding: 0,
                  }}
                />
                <button
                  onClick={() => handleRemoveFromPalette(c.hex)}
                  title="Remove"
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    width: 10,
                    height: 10,
                    background: "#ef4444",
                    border: "none",
                    borderRadius: "50%",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: 7,
                    lineHeight: "10px",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  ×
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
