import React, { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { resizeImageToDataUrl } from "./imageDisplayUtils";
import chatheadOverrides from "./../Map Data/chatheadOverrides.json";
import { isEqual } from "lodash";

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
  pane: string; // The name of the map pane to render on.
}

// --- HELPER FUNCTIONS ---
const getImageUrl = (
  name: string,
  type: "npc" | "object",
  explicitOverride?: string
): string => {
  if (explicitOverride) {
    return explicitOverride;
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

const createObstacleIcon = (resizedDataUrl: string) => {
  const displaySize = 48;
  return L.divIcon({
    className: "obstacle-icon",
    html: `
      <div class="obstacle-icon-frame">
        <img src="${resizedDataUrl}" class="obstacle-icon-image" />
      </div>
    `,
    iconSize: [displaySize, displaySize],
    iconAnchor: [displaySize / 2, displaySize / 2],
    popupAnchor: [0, -displaySize / 2],
  });
};

// --- MAIN COMPONENT ---
const SelectionHighlightLayerComponent: React.FC<
  SelectionHighlightLayerProps
> = ({ geometry, pane }) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [zoom, setZoom] = useState(map.getZoom());

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map]);

  useEffect(() => {
    // Define styles dynamically within the effect to use the `pane` prop.
    const radiusStyle = {
      color: "#00FFFF",
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.3,
      interactive: false,
      pane: pane,
    };

    const tileStyle = {
      color: "#00FF00",
      weight: 1,
      fillColor: "#00FF00",
      fillOpacity: 0.7,
      pane: pane,
    };

    if (!layerRef.current) {
      layerRef.current = new L.LayerGroup().addTo(map);
    }
    layerRef.current.clearLayers();

    if (geometry.type === "none") return;

    if (geometry.type === "npc" && geometry.npcArray) {
      geometry.npcArray.forEach((npc) => {
        const point = npc.npcLocation;
        if (point.lat === -16.5 && point.lng === 16.5) return;
        const visualCenter = point;
        const tileBounds = L.latLngBounds(
          [visualCenter.lat, visualCenter.lng],
          [visualCenter.lat + 1, visualCenter.lng + 1]
        );
        const imageUrl = getImageUrl(npc.npcName, "npc", npc.chatheadOverride);
        resizeImageToDataUrl(imageUrl, 40)
          .then((resizedDataUrl) => {
            const icon = createChatheadIcon(resizedDataUrl);
            const marker = L.marker(
              [visualCenter.lat + 0.5, visualCenter.lng + 0.5],
              { icon, pane: pane }
            ).bindPopup(`<b>${npc.npcName}</b>`);
            layerRef.current?.addLayer(marker);
          })
          .catch(() => {
            L.rectangle(tileBounds, tileStyle).addTo(layerRef.current!);
          });
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
      const iconLayer = L.layerGroup().addTo(layerRef.current);
      const fallbackLayer = L.layerGroup().addTo(layerRef.current);
      const radiusLayer = L.layerGroup().addTo(layerRef.current);

      const fallbackPoints = new Map<string, ObjectLocation>();
      const allPoints = geometry.objectArray.flatMap((obj) =>
        obj.objectLocation.map((loc) => ({
          ...loc,
          objName: obj.name,
          imageOverride: obj.imageOverride,
        }))
      );

      allPoints.forEach((point) => {
        if (point.lat === -16.5 && point.lng === 16.5) return;

        if (point.imageOverride) {
          resizeImageToDataUrl(point.imageOverride, 48).then(
            (resizedDataUrl) => {
              const icon = createObstacleIcon(resizedDataUrl);
              L.marker([point.lat + 0.5, point.lng + 0.5], {
                icon,
                pane: pane,
              })
                .bindPopup(`<b>${point.objName}</b>`)
                .addTo(iconLayer);
            }
          );
        } else {
          fallbackPoints.set(`${point.lng},${point.lat}`, point);
        }
      });

      geometry.objectArray.forEach((obj) => {
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
          L.rectangle(bounds, radiusStyle).addTo(radiusLayer);
        }
      });

      const unvisited = new Set(fallbackPoints.keys());
      while (unvisited.size > 0) {
        const startKey = unvisited.values().next().value;
        const startPoint = fallbackPoints.get(startKey)!;

        const targetStyleKey = `${startPoint.color || "path"}_${
          startPoint.numberLabel || ""
        }`;

        const currentIsland: ObjectLocation[] = [];
        const queue = [startKey];
        unvisited.delete(startKey);

        while (queue.length > 0) {
          const currentKey = queue.shift()!;
          const currentPoint = fallbackPoints.get(currentKey)!;
          currentIsland.push(currentPoint);

          const { lng, lat } = currentPoint;
          const neighbors = [
            `${lng},${lat - 1}`,
            `${lng},${lat + 1}`,
            `${lng - 1},${lat}`,
            `${lng + 1},${lat}`,
          ];

          neighbors.forEach((neighborKey) => {
            if (unvisited.has(neighborKey)) {
              const neighborPoint = fallbackPoints.get(neighborKey)!;
              const neighborStyleKey = `${neighborPoint.color || "path"}_${
                neighborPoint.numberLabel || ""
              }`;
              if (neighborStyleKey === targetStyleKey) {
                unvisited.delete(neighborKey);
                queue.push(neighborKey);
              }
            }
          });
        }

        const islandCoordSet = new Set(
          currentIsland.map((loc) => `${loc.lng},${loc.lat}`)
        );
        const groupLabel = startPoint.numberLabel || "";

        const isAction = !!groupLabel;
        const baseColor =
          startPoint.color || (isAction ? "#A855F7" : "#C77C48");

        const fillStyle = {
          stroke: false,
          fill: true,
          fillColor: baseColor,
          fillOpacity: 0.85,
          pane: pane,
        };

        const borderInlineStyle = {
          color: baseColor,
          weight: 2,
          opacity: 1.0,
          pane: pane,
        };

        const borderCasingStyle = {
          color: "#000000",
          weight: 4,
          opacity: 0.6,
          pane: pane,
        };

        currentIsland.forEach((point) => {
          const tileBounds = L.latLngBounds(
            [point.lat, point.lng],
            [point.lat + 1, point.lng + 1]
          );
          L.rectangle(tileBounds, fillStyle).addTo(fallbackLayer);
        });

        currentIsland.forEach((point) => {
          const { lat, lng } = point;
          const tl = L.latLng(lat, lng),
            tr = L.latLng(lat, lng + 1);
          const bl = L.latLng(lat + 1, lng),
            br = L.latLng(lat + 1, lng + 1);

          if (!islandCoordSet.has(`${lng},${lat - 1}`)) {
            L.polyline([tl, tr], borderCasingStyle).addTo(fallbackLayer);
            L.polyline([tl, tr], borderInlineStyle).addTo(fallbackLayer);
          }
          if (!islandCoordSet.has(`${lng},${lat + 1}`)) {
            L.polyline([bl, br], borderCasingStyle).addTo(fallbackLayer);
            L.polyline([bl, br], borderInlineStyle).addTo(fallbackLayer);
          }
          if (!islandCoordSet.has(`${lng - 1},${lat}`)) {
            L.polyline([tl, bl], borderCasingStyle).addTo(fallbackLayer);
            L.polyline([tl, bl], borderInlineStyle).addTo(fallbackLayer);
          }
          if (!islandCoordSet.has(`${lng + 1},${lat}`)) {
            L.polyline([tr, br], borderCasingStyle).addTo(fallbackLayer);
            L.polyline([tr, br], borderInlineStyle).addTo(fallbackLayer);
          }
        });

        if (groupLabel) {
          const centerLat =
            currentIsland.reduce((sum, loc) => sum + loc.lat, 0) /
            currentIsland.length;
          const centerLng =
            currentIsland.reduce((sum, loc) => sum + loc.lng, 0) /
            currentIsland.length;

          const tileSizeAtZoom0 =
            map.project([1, 1], 0).x - map.project([0, 0], 0).x;
          const currentTileSize = tileSizeAtZoom0 * Math.pow(2, zoom);
          const dynamicFontSize = Math.max(
            8,
            Math.min(16, currentTileSize / 4.5)
          );

          const labelIcon = L.divIcon({
            className: "object-label-icon",
            iconSize: [currentTileSize, currentTileSize],
            iconAnchor: [currentTileSize / 2, currentTileSize / 2],
            html: `
              <div class="object-label-container">
                <span class="object-label-text" style="font-size: ${dynamicFontSize}px;">
                  ${groupLabel}
                </span>
              </div>
            `,
          });
          L.marker([centerLat + 0.5, centerLng + 0.5], {
            icon: labelIcon,
            interactive: false,
            pane: "selectionLabelPane", // Use the dedicated top-most pane for labels.
          }).addTo(fallbackLayer);
        }
      }
    }
  }, [geometry, map, zoom, pane]);

  return null;
};

export const SelectionHighlightLayer = React.memo(
  SelectionHighlightLayerComponent,
  (prevProps, nextProps) => {
    return (
      isEqual(prevProps.geometry, nextProps.geometry) &&
      prevProps.pane === nextProps.pane
    );
  }
);
