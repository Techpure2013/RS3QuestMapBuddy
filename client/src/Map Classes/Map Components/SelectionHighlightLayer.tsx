import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { resizeImageToDataUrl } from "./imageDisplayUtils";
import chatheadOverrides from "./../Map Data/chatheadOverrides.json";

// --- INTERFACES ---
interface ObjectLocation {
  lat: number;
  lng: number;
  color?: string;
  numberLabel?: string;
}

export interface SelectionGeometry {
  type: "npc" | "object" | "none";
  npcArray?: {
    npcName: string;
    npcLocation: { lat: number; lng: number };
    chatheadOverride?: string;
    wanderRadius: {
      bottomLeft: { lat: number; lng: number };
      topRight: { lat: number; lng: number };
    };
  }[];
  objectArray?: {
    name: string;
    objectLocation: ObjectLocation[];
    imageOverride?: string;
    objectRadius: {
      bottomLeft: { lat: number; lng: number };
      topRight: { lat: number; lng: number };
    };
  }[];
}

interface SelectionHighlightLayerProps {
  geometry: SelectionGeometry;
}

// --- STYLES ---
const radiusStyle = {
  color: "#00FFFF",
  weight: 2,
  opacity: 0.9,
  fillOpacity: 0.3,
  interactive: false,
};

const tileStyle = {
  ...radiusStyle,
  color: "#00FF00",
  fillOpacity: 0.7,
};

// --- HELPER FUNCTIONS ---

/**
 * Creates the bounds for a 1x1 tile based on its visual center coordinate.
 * This matches the logic in HighlightLayer.tsx.
 */
const getTileBoundsFromVisualCenter = (visualCenter: {
  lat: number;
  lng: number;
}): L.LatLngBounds => {
  const interval = 1;
  const y = visualCenter.lat;
  const x = visualCenter.lng;
  return L.latLngBounds([y, x], [y + interval, x + interval]);
};

const getImageUrl = (
  name: string,
  type: "npc" | "object",
  explicitOverride?: string
): string => {
  if (explicitOverride) {
    return explicitOverride.includes("/images/")
      ? explicitOverride.split("?")[0]
      : `https://runescape.wiki/images/${explicitOverride.replace(
          /\s+/g,
          "_"
        )}.png`;
  }
  const key = Object.keys(chatheadOverrides).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  if (key) {
    const url = (chatheadOverrides as any)[key];
    return url.split("?")[0];
  }
  const formattedName = name.replace(/\s+/g, "_");
  if (type === "npc") {
    return `https://runescape.wiki/images/${formattedName}_chathead.png`;
  } else {
    return `https://runescape.wiki/images/${formattedName}.png`;
  }
};

const createChatheadIcon = (resizedDataUrl: string) => {
  const displaySize = 48;
  return L.divIcon({
    className: "chathead-icon",
    html: `
      <div style="width:${displaySize}px; height:${displaySize}px; display:flex; align-items:center; justify-content:center; background-color:rgba(0,0,0,0.5); border-radius:50%; border:1px solid #888; box-sizing:border-box;">
        <img src="${resizedDataUrl}" style="max-width:100%; max-height:100%; image-rendering:pixelated;" />
      </div>`,
    iconSize: [displaySize, displaySize],
    iconAnchor: [displaySize / 2, displaySize / 2],
    popupAnchor: [0, -displaySize / 2],
  });
};

const createObjectIcon = (resizedDataUrl: string) => {
  const displaySize = 48;
  return L.divIcon({
    className: "object-icon",
    html: `
      <div style="width:${displaySize}px; height:${displaySize}px; display:flex; align-items:center; justify-content:center; background-color:rgba(0,0,0,0.5); border-radius:8px; border:1px solid #888; box-sizing:border-box;">
        <img src="${resizedDataUrl}" style="max-width:90%; max-height:90%; object-fit:contain;" />
      </div>`,
    iconSize: [displaySize, displaySize],
    iconAnchor: [displaySize / 2, displaySize / 2],
    popupAnchor: [0, -displaySize / 2],
  });
};

// --- MAIN COMPONENT ---
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

    // CHANGE: The generic `renderPoints` function has been removed.
    // WHY: NPCs and Objects have different fallback rendering logic when an
    // image fails to load. Handling them in separate blocks is cleaner and
    // prevents applying object-specific styles (like custom colors) to NPCs.

    if (geometry.type === "npc" && geometry.npcArray) {
      geometry.npcArray.forEach((npc) => {
        const point = npc.npcLocation;
        if (point.lat === -16.5 && point.lng === 16.5) return;

        const visualCenter = point;
        const tileBounds = getTileBoundsFromVisualCenter(visualCenter);
        const imageUrl = getImageUrl(npc.npcName, "npc", npc.chatheadOverride);

        resizeImageToDataUrl(imageUrl, 40)
          .then((resizedDataUrl) => {
            const icon = createChatheadIcon(resizedDataUrl);
            const marker = L.marker(
              [visualCenter.lat + 0.5, visualCenter.lng + 0.5],
              { icon }
            ).bindPopup(`<b>${npc.npcName}</b>`);
            layerRef.current?.addLayer(marker);
          })
          .catch(() => {
            // NPC Fallback: Always draw a default green square.
            L.rectangle(tileBounds, tileStyle).addTo(layerRef.current!);
          });

        // Wander radius logic (unchanged)
        if (
          npc.wanderRadius &&
          (npc.wanderRadius.bottomLeft.lat !== 0 ||
            npc.wanderRadius.topRight.lat !== 0)
        ) {
          const bounds = L.latLngBounds(
            [
              npc.wanderRadius.topRight.lat + 0.5,
              npc.wanderRadius.bottomLeft.lng + 0.5,
            ],
            [
              npc.wanderRadius.bottomLeft.lat - 0.5,
              npc.wanderRadius.topRight.lng + 1.5,
            ]
          );
          L.rectangle(bounds, radiusStyle).addTo(layerRef.current!);
        }
      });
    }

    if (geometry.type === "object" && geometry.objectArray) {
      geometry.objectArray.forEach((obj) => {
        // Loop through each location for the object
        obj.objectLocation.forEach((point) => {
          if (point.lat === -16.5 && point.lng === 16.5) return;

          const visualCenter = point;
          const tileBounds = getTileBoundsFromVisualCenter(visualCenter);
          const imageUrl = getImageUrl(obj.name, "object", obj.imageOverride);

          resizeImageToDataUrl(imageUrl, 40)
            .then((resizedDataUrl) => {
              const icon = createObjectIcon(resizedDataUrl);
              const marker = L.marker(
                [visualCenter.lat + 0.5, visualCenter.lng + 0.5],
                { icon }
              ).bindPopup(`<b>${obj.name}</b>`);
              layerRef.current?.addLayer(marker);
            })
            .catch(() => {
              // OBJECT Fallback: Use the custom color and number label.
              // This is the logic that was missing and is now correctly applied.
              const pointStyle = {
                ...tileStyle,
                color: point.color || "#00FF00",
                fillColor: point.color || "#00FF00",
              };
              L.rectangle(tileBounds, pointStyle).addTo(layerRef.current!);

              if (point.numberLabel) {
                const labelIcon = L.divIcon({
                  className: "object-number-label",
                  html: `<div>${point.numberLabel}</div>`,
                  iconSize: [32, 32],
                  iconAnchor: [16, 16],
                });
                L.marker([visualCenter.lat + 0.5, visualCenter.lng + 0.5], {
                  icon: labelIcon,
                }).addTo(layerRef.current!);
              }
            });
        });

        // Object radius logic (unchanged)
        if (
          obj.objectRadius &&
          (obj.objectRadius.bottomLeft.lat !== 0 ||
            obj.objectRadius.topRight.lat !== 0)
        ) {
          const bounds = L.latLngBounds(
            [
              obj.objectRadius.topRight.lat + 0.5,
              obj.objectRadius.bottomLeft.lng + 0.5,
            ],
            [
              obj.objectRadius.bottomLeft.lat - 0.5,
              obj.objectRadius.topRight.lng + 1.5,
            ]
          );
          L.rectangle(bounds, radiusStyle).addTo(layerRef.current!);
        }
      });
    }
  }, [geometry, map]);

  return null;
};
