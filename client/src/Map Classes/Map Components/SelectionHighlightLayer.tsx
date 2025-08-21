import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import chatheadOverrides from "./../Map Data/chatheadOverrides.json";

// --- FIX #2: Define the structure for an individual object location ---
interface ObjectLocation {
  lat: number;
  lng: number;
  color?: string;
  numberLabel?: string;
}
// --------------------------------------------------------------------

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
    // This now uses our new, more detailed type
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

const getChatheadUrl = (npcName: string) => {
  const key = Object.keys(chatheadOverrides).find(
    (k) => k.toLowerCase() === npcName.toLowerCase()
  );

  if (key) {
    let url = (chatheadOverrides as any)[key];
    if (url.includes("/images/")) return url;
    if (url.includes("#/media/File:")) {
      const match = url.match(/File:(.*?)(?:$|#|\/)/);
      if (match && match[1]) {
        const fileName = match[1].replace(/ /g, "_");
        return `https://runescape.wiki/images/${fileName}`;
      }
    }
    if (url.includes("/w/")) {
      const parts = url.split("/w/");
      if (parts[1]) {
        const fileName = parts[1].replace(/ /g, "_");
        return `https://runescape.wiki/images/${fileName}_chathead.png`;
      }
    }
    return url;
  }

  const formatted = npcName.replace(/\s+/g, "_");
  return `https://runescape.wiki/images/${formatted}_chathead.png`;
};
const resizeImage = (imageUrl: string, maxSize: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return reject(new Error("Could not get canvas context"));
      }

      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        }
      } else {
        if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/png"));
    };

    img.onerror = (err) => {
      reject(new Error("Failed to load image for resizing"));
    };

    img.src = imageUrl;
  });
};

const createChatheadIcon = (resizedDataUrl: string) => {
  const displaySize = 48;
  return L.divIcon({
    className: "chathead-icon",
    html: `
      <div style="
        width: ${displaySize}px; 
        height: ${displaySize}px; 
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: rgba(0, 0, 0, 0.5);
        border-radius: 50%;
        border: 1px solid #888;
        box-sizing: border-box;
      ">
        <img 
          src="${resizedDataUrl}" 
          style="
            max-width: 100%; 
            max-height: 100%;
            image-rendering: pixelated;
          " 
        />
      </div>
    `,
    iconSize: [displaySize, displaySize],
    iconAnchor: [displaySize / 2, displaySize / 2],
    popupAnchor: [0, -displaySize / 2],
  });
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

    if (geometry.type === "npc" && geometry.npcArray) {
      geometry.npcArray.forEach((npc) => {
        if (
          npc.wanderRadius &&
          (npc.wanderRadius.bottomLeft.lat !== 0 ||
            npc.wanderRadius.bottomLeft.lng !== 0 ||
            npc.wanderRadius.topRight.lat !== 0 ||
            npc.wanderRadius.topRight.lng !== 0)
        ) {
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
          L.rectangle(bounds, radiusStyle).addTo(layerRef.current!);
        }

        if (npc.npcLocation.lat !== 0 || npc.npcLocation.lng !== 0) {
          const visualCenter = convertStoredToVisual(npc.npcLocation);
          const tileBounds = getTileBoundsFromVisualCenter(visualCenter);
          const tileCenter = tileBounds.getCenter();

          if (!npc.npcName || npc.npcName.length < 3) {
            L.rectangle(tileBounds, tileStyle).addTo(layerRef.current!);
            return;
          }

          const chatheadUrl =
            npc.chatheadOverride || getChatheadUrl(npc.npcName);

          resizeImage(chatheadUrl, 40)
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

    if (geometry.type === "object" && geometry.objectArray) {
      geometry.objectArray.forEach((obj) => {
        // --- FIX #3: Loop through each location and use its specific data ---
        obj.objectLocation.forEach((loc) => {
          if (loc.lat !== 0 || loc.lng !== 0) {
            const visualCenter = convertStoredToVisual(loc);
            const tileBounds = getTileBoundsFromVisualCenter(visualCenter);

            const pointStyle = {
              ...tileStyle,
              color: loc.color || "#FF00FF", // Use the location's color
              fillColor: loc.color || "#FF00FF",
            };
            L.rectangle(tileBounds, pointStyle).addTo(layerRef.current!);

            if (loc.numberLabel) {
              const labelIcon = L.divIcon({
                className: "object-number-label",
                html: `<div>${loc.numberLabel}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              });

              L.marker(tileBounds.getCenter(), { icon: labelIcon }).addTo(
                layerRef.current!
              );
            }
          }
        });
        // --------------------------------------------------------------------

        if (
          obj.objectRadius &&
          (obj.objectRadius.bottomLeft.lat !== 0 ||
            obj.objectRadius.bottomLeft.lng !== 0 ||
            obj.objectRadius.topRight.lat !== 0 ||
            obj.objectRadius.topRight.lng !== 0)
        ) {
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
          L.rectangle(bounds, radiusStyle).addTo(layerRef.current!);
        }
      });
    }
  }, [geometry, map]);

  return null;
};
