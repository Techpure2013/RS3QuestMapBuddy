import React, { useEffect, useState } from "react";
import { Rectangle, useMap } from "react-leaflet";
import * as leaflet from "leaflet";

interface HighlightLayerProps {
  onCursorMove: (x: number, y: number) => void;
}
const HighlightLayer: React.FC<HighlightLayerProps> = ({ onCursorMove }) => {
  const map = useMap();
  const [currentTile, setCurrentTile] = useState<leaflet.LatLngBounds | null>(
    null
  );
  const [zoom, setZoom] = useState(map.getZoom());

  // Calculate tile bounds from mouse position
  const getTileBounds = (latlng: leaflet.LatLng) => {
    const interval = 1;
    const x = Math.floor(latlng.lng - 0.5) + 0.5;
    const y = Math.floor(latlng.lat + 0.5) - 0.5;
    onCursorMove(x, y);
    return new leaflet.LatLngBounds([y, x], [y + interval, x + interval]);
  };

  // Mouse move handler
  useEffect(() => {
    let lastTile = "";

    const handleMove = (e: leaflet.LeafletMouseEvent) => {
      if (zoom < -3) {
        setCurrentTile(null);
        return;
      }

      const bounds = getTileBounds(e.latlng);
      const tileKey = `${bounds.getSouthWest().lng}_${
        bounds.getSouthWest().lat
      }`;

      if (tileKey !== lastTile) {
        setCurrentTile(bounds);
        lastTile = tileKey;
      }
    };
    const handleZoom = () => {
      setZoom(map.getZoom());
      setCurrentTile(null); // Clear highlight on zoom important
    };

    map.on("mousemove", handleMove);
    map.on("zoomend", handleZoom);

    return () => {
      map.off("mousemove", handleMove);
      map.off("zoomend", handleZoom);
    };
  }, [map, zoom]);

  return currentTile && zoom >= 1 ? (
    <Rectangle
      bounds={currentTile}
      pathOptions={{
        stroke: true,
        color: "#ffffff",
        weight: 2,
        opacity: 0.7,
        fillColor: "#000000",
        fillOpacity: 0.3,
      }}
    />
  ) : null;
};
export default HighlightLayer;
