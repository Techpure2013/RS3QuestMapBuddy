import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { resizeImageToDataUrl } from "./imageDisplayUtils";
import chatheadOverrides from "./../Map Data/chatheadOverrides.json";

// ... (Interfaces remain the same)
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

// ... (Styles remain the same)
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

// This function is now ONLY used for converting the corners of radius areas.
const convertRadiusCornerToVisual = (coord: { lat: number; lng: number }) => {
  return { lat: coord.lat + 0.5, lng: coord.lng + 0.5 };
};

const getTileBoundsFromVisualCenter = (visualCenter: {
  lat: number;
  lng: number;
}): L.LatLngBounds => {
  const y = visualCenter.lat;
  const x = visualCenter.lng;
  const southWest = L.latLng(y - 0.5, x - 0.5);
  const northEast = L.latLng(y + 0.5, x + 0.5);
  return L.latLngBounds(southWest, northEast);
};

// ... (getImageUrl, createChatheadIcon, createObjectIcon functions are unchanged)
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

    // --- NPC & OBJECT RENDERING LOGIC ---
    // This logic now assumes it receives CORRECT visual center coordinates from App.tsx
    const renderPoints = (
      points: any[],
      type: "npc" | "object",
      name: string,
      override?: string
    ) => {
      points.forEach((point) => {
        if (point.lat === 0 && point.lng === 0) return;

        const visualCenter = point; // Use the coordinate directly
        const tileBounds = getTileBoundsFromVisualCenter(visualCenter);

        const imageUrl = getImageUrl(name, type, override);
        resizeImageToDataUrl(imageUrl, 40)
          .then((resizedDataUrl) => {
            const icon =
              type === "npc"
                ? createChatheadIcon(resizedDataUrl)
                : createObjectIcon(resizedDataUrl);
            const marker = L.marker([visualCenter.lat, visualCenter.lng], {
              icon,
            }).bindPopup(`<b>${name}</b>`);
            layerRef.current?.addLayer(marker);
          })
          .catch(() => {
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
              L.marker([visualCenter.lat, visualCenter.lng], {
                icon: labelIcon,
              }).addTo(layerRef.current!);
            }
          });
      });
    };

    if (geometry.type === "npc" && geometry.npcArray) {
      geometry.npcArray.forEach((npc) => {
        renderPoints(
          [npc.npcLocation],
          "npc",
          npc.npcName,
          npc.chatheadOverride
        );
        if (
          npc.wanderRadius &&
          (npc.wanderRadius.bottomLeft.lat !== 0 ||
            npc.wanderRadius.topRight.lat !== 0)
        ) {
          const bl = npc.wanderRadius.bottomLeft;
          const tr = npc.wanderRadius.topRight;

          const bounds = L.latLngBounds(
            [bl.lat, bl.lng], // bottom-left corner
            [tr.lat, tr.lng] // top-right corner
          );

          L.rectangle(bounds, radiusStyle).addTo(layerRef.current!);
        }
      });
    }

    if (geometry.type === "object" && geometry.objectArray) {
      geometry.objectArray.forEach((obj) => {
        renderPoints(obj.objectLocation, "object", obj.name, obj.imageOverride);
        if (
          obj.objectRadius &&
          (obj.objectRadius.bottomLeft.lat !== 0 ||
            obj.objectRadius.topRight.lat !== 0)
        ) {
          const bl = obj.objectRadius.bottomLeft;
          const tr = obj.objectRadius.topRight;

          const bounds = L.latLngBounds(
            [bl.lat, bl.lng], // bottom-left corner
            [tr.lat, tr.lng] // top-right corner
          );

          L.rectangle(bounds, radiusStyle).addTo(layerRef.current!);
        }
      });
    }
  }, [geometry, map]);

  return null;
};
