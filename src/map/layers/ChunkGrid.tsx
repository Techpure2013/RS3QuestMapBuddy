import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const ChunkGridLayer: React.FC = () => {
  const map = useMap();
  // Use a ref to store the state of drawn chunks to avoid re-renders.
  const drawnChunksRef = useRef<Map<string, L.LayerGroup>>(new Map());

  useEffect(() => {
    const gridLayer = L.layerGroup().addTo(map);

    const updateGrid = () => {
      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const chunkSize = 64;

      if (zoom < 1) {
        // If zoomed out too far, clear everything and stop.
        gridLayer.clearLayers();
        drawnChunksRef.current.clear();
        return;
      }

      // --- New High-Performance "Diffing" Logic ---

      const requiredChunks = new Set<string>();
      const drawnChunks = drawnChunksRef.current;

      // 1. Calculate all chunks that SHOULD be visible.
      const startX = Math.max(0, Math.floor(bounds.getWest() / chunkSize));
      const endX = Math.min(100, Math.ceil(bounds.getEast() / chunkSize));
      const startY = Math.max(0, Math.floor(bounds.getSouth() / chunkSize));
      const endY = Math.min(200, Math.ceil(bounds.getNorth() / chunkSize));

      for (let x = startX; x < endX; x++) {
        for (let y = startY; y < endY; y++) {
          requiredChunks.add(`${x}_${y}`);
        }
      }

      // 2. REMOVE chunks that are no longer in view.
      for (const chunkId of drawnChunks.keys()) {
        if (!requiredChunks.has(chunkId)) {
          const chunkLayer = drawnChunks.get(chunkId);
          if (chunkLayer) {
            gridLayer.removeLayer(chunkLayer);
          }
          drawnChunks.delete(chunkId);
        }
      }

      // 3. ADD new chunks that have entered the view.
      for (const chunkId of requiredChunks) {
        if (!drawnChunks.has(chunkId)) {
          const [x, y] = chunkId.split("_").map(Number);
          const chunkLayer = L.layerGroup();

          const realX = x * chunkSize;
          const realY = y * chunkSize;

          // Create the rectangle for this new chunk
          const rectangle = L.rectangle(
            [
              [realY, realX],
              [realY + chunkSize, realX + chunkSize],
            ],
            {
              color: "white",
              weight: 1,
              fillOpacity: 0,
              interactive: false,
            }
          );
          chunkLayer.addLayer(rectangle);

          // Create the label for this new chunk
          const label = L.divIcon({
            className: "chunk-label",
            html: `<div style="color: white; font-size: 20px; font-weight: bold;">${x}, ${y}</div>`,
          });
          const labelMarker = L.marker(
            [realY + chunkSize / 2, realX + chunkSize / 2],
            { icon: label, interactive: false }
          );
          chunkLayer.addLayer(labelMarker);

          // Add the new composite layer to the main grid and track it.
          gridLayer.addLayer(chunkLayer);
          drawnChunks.set(chunkId, chunkLayer);
        }
      }
    };

    // Use 'moveend' to only update after panning is complete.
    map.on("moveend", updateGrid);
    map.on("zoomend", updateGrid);

    // Initial grid update
    updateGrid();

    return () => {
      map.off("moveend", updateGrid);
      map.off("zoomend", updateGrid);
      map.removeLayer(gridLayer);
    };
  }, [map]);

  return null;
};

export default ChunkGridLayer;
