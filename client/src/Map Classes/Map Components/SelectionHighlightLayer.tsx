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
  // Added for context within the rendering loop
  objName?: string;
  imageOverride?: string;
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
    objectLocation: Omit<ObjectLocation, "objName" | "imageOverride">[];
    imageOverride?: string;
    objectRadius: {
      bottomLeft: { lat: number; lng: number };
      topRight: { lat: number; lng: number };
    };
  }[];
}

interface SelectionHighlightLayerProps {
  geometry: SelectionGeometry;
  pane: string;
}

// --- HELPER FUNCTIONS ---
const getImageUrl = (
  name: string,
  type: "npc" | "object",
  explicitOverride?: string
): string => {
  if (explicitOverride) return explicitOverride;
  const key = Object.keys(chatheadOverrides).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  if (key) return (chatheadOverrides as any)[key].split("?")[0];
  const formattedName = name.replace(/\s+/g, "_");
  return type === "npc"
    ? `https://runescape.wiki/images/${formattedName}_chathead.png`
    : `https://runescape.wiki/images/${formattedName}.png`;
};

const createChatheadIcon = (resizedDataUrl: string) =>
  L.divIcon({
    className: "chathead-icon",
    html: `<div style="width:48px; height:48px; display:flex; align-items:center; justify-content:center; background-color:rgba(0,0,0,0.5); border-radius:50%; border:1px solid #888; box-sizing:border-box;"><img src="${resizedDataUrl}" style="max-width:100%; max-height:100%; image-rendering:pixelated;" /></div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });

const createObstacleIcon = (resizedDataUrl: string) => {
  const displaySize = 48;
  // Define styles that will be applied to the div.
  const style = `
    width: ${displaySize}px;
    height: ${displaySize}px;
    background-image: url('${resizedDataUrl}');
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border-radius: 8px;
    border: 2px solid #a3a3a3;
    box-shadow: 0 1px 4px rgba(0,0,0,0.4);
    background-color: rgba(0,0,0,0.5);
  `;

  return L.divIcon({
    className: "obstacle-icon", // Keep a base class if needed for global CSS
    html: `<div style="${style}"></div>`, // Apply the styles directly to the div
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
    // FIX IS HERE: Added curly braces to ensure the cleanup function returns void.
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map]);

  useEffect(() => {
    let isActive = true; // Guard against race conditions from stale renders

    if (!layerRef.current) {
      layerRef.current = new L.LayerGroup().addTo(map);
    }
    const currentLayer = layerRef.current;
    currentLayer.clearLayers();

    if (geometry.type === "none") {
      return;
    }
    const radiusStyle = {
      color: "#00FFFF",
      weight: 2,
      opacity: 0.9,
      fillOpacity: 0.3,
      interactive: false,
      pane: "selectionRadiusPane",
    };
    if (geometry.type === "npc" && geometry.npcArray) {
      geometry.npcArray.forEach((npc) => {
        const point = npc.npcLocation;
        if (point.lat === -16.5 && point.lng === 16.5) return;
        const imageUrl = getImageUrl(npc.npcName, "npc", npc.chatheadOverride);
        const wikiSearchUrl = `https://runescape.wiki/w/Special:Search?search=${encodeURIComponent(
          npc.npcName
        )}`;
        const popupContent = `<b>${npc.npcName}</b><br><a href="${wikiSearchUrl}" target="_blank" rel="noopener noreferrer">Search on Wiki</a>`;
        resizeImageToDataUrl(imageUrl, 40)
          .then((resizedDataUrl) => {
            if (isActive) {
              const icon = createChatheadIcon(resizedDataUrl);
              L.marker([point.lat + 0.5, point.lng + 0.5], { icon, pane })
                .bindPopup(popupContent)
                .addTo(currentLayer);
            }
          })
          .catch(() => {
            if (isActive) {
              const tileBounds = L.latLngBounds(
                [point.lat, point.lng],
                [point.lat + 1, point.lng + 1]
              );
              L.rectangle(tileBounds, {
                color: "#00FF00",
                weight: 1,
                fillOpacity: 0.7,
                pane,
              }).addTo(currentLayer);
            }
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
          if (isActive) L.rectangle(bounds, radiusStyle).addTo(currentLayer);
        }
      });
    }

    if (geometry.type === "object" && geometry.objectArray) {
      const radiusStyle = {
        color: "#00FFFF",
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.3,
        interactive: false,
        pane,
      };
      const fallbackPoints = new Map<string, ObjectLocation>();
      const promises: Promise<void>[] = [];

      geometry.objectArray.forEach((obj) => {
        obj.objectLocation.forEach((loc) => {
          if (loc.lat === -16.5 && loc.lng === 16.5) return;
          const point: ObjectLocation = {
            ...loc,
            objName: obj.name,
            imageOverride: obj.imageOverride,
          };
          const imageUrl = getImageUrl(
            point.objName!,
            "object",
            point.imageOverride
          );
          const wikiSearchUrl = `https://runescape.wiki/w/Special:Search?search=${encodeURIComponent(
            point.objName!
          )}`;
          const popupContent = `<b>${point.objName}</b><br><a href="${wikiSearchUrl}" target="_blank" rel="noopener noreferrer">Search on Wiki</a>`;

          const promise = resizeImageToDataUrl(imageUrl, 48)
            .then((resizedDataUrl) => {
              if (isActive) {
                const icon = createObstacleIcon(resizedDataUrl);
                L.marker([point.lat + 0.5, point.lng + 0.5], { icon, pane })
                  .bindPopup(popupContent)
                  .addTo(currentLayer);
              }
            })
            .catch(() => {
              fallbackPoints.set(`${point.lng},${point.lat}`, point);
            });
          promises.push(promise);
        });

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
          if (isActive) L.rectangle(bounds, radiusStyle).addTo(currentLayer);
        }
      });

      Promise.allSettled(promises).then(() => {
        if (!isActive || fallbackPoints.size === 0) return;

        const fallbackLayer = L.layerGroup().addTo(currentLayer);
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
          const baseColor =
            startPoint.color || (groupLabel ? "#A855F7" : "#C77C48");
          const fillStyle = {
            stroke: false,
            fill: true,
            fillColor: baseColor,
            fillOpacity: 0.85,
            pane,
          };
          const borderInlineStyle = {
            color: baseColor,
            weight: 2,
            opacity: 1.0,
            pane,
          };
          const borderCasingStyle = {
            color: "#000000",
            weight: 4,
            opacity: 0.6,
            pane,
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
              currentIsland.reduce((s, l) => s + l.lat, 0) /
              currentIsland.length;
            const centerLng =
              currentIsland.reduce((s, l) => s + l.lng, 0) /
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
              html: `<div class="object-label-container"><span class="object-label-text" style="font-size: ${dynamicFontSize}px;">${groupLabel}</span></div>`,
            });
            L.marker([centerLat + 0.5, centerLng + 0.5], {
              icon: labelIcon,
              interactive: false,
              pane: "selectionRadiusPane",
            }).addTo(fallbackLayer);
          }
        }
      });
    }

    return () => {
      isActive = false;
    };
  }, [geometry, map, pane, zoom]);

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
