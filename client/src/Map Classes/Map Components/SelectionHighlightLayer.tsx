import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export interface SelectionGeometry {
  type: "npc" | "object" | "none";
  npcArray?: {
    npcName: string;
    npcLocation: { lat: number; lng: number };
    wanderRadius: {
      bottomLeft: { lat: number; lng: number };
      topRight: { lat: number; lng: number };
    };
  }[];
  objectArray?: {
    name: string;
    objectLocation: { lat: number; lng: number }[];
    objectRadius: {
      bottomLeft: { lat: number; lng: number };
      topRight: { lat: number; lng: number };
    };
  }[];
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

    // Draw NPCs
    if (geometry.type === "npc" && geometry.npcArray) {
      geometry.npcArray.forEach((npc) => {
        // NPC location tile
        if (npc.npcLocation.lat !== 0 || npc.npcLocation.lng !== 0) {
          const visualCenter = convertStoredToVisual(npc.npcLocation);
          const tileBounds = getTileBoundsFromVisualCenter(visualCenter);
          L.rectangle(tileBounds, tileStyle).addTo(layerRef.current);
        }

        // NPC wander radius
        if (npc.wanderRadius) {
          const topLeftVisualCenter = convertStoredToVisual(
            npc.wanderRadius.bottomLeft
          );
          const bottomRightVisualCenter = convertStoredToVisual(
            npc.wanderRadius.topRight
          );

          const bounds = L.latLngBounds(
            [bottomRightVisualCenter.lat + 1, topLeftVisualCenter.lng],
            [topLeftVisualCenter.lat, bottomRightVisualCenter.lng + 1]
          );
          L.rectangle(bounds, radiusStyle).addTo(layerRef.current);
        }
      });
    }

    // Draw Objects
    if (geometry.type === "object" && geometry.objectArray) {
      geometry.objectArray.forEach((obj) => {
        // Object locations
        obj.objectLocation.forEach((loc) => {
          if (loc.lat !== 0 || loc.lng !== 0) {
            const visualCenter = convertStoredToVisual(loc);
            const tileBounds = getTileBoundsFromVisualCenter(visualCenter);

            const pointStyle = {
              ...tileStyle,
              color: "#FF00FF", // Magenta for objects
              fillColor: "#FF00FF",
            };

            L.rectangle(tileBounds, pointStyle).addTo(layerRef.current);
          }
        });

        // Object radius
        if (obj.objectRadius) {
          const topLeftVisualCenter = convertStoredToVisual(
            obj.objectRadius.bottomLeft
          );
          const bottomRightVisualCenter = convertStoredToVisual(
            obj.objectRadius.topRight
          );

          const bounds = L.latLngBounds(
            [bottomRightVisualCenter.lat + 1, topLeftVisualCenter.lng],
            [topLeftVisualCenter.lat, bottomRightVisualCenter.lng + 1]
          );
          L.rectangle(bounds, radiusStyle).addTo(layerRef.current);
        }
      });
    }
  }, [geometry, map]);

  return null; // This component only adds layers to the map, it doesn't render any JSX.
};
