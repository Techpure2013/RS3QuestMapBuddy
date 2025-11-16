// src/map/layers/SelectionHighlightLayer.tsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useMap } from "react-leaflet";
import L, { type LatLngBounds, type PathOptions } from "leaflet";
import { resizeImageToDataUrl } from "../utils/imageDisplayUtils";
import { resizeImageToDataUrlCached } from "./../../utils/cachedImageLoader";
import rawChatheadOverrides from "../Map Data/chatheadOverrides.json";
import { isEqual } from "lodash";
import { recordObservedChathead } from "./../../idb/chatheadsObserved";

// Typed overrides map
const chatheadOverrides: Record<string, string> =
  rawChatheadOverrides as Record<string, string>;

// Render-time object point (already in visual space)
export interface ObjectLocationRender {
  lat: number;
  lng: number;
  color?: string;
  numberLabel?: string;
}

// Render-time NPC item
export interface NpcRenderItem {
  npcName: string;
  npcLocation: { lat: number; lng: number };

  wanderRadius: {
    bottomLeft: { lat: number; lng: number };
    topRight: { lat: number; lng: number };
  };
}

// Render-time Object item
export interface ObjectRenderItem {
  name: string;
  objectLocation: ObjectLocationRender[];
  objectRadius: {
    bottomLeft: { lat: number; lng: number };
    topRight: { lat: number; lng: number };
  };
}

// Discriminated union for geometry
export type SelectionGeometry =
  | { type: "none" }
  | { type: "npc"; npcArray: NpcRenderItem[] }
  | { type: "object"; objectArray: ObjectRenderItem[] };

interface SelectionHighlightLayerProps {
  geometry: SelectionGeometry;
  pane: string;
  selectedIndex?: number; // NEW: which item in the array is selected
  isActiveType?: boolean;
}

const observedKeys = new Set<string>();

function observeOnce({
  npcId,
  name,
  variant,
  sourceUrl,
}: {
  npcId?: number;
  name?: string;
  variant: string;
  sourceUrl: string;
}) {
  const key = `${npcId ?? name ?? "?"}|${variant}|${sourceUrl}`;
  if (observedKeys.has(key)) return;
  observedKeys.add(key);
  void recordObservedChathead({ npcId, name, variant, sourceUrl });
}

// Helpers
const getImageUrl = (
  name: string,
  type: "npc" | "object",
  explicitOverride?: string
): string => {
  if (explicitOverride) return explicitOverride;
  const key = Object.keys(chatheadOverrides).find(
    (k) => k.toLowerCase() === name.toLowerCase()
  );
  if (key) return chatheadOverrides[key].split("?")[0];
  const formattedName = name.replace(/\s+/g, "_");
  return type === "npc"
    ? `https://runescape.wiki/images/${formattedName}_chathead.png`
    : `https://runescape.wiki/images/${formattedName}.png`;
};

const createChatheadIcon = (resizedDataUrl: string): L.DivIcon =>
  L.divIcon({
    className: "chathead-icon",
    html: `<div style="width:48px; height:48px; display:flex; align-items:center; justify-content:center; background-color:rgba(0,0,0,0.5); border-radius:50%; border:1px solid #888; box-sizing:border-box;"><img src="${resizedDataUrl}" style="max-width:100%; max-height:100%; image-rendering:pixelated;" /></div>`,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
    popupAnchor: [0, -24],
  });

const createObstacleIcon = (resizedDataUrl: string): L.DivIcon => {
  const displaySize = 48;
  const style = `width: ${displaySize}px; height: ${displaySize}px; background-image: url('${resizedDataUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat; border-radius: 8px; border: 2px solid #a3a3a3; box-shadow: 0 1px 4px rgba(0,0,0,0.4); background-color: rgba(0,0,0,0.5);`;
  return L.divIcon({
    className: "obstacle-icon",
    html: `<div style="${style}"></div>`,
    iconSize: [displaySize, displaySize],
    iconAnchor: [displaySize / 2, displaySize / 2],
    popupAnchor: [0, -displaySize / 2],
  });
};

// Style types
const radiusStyle = {
  color: "#00FFFF",
  weight: 2,
  opacity: 0.9,
  fillOpacity: 0.3,
  interactive: false,
  pane: "selectionRadiusPane",
};

const SelectionHighlightLayerComponent: React.FC<
  SelectionHighlightLayerProps
> = ({ geometry, pane, selectedIndex = -1, isActiveType = false }) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const [zoom, setZoom] = useState<number>(map.getZoom());

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map]);

  useEffect(() => {
    let isActive = true;

    if (!layerRef.current) {
      layerRef.current = new L.LayerGroup().addTo(map);
    }
    const currentLayer = layerRef.current;
    currentLayer.clearLayers();

    if (geometry.type === "none") return;

    switch (geometry.type) {
      case "npc": {
        geometry.npcArray.forEach((npc, index) => {
          const point = npc.npcLocation;
          const isSelected = isActiveType && index === selectedIndex;
          // Skip sentinel value, if any
          if (point.lat === -16.5 && point.lng === 16.5) return;

          const imageUrl = getImageUrl(npc.npcName, "npc");
          const wikiSearchUrl = `https://runescape.wiki/w/Special:Search?search=${encodeURIComponent(
            npc.npcName
          )}`;
          const popupContent = `<b>${npc.npcName}</b><br><a href="${wikiSearchUrl}" target="_blank" rel="noopener noreferrer">Search on Wiki</a>`;

          // USE CACHED VERSION HERE
          resizeImageToDataUrlCached(imageUrl, 40)
            .then((resizedDataUrl) => {
              if (!isActive) return;
              const icon = createChatheadIcon(resizedDataUrl);
              L.marker([point.lat + 0.5, point.lng + 0.5], {
                icon,
                pane,
                zIndexOffset: isSelected ? 1000 : 0,
              })
                .bindPopup(popupContent)
                .addTo(currentLayer);
              if (isSelected) {
                L.circle([point.lat + 0.5, point.lng + 0.5], {
                  radius: 0.7,
                  color: "#00FF00",
                  weight: 3,
                  fillOpacity: 0,
                  pane: "selectionPane",
                  interactive: false,
                }).addTo(currentLayer);
              }
              observeOnce({
                name: npc.npcName,
                variant: "default",
                sourceUrl: imageUrl,
              });
            })
            .catch(() => {
              if (!isActive) return;
              const tileBounds: LatLngBounds = L.latLngBounds(
                [point.lat, point.lng],
                [point.lat + 1, point.lng + 1]
              );
              L.rectangle(tileBounds, {
                color: isSelected ? "#00FF00" : "#00FFFF", // Green if selected
                weight: isSelected ? 3 : 1,
                fillOpacity: 0.7,
                pane,
              }).addTo(currentLayer);
            });

          const r = npc.wanderRadius;
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
        break;
      }

      case "object": {
        // If the icon fetch fails, we draw filled tiles islands and borders
        const fallbackPoints = new Map<string, ObjectLocationRender>();
        const promises: Promise<void>[] = [];

        geometry.objectArray.forEach((obj) => {
          obj.objectLocation.forEach((loc) => {
            if (loc.lat === -16.5 && loc.lng === 16.5) return;

            const imageUrl = getImageUrl(obj.name, "object");
            const wikiSearchUrl = `https://runescape.wiki/w/Special:Search?search=${encodeURIComponent(
              obj.name
            )}`;
            const popupContent = `<b>${obj.name}</b><br><a href="${wikiSearchUrl}" target="_blank" rel="noopener noreferrer">Search on Wiki</a>`;

            // USE CACHED VERSION HERE
            const p = resizeImageToDataUrlCached(imageUrl, 48)
              .then((resizedDataUrl) => {
                if (!isActive) return;
                const icon = createObstacleIcon(resizedDataUrl);
                L.marker([loc.lat + 0.5, loc.lng + 0.5], { icon, pane })
                  .bindPopup(popupContent)
                  .addTo(currentLayer);
              })
              .catch(() => {
                // Collect into fallback set to paint tiles later
                fallbackPoints.set(`${loc.lng},${loc.lat}`, loc);
              });

            promises.push(p);
          });

          const r = obj.objectRadius;
          if (
            r.bottomLeft.lat !== 0 ||
            r.topRight.lat !== 0 ||
            r.bottomLeft.lng !== 0 ||
            r.topRight.lng !== 0
          ) {
            const bounds = L.latLngBounds(
              [r.topRight.lat + 0.5, r.bottomLeft.lng + 0.5],
              [r.bottomLeft.lat - 0.5, r.topRight.lng + 1.5]
            );
            if (isActive) L.rectangle(bounds, radiusStyle).addTo(currentLayer);
          }
        });

        Promise.allSettled(promises).then(() => {
          if (!isActive || fallbackPoints.size === 0) return;

          const fallbackLayer = L.layerGroup().addTo(currentLayer);
          const unvisited = new Set(fallbackPoints.keys());

          // Group connected tiles by style key (color+label)
          while (unvisited.size > 0) {
            const startKey = unvisited.values().next().value as string;
            const startPoint = fallbackPoints.get(startKey)!;
            const targetStyleKey = `${startPoint.color || "path"}_${
              startPoint.numberLabel || ""
            }`;
            const currentIsland: ObjectLocationRender[] = [];
            const queue: string[] = [startKey];
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

            const fillStyle: PathOptions & { pane: string } = {
              stroke: false,
              fill: true,
              fillColor: baseColor,
              fillOpacity: 0.85,
              pane,
            };
            const borderInlineStyle: PathOptions & { pane: string } = {
              color: baseColor,
              weight: 2,
              opacity: 1.0,
              pane,
            };
            const borderCasingStyle: PathOptions & { pane: string } = {
              color: "#000000",
              weight: 4,
              opacity: 0.6,
              pane,
            };

            // Fill tiles
            currentIsland.forEach((point) => {
              const tileBounds = L.latLngBounds(
                [point.lat, point.lng],
                [point.lat + 1, point.lng + 1]
              );
              L.rectangle(tileBounds, fillStyle).addTo(fallbackLayer);
            });

            // Borders
            currentIsland.forEach((point) => {
              const { lat, lng } = point;
              const tl = L.latLng(lat, lng);
              const tr = L.latLng(lat, lng + 1);
              const bl = L.latLng(lat + 1, lng);
              const br = L.latLng(lat + 1, lng + 1);
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

            // Label
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
                pane: "selectionLabelPane",
              }).addTo(fallbackLayer);
            }
          }
        });
        break;
      }
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
