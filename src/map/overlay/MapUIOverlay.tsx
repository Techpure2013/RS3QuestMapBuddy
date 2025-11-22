import React, { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import HighlightLayer from "./TileHighlighting";

const RENDER_HERTZ = 12;

export const MapUIOverlay: React.FC = () => {
  const map = useMap();

  const [cursorX, setCursorX] = useState<number>(0);
  const [cursorY, setCursorY] = useState<number>(0);
  const [mapZoom, setMapZoom] = useState<number>(map.getZoom());

  const liveX = useRef<number>(0);
  const liveY = useRef<number>(0);
  const liveZoom = useRef<number>(mapZoom);

  const rafId = useRef<number | null>(null);
  const lastCommitTs = useRef<number>(0);

  // Commit function: moves ref values to state at limited FPS
  const commitIfDue = (ts: number) => {
    const minDelta = 1000 / RENDER_HERTZ;
    if (ts - lastCommitTs.current < minDelta) return;

    // Round to reduce pointless re-renders (values flicker otherwise)
    const nextX = Math.round(liveX.current * 100) / 100;
    const nextY = Math.round(liveY.current * 100) / 100;
    const nextZoom = Math.round(liveZoom.current);

    setCursorX((prev) => (prev !== nextX ? nextX : prev));
    setCursorY((prev) => (prev !== nextY ? nextY : prev));
    setMapZoom((prev) => (prev !== nextZoom ? nextZoom : prev));
    window.dispatchEvent(
      new CustomEvent("mapCursorInfo", {
        detail: { x: nextX, y: nextY, zoom: nextZoom },
      })
    );
    lastCommitTs.current = ts;
  };

  // rAF loop to periodically commit
  const tick = (ts: number) => {
    commitIfDue(ts);
    rafId.current = window.requestAnimationFrame(tick);
  };

  useEffect(() => {
    rafId.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafId.current !== null) {
        window.cancelAnimationFrame(rafId.current);
        rafId.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cursor move handler: update refs only (no state set here)
  const handleCursorMove = (x: number, y: number): void => {
    // Your existing offsets
    liveX.current = x - 0.5;
    liveY.current = y + 0.5;
    // no setState here
  };

  // Map zoom/move end: update live ref; state gets updated on next commit
  useEffect(() => {
    const handleMapStateChange = () => {
      liveZoom.current = map.getZoom();
    };

    map.on("moveend", handleMapStateChange);
    map.on("zoomend", handleMapStateChange);

    // init
    handleMapStateChange();

    return () => {
      map.off("moveend", handleMapStateChange);
      map.off("zoomend", handleMapStateChange);
    };
  }, [map]);

  return (
    <>
      <HighlightLayer onCursorMove={handleCursorMove} />
    </>
  );
};
