import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { resizeImageToDataUrl } from "./imageDisplayUtils";
import chatheadOverrides from "./../Map Data/chatheadOverrides.json";

// Define the structure for an individual object location
interface ObjectLocation {
  lat: number;
  lng: number;
  color?: string;
  numberLabel?: string;
  // isSelected logic has been removed for now to focus on the image issue
}

// Define the main geometry prop structure
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

const convertStoredToVisual = (coord: { lat: number; lng: number }) => {
  const visualY = coord.lat - 0.5;
  const visualX = coord.lng + 0.5;
  return { lat: visualY, lng: visualX };
};

const getTileBoundsFromVisualCenter = (visualCenter: {
  lat: number;
  lng: number;
}): L.LatLngBounds => {
  const interval = 1;
  const y = visualCenter.lat;
  const x = visualCenter.lng;
  return L.latLngBounds([y, x], [y + interval, x + interval]);
};

const getChatheadUrl = (npcName: string): string => {
  const key = Object.keys(chatheadOverrides).find(
    (k) => k.toLowerCase() === npcName.toLowerCase()
  );
  if (key) {
    let url = (chatheadOverrides as any)[key];
    if (url.includes("/images/")) return url;
    if (url.includes("#/media/File:")) {
      const match = url.match(/File:(.*?)(?:$|#|\/)/);
      if (match && match[1]) {
        return `https://runescape.wiki/images/${match[1].replace(/ /g, "_")}`;
      }
    }
    if (url.includes("/w/")) {
      const parts = url.split("/w/");
      if (parts[1]) {
        return `https://runescape.wiki/images/${parts[1].replace(
          / /g,
          "_"
        )}_chathead.png`;
      }
    }
    return url;
  }
  const formatted = npcName.replace(/\s+/g, "_");
  return `https://runescape.wiki/images/${formatted}_chathead.png`;
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

// --- THIS IS THE CORRECTED FUNCTION ---
const generateObjectImageUrl = (name: string): string => {
  // This robust function mimics the successful logic of getChatheadUrl
  // It can handle full URLs or just object names
  console.log(name);
  if (name.includes("#/media/File:")) {
    const match = name.match(/File:(.*?)(?:$|#|\/)/);
    if (match && match[1]) {
      console.log(match);
      return `https://runescape.wiki/images/${match[1].replace(/ /g, "_")}`;
    }
  }
  if (name.includes("/images/")) {
    return name.split("?")[0]; // Clean up potential query params
  }
  if (name.includes("/w/")) {
    const pageName = name.split("/w/")[1].split("#")[0];
    // The key difference: fallback to .png, not _chathead.png
    return `https://runescape.wiki/images/${pageName.replace(/ /g, "_")}.png`;
  }

  // Standard case: format the name and add the .png suffix
  const formatted = name.replace(/\s+/g, "_");
  console.log(formatted);
  return `https://runescape.wiki/images/${formatted}.png`;
};
// ------------------------------------

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

    // --- NPC RENDERING LOGIC (Unchanged) ---
    if (geometry.type === "npc" && geometry.npcArray) {
      geometry.npcArray.forEach((npc) => {
        if (
          npc.wanderRadius &&
          (npc.wanderRadius.bottomLeft.lat !== 0 ||
            npc.wanderRadius.topRight.lat !== 0)
        ) {
          const bl = convertStoredToVisual(npc.wanderRadius.bottomLeft);
          const tr = convertStoredToVisual(npc.wanderRadius.topRight);
          const bounds = L.latLngBounds(
            [tr.lat + 1, bl.lng],
            [bl.lat, tr.lng + 1]
          );
          L.rectangle(bounds, radiusStyle).addTo(layerRef.current!);
        }

        if (npc.npcLocation.lat !== 0 || npc.npcLocation.lng !== 0) {
          const visualCenter = convertStoredToVisual(npc.npcLocation);
          const tileBounds = getTileBoundsFromVisualCenter(visualCenter);
          const tileCenter = tileBounds.getCenter();

          if (!npc.npcName) {
            L.rectangle(tileBounds, tileStyle).addTo(layerRef.current!);
            return;
          }

          const chatheadUrl =
            npc.chatheadOverride || getChatheadUrl(npc.npcName);
          resizeImageToDataUrl(chatheadUrl, 40)
            .then((resizedDataUrl) => {
              const marker = L.marker([tileCenter.lat, tileCenter.lng], {
                icon: createChatheadIcon(resizedDataUrl),
              }).bindPopup(`<b>${npc.npcName}</b>`);
              layerRef.current?.addLayer(marker);
            })
            .catch(() => {
              L.rectangle(tileBounds, tileStyle).addTo(layerRef.current!);
            });
        }
      });
    }

    // --- OBJECT RENDERING LOGIC (Uses the new URL generator) ---
    if (geometry.type === "object" && geometry.objectArray) {
      geometry.objectArray.forEach((obj) => {
        (obj.objectLocation ?? []).forEach((loc) => {
          if (loc.lat !== 0 || loc.lng !== 0) {
            // --- FIX IS HERE ---
            // We no longer convert the object's location.
            // We use it directly because it's already pre-offset.
            const visualCenter = loc;
            // -------------------

            // The rest of the logic can now use the correct visualCenter
            const tileBounds = getTileBoundsFromVisualCenter(visualCenter);
            const imageUrl = generateObjectImageUrl(obj.name);

            resizeImageToDataUrl(imageUrl, 40)
              .then((resizedDataUrl) => {
                const marker = L.marker([visualCenter.lat, visualCenter.lng], {
                  icon: createObjectIcon(resizedDataUrl),
                }).bindPopup(`<b>${obj.name}</b>`);
                layerRef.current?.addLayer(marker);
              })
              .catch(() => {
                const pointStyle = {
                  ...tileStyle,
                  color: loc.color || "#00FF00",
                  fillColor: loc.color || "#00FF00",
                };
                L.rectangle(tileBounds, pointStyle).addTo(layerRef.current!);

                if (loc.numberLabel) {
                  const labelIcon = L.divIcon({
                    className: "object-number-label",
                    html: `<div>${loc.numberLabel}</div>`,
                    iconSize: [32, 32],
                    iconAnchor: [16, 16],
                  });
                  L.marker([visualCenter.lat, visualCenter.lng], {
                    icon: labelIcon,
                  }).addTo(layerRef.current!);
                }
              });
          }
        });

        if (
          obj.objectRadius &&
          (obj.objectRadius.bottomLeft.lat !== 0 ||
            obj.objectRadius.topRight.lat !== 0)
        ) {
          const bl = convertStoredToVisual(obj.objectRadius.bottomLeft);
          const tr = convertStoredToVisual(obj.objectRadius.topRight);
          const bounds = L.latLngBounds(
            [tr.lat + 1, bl.lng],
            [bl.lat, tr.lng + 1]
          );
          L.rectangle(bounds, radiusStyle).addTo(layerRef.current!);
        }
      });
    }
  }, [geometry, map]);

  return null;
};
