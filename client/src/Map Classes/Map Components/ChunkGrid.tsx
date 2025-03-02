import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

const ChunkGridLayer: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    // Create a custom Leaflet layer for the grid
    const gridLayer = L.layerGroup();

    const updateGrid = () => {
      gridLayer.clearLayers();

      const bounds = map.getBounds();
      const zoom = map.getZoom();
      const chunkSize = 64;

      // Only show the grid at zoom level 2 and above
      if (zoom < 1) return;

      // Get the bounds of the map in terms of map coordinates
      const startX = Math.floor(bounds.getWest() / chunkSize) * chunkSize;
      const endX = Math.ceil(bounds.getEast() / chunkSize) * chunkSize;
      const startY = Math.floor(bounds.getSouth() / chunkSize) * chunkSize;
      const endY = Math.ceil(bounds.getNorth() / chunkSize) * chunkSize;

      // Loop through the chunks and create grid lines and labels
      for (let x = startX; x <= endX; x += chunkSize) {
        for (let y = startY; y <= endY; y += chunkSize) {
          // Create a rectangle for the chunk
          const rectangle = L.rectangle(
            [
              [y, x],
              [y + chunkSize, x + chunkSize],
            ],
            {
              color: "white",
              weight: 1,
              fillOpacity: 0, // No fill, just the border
            }
          );

          // Add the rectangle to the grid layer
          gridLayer.addLayer(rectangle);

          // Add a label for the chunk
          const label = L.divIcon({
            className: "chunk-label",
            html: `<div style="color: white; font-size: 20px; font-weight: bold;">${
              x / chunkSize
            }, ${y / chunkSize}</div>`,
          });

          const labelMarker = L.marker([y + chunkSize / 2, x + chunkSize / 2], {
            icon: label,
          });

          // Add the label to the grid layer
          gridLayer.addLayer(labelMarker);
        }
      }
    };

    // Add the grid layer to the map
    gridLayer.addTo(map);

    // Update the grid whenever the map moves or zooms
    map.on("move", updateGrid);
    map.on("zoom", updateGrid);

    // Initial grid update
    updateGrid();

    // Cleanup event listeners and remove the grid layer on unmount
    return () => {
      map.off("move", updateGrid);
      map.off("zoom", updateGrid);
      map.removeLayer(gridLayer);
    };
  }, [map]);

  return null; // This component does not render anything directly
};

export default ChunkGridLayer;
