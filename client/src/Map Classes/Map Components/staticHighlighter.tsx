import React, { useEffect, useState } from "react";
import { Rectangle, useMap } from "react-leaflet";
import * as leaflet from "leaflet";

interface StaticHighlightLayerProps {
  lat: number;
  lng: number;
  level: number; // Zoom level
}

const StaticHighlightLayer: React.FC<StaticHighlightLayerProps> = ({
  lat,
  lng,
  level,
}) => {
  const map = useMap();
  const [bounds, setBounds] = useState<leaflet.LatLngBounds | null>(null);

  // Calculate tile bounds based on lat, lng, and level
  const getTileBounds = (lat: number, lng: number) => {
    const interval = 1; // Tile size in degrees (adjust as needed)
    const x = Math.floor(lng - 0.5) + 0.5;
    const y = Math.floor(lat + 0.5) - 0.5;
    return new leaflet.LatLngBounds([y, x], [y + interval, x + interval]);
  };

  useEffect(() => {
    if (map.getZoom() >= level) {
      const tileBounds = getTileBounds(lat, lng);
      setBounds(tileBounds);
    } else {
      setBounds(null); // Clear highlight if zoom level doesn't match
    }
  }, [lat, lng, level, map]);

  return bounds ? (
    <Rectangle
      bounds={bounds}
      pathOptions={{
        stroke: true,
        color: "#ff0000", // Red border for the static highlight
        weight: 2,
        opacity: 0.7,
        fillColor: "#ff0000", // Red fill
        fillOpacity: 0.3,
      }}
    />
  ) : null;
};

export default StaticHighlightLayer;
