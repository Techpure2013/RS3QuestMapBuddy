// src/Map Classes/Map Components/MapUIOverlay.tsx

import React, { useState, useCallback, useEffect } from "react";
import { useMap } from "react-leaflet";
import HighlightLayer from "./TileHighlighting";
import { IconSettings } from "@tabler/icons-react";

export const MapUIOverlay: React.FC = () => {
  const map = useMap();

  const [cursorX, setCursorX] = useState(0);
  const [cursorY, setCursorY] = useState(0);

  const [mapZoom, setMapZoom] = useState(map.getZoom());

  const handleCursorMove = useCallback((x: number, y: number) => {
    setCursorX(x - 0.5);
    setCursorY(y + 0.5);
  }, []);

  useEffect(() => {
    const handleMapStateChange = () => {
      setMapZoom(map.getZoom());
    };

    map.on("moveend", handleMapStateChange);
    map.on("zoomend", handleMapStateChange);

    handleMapStateChange();

    return () => {
      map.off("moveend", handleMapStateChange);
      map.off("zoomend", handleMapStateChange);
    };
  }, [map]);

  return (
    <>
      <HighlightLayer onCursorMove={handleCursorMove} />

      <div className="cursor-coordinates-box">
        <div className="coordinate-row">
          <span>Zoom: {Math.round(mapZoom)}</span>
          <span>X: {cursorX}</span>
          <span>Y: {cursorY}</span>
          <span>
            <IconSettings />
          </span>
        </div>
      </div>
    </>
  );
};
