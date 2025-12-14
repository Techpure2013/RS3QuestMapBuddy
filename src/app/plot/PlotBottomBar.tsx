import React, { useCallback, useEffect, useState } from "react";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import { IconGridDots } from "@tabler/icons-react";

const PlotBottomBar: React.FC = () => {
  const showGrids = useEditorSelector((s) => s.ui.showGrids);
  const [cursor, setCursor] = useState<{ x: number; y: number; zoom: number }>({
    x: 0,
    y: 0,
    zoom: 0,
  });

  // Listen for cursor position updates from the map
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ x: number; y: number; zoom: number }>;
      setCursor(ce.detail);
    };
    window.addEventListener("mapCursorInfo", handler);
    return () => window.removeEventListener("mapCursorInfo", handler);
  }, []);

  const toggleGrids = useCallback(() => {
    const curr = EditorStore.getState().ui.showGrids;
    EditorStore.setUi({ showGrids: !curr });
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "0 16px",
        height: "100%",
      }}
    >
      {/* Grid toggle */}
      <button
        onClick={toggleGrids}
        className="control-btn"
        type="button"
        title={showGrids ? "Hide grids" : "Show grids"}
        style={{
          background: showGrids ? "#2563eb" : undefined,
          borderColor: showGrids ? "#2563eb" : undefined,
          color: showGrids ? "#fff" : undefined,
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <IconGridDots size={14} />
        {showGrids ? "Grids: On" : "Grids: Off"}
      </button>

      {/* Cursor coordinates */}
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          padding: "4px 12px",
          background: "#1f2937",
          border: "1px solid #374151",
          borderRadius: 4,
          color: "#d1d5db",
          fontSize: 13,
          fontFamily: "monospace",
        }}
        title="Map cursor info"
      >
        <span>
          X: <strong style={{ color: "#60a5fa" }}>{cursor.x}</strong>
        </span>
        <span>
          Y: <strong style={{ color: "#34d399" }}>{cursor.y}</strong>
        </span>
        <span>
          Zoom: <strong style={{ color: "#fbbf24" }}>{cursor.zoom}</strong>
        </span>
      </div>
    </div>
  );
};

export default PlotBottomBar;
