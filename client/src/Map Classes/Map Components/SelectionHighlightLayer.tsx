import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export interface SelectionGeometry {
  type: "npc" | "object" | "none";
  location?: { lat: number; lng: number };
  locationArray?: {
    lat: number;
    lng: number;
    color: string;
    numberLabel?: string; // Optional number/label for object points
  }[];
  radius?: {
    bottomLeft: { lat: number; lng: number };
    topRight: { lat: number; lng: number };
  };
}

interface SelectionHighlightLayerProps {
  geometry: SelectionGeometry;
}

const radiusStyle = {
  color: "#00FFFF", // Bright Cyan for radius
  weight: 2,
  opacity: 0.9,
  fillOpacity: 0.3,
  interactive: false,
};

const tileStyle = {
  ...radiusStyle,
  color: "#00FF00", // Default color for NPCs
  fillOpacity: 0.7, // High opacity for single tiles
};

// Helper to convert stored integer coordinates to visual .5 coordinates for drawing
const convertStoredToVisual = (coord: { lat: number; lng: number }) => {
  const visualY = coord.lat - 0.5;
  const visualX = coord.lng + 0.5;
  return { lat: visualY, lng: visualX };
};

// Helper to get the drawing bounds for a single tile from its visual center
const getTileBoundsFromVisualCenter = (visualCenter: {
  lat: number;
  lng: number;
}): L.LatLngBounds => {
  const interval = 1;
  const y = visualCenter.lat;
  const x = visualCenter.lng;
  return L.latLngBounds([y, x], [y + interval, x + interval]);
};

export const SelectionHighlightLayer: React.FC<
  SelectionHighlightLayerProps
> = ({ geometry }) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!layerRef.current) {
      layerRef.current = new L.LayerGroup().addTo(map);
    }
    // Clear previous drawings on every update
    layerRef.current.clearLayers();

    if (geometry.type === "none") return;

    // Draw the radius/area if it exists (works for both NPCs and Objects)
    if (
      geometry.radius &&
      (geometry.radius.bottomLeft.lat !== 0 ||
        geometry.radius.bottomLeft.lng !== 0)
    ) {
      const topLeftVisualCenter = convertStoredToVisual(
        geometry.radius.bottomLeft
      );
      const bottomRightVisualCenter = convertStoredToVisual(
        geometry.radius.topRight
      );

      // Calculate the full bounds from the top-left corner of the top-left tile
      // to the bottom-right corner of the bottom-right tile.
      const bounds = L.latLngBounds(
        [bottomRightVisualCenter.lat + 1, topLeftVisualCenter.lng], // South-West corner
        [topLeftVisualCenter.lat, bottomRightVisualCenter.lng + 1] // North-East corner
      );
      L.rectangle(bounds, radiusStyle).addTo(layerRef.current);
    }

    // Draw the single location for an NPC
    if (
      geometry.type === "npc" &&
      geometry.location &&
      (geometry.location.lat !== 0 || geometry.location.lng !== 0)
    ) {
      const visualCenter = convertStoredToVisual(geometry.location);
      const tileBounds = getTileBoundsFromVisualCenter(visualCenter);
      L.rectangle(tileBounds, tileStyle).addTo(layerRef.current);
    }
    // Draw the array of locations for an Object
    else if (geometry.type === "object" && geometry.locationArray) {
      geometry.locationArray.forEach((loc) => {
        if (loc.lat !== 0 || loc.lng !== 0) {
          const visualCenter = convertStoredToVisual(loc);
          const tileBounds = getTileBoundsFromVisualCenter(visualCenter);

          // Use the color stored with the point, with a fallback
          const pointColor = loc.color || "#FF00FF"; // Default to magenta
          const pointStyle = {
            ...tileStyle,
            color: pointColor,
            fillColor: pointColor,
          };

          // 1. Draw the colored tile background
          L.rectangle(tileBounds, pointStyle).addTo(layerRef.current);

          // 2. If a numberLabel exists, create and add a text marker on top
          if (loc.numberLabel) {
            const numberIcon = L.divIcon({
              className: "object-number-label", // Uses the CSS you added
              html: `<span>${loc.numberLabel}</span>`,
              iconSize: [20, 20],
              iconAnchor: [10, 10], // Center the icon on the coordinate
            });

            // Position the marker in the exact center of the tile
            const markerPosition: L.LatLngTuple = [
              visualCenter.lat + 0.5,
              visualCenter.lng + 0.5,
            ];

            L.marker(markerPosition, {
              icon: numberIcon,
              interactive: false, // Make it non-clickable
            }).addTo(layerRef.current);
          }
        }
      });
    }
  }, [geometry, map]);

  return null; // This component only adds layers to the map, it doesn't render any JSX.
};
