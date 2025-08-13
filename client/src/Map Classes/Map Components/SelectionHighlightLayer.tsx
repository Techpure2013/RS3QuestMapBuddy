import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export interface SelectionGeometry {
  type: "npc" | "object" | "none";
  location?: { lat: number; lng: number };
  locationArray?: { lat: number; lng: number }[];
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
  fillOpacity: 0.2,
  interactive: false,
};

const tileStyle = {
  ...radiusStyle,
  color: "#00FF00", // Bright Green for specific tiles
  fillOpacity: 0.4,
};

// This function now calculates the 1x1 bounds for a tile given its CENTER coordinate (e.g., 10.5)
const getTileBoundsFromCenter = (center: {
  lat: number;
  lng: number;
}): L.LatLngBounds => {
  return L.latLngBounds(
    [center.lat - 0.5, center.lng - 0.5],
    [center.lat + 0.5, center.lng + 0.5]
  );
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
    layerRef.current.clearLayers();

    if (geometry.type === "none") return;

    // Draw the radius if it exists and is valid
    if (
      geometry.radius &&
      (geometry.radius.bottomLeft.lat !== 0 ||
        geometry.radius.bottomLeft.lng !== 0)
    ) {
      // The radius stores the CENTER of the corner tiles. We expand by 0.5 to get the true edges.
      // Note: Smaller 'lat' is higher up.
      const bounds = L.latLngBounds(
        [
          geometry.radius.topRight.lat - 0.5,
          geometry.radius.bottomLeft.lng - 0.5,
        ],
        [
          geometry.radius.bottomLeft.lat + 0.5,
          geometry.radius.topRight.lng + 0.5,
        ]
      );
      L.rectangle(bounds, radiusStyle).addTo(layerRef.current);
    }

    // Draw the specific location tiles
    if (
      geometry.type === "npc" &&
      geometry.location &&
      (geometry.location.lat !== 0 || geometry.location.lng !== 0)
    ) {
      const tileBounds = getTileBoundsFromCenter(geometry.location);
      L.rectangle(tileBounds, tileStyle).addTo(layerRef.current);
    } else if (geometry.type === "object" && geometry.locationArray) {
      geometry.locationArray.forEach((loc) => {
        if (loc.lat !== 0 || loc.lng !== 0) {
          const tileBounds = getTileBoundsFromCenter(loc);
          L.rectangle(tileBounds, tileStyle).addTo(layerRef.current);
        }
      });
    }
  }, [geometry, map]);

  return null;
};
