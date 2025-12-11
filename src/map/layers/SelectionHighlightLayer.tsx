// src/map/layers/SelectionHighlightLayer.tsx
import React, { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L, { type LatLngBounds, type PathOptions } from "leaflet";
import { resizeImageToDataUrlCached } from "./../../utils/cachedImageLoader";
import rawChatheadOverrides from "../Map Data/chatheadOverrides.json";
import { isEqual } from "lodash";
import { recordObservedChathead } from "./../../idb/chatheadsObserved";
import { useEditorSelector } from "../../state/useEditorSelector";
import { getApiBase } from "./../../utils/apiBase";

const chatheadOverrides: Record<string, string> =
  rawChatheadOverrides as Record<string, string>;

export interface ObjectLocationRender {
  lat: number;
  lng: number;
  color?: string;
  numberLabel?: string;
}
export interface NpcRenderItem {
  npcName: string;
  npcLocation: { lat: number; lng: number };
  wanderRadius: {
    bottomLeft: { lat: number; lng: number };
    topRight: { lat: number; lng: number };
  };
  id?: number;
}
export interface ObjectRenderItem {
  name: string;
  objectLocation: ObjectLocationRender[];
  objectRadius: {
    bottomLeft: { lat: number; lng: number };
    topRight: { lat: number; lng: number };
  };
}
export type SelectionGeometry =
  | { type: "none" }
  | { type: "npc"; npcArray: NpcRenderItem[] }
  | { type: "object"; objectArray: ObjectRenderItem[] };

interface SelectionHighlightLayerProps {
  geometry: SelectionGeometry;
  pane: string;
  selectedIndex?: number;
  isActiveType?: boolean;
  hoveredTargetIndex?: number | null;
  hoveredLocationIndex?: number | null;
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

const radiusStyle = {
  color: "#00FFFF",
  weight: 2,
  opacity: 0.9,
  fillOpacity: 0.3,
  interactive: false,
  pane: "selectionRadiusPane",
};

function ensurePane(map: L.Map, paneName: string): void {
  if (!paneName) return;
  if (!map.getPane(paneName)) {
    map.createPane(paneName);
    const p = map.getPane(paneName);
    if (p) {
      if (paneName === "highlightPane") {
        p.style.zIndex = "590";
        p.style.pointerEvents = "none";
      } else if (paneName === "selectionRadiusPane") {
        p.style.zIndex = "640";
        p.style.pointerEvents = "none";
      } else if (paneName === "selectionPane") {
        p.style.zIndex = "650";
        p.style.pointerEvents = "none";
      } else if (paneName === "selectionLabelPane") {
        p.style.zIndex = "670";
        p.style.pointerEvents = "none";
      }
    }
  }
}

function extractVariantFromName(name: string): {
  baseName: string;
  detectedVariant: string | null;
} {
  const match = name.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return {
      baseName: match[1].trim(),
      detectedVariant: match[2].trim().toLowerCase(),
    };
  }
  return { baseName: name, detectedVariant: null };
}

type ChatheadLoadResult =
  | {
      success: true;
      dataUrl: string;
      source: "database" | "wiki";
      variant: string;
      reason?: string;
    }
  | { success: false; reason: string };

async function loadChatheadWithFallback(
  npcName: string,
  variant: string,
  npcId?: number
): Promise<ChatheadLoadResult> {
  const { baseName, detectedVariant } = extractVariantFromName(npcName);
  const finalVariant = variant || detectedVariant || "default";

  console.log(`🎯 Loading chathead:`, {
    npcName,
    baseName,
    npcId,
    requestedVariant: variant,
    detectedVariant,
    finalVariant,
  });

  const API_BASE = getApiBase();

  // STEP 1: Try database with npcId (preferred)
  if (typeof npcId === "number" && npcId > 0) {
    try {
      const dbUrl = `${API_BASE}/api/chatheads/sprite?npcId=${npcId}&variant=${encodeURIComponent(
        finalVariant
      )}`;
      console.log(`🔍 Trying DB by npcId: ${dbUrl}`);
      const dataUrl = await resizeImageToDataUrlCached(dbUrl, 40);
      console.log(
        `✅ Database hit by npcId: ${npcId}, variant: ${finalVariant}`
      );
      return {
        success: true,
        dataUrl,
        source: "database",
        variant: finalVariant,
      };
    } catch (err) {
      console.warn(
        `⚠️ Database miss by npcId: ${npcId}, variant: ${finalVariant}`,
        err instanceof Error ? err.message : err
      );
    }
  }

  // STEP 2: Try database with name
  try {
    const dbUrl = `${API_BASE}/api/chatheads/sprite?name=${encodeURIComponent(
      baseName
    )}&variant=${encodeURIComponent(finalVariant)}`;
    console.log(`🔍 Trying DB by name: ${dbUrl}`);
    const dataUrl = await resizeImageToDataUrlCached(dbUrl, 40);
    console.log(
      `✅ Database hit by name: "${baseName}", variant: ${finalVariant}`
    );
    return {
      success: true,
      dataUrl,
      source: "database",
      variant: finalVariant,
    };
  } catch (err) {
    console.warn(
      `⚠️ Database miss by name: "${baseName}", variant: ${finalVariant}`,
      err instanceof Error ? err.message : err
    );
  }

  // STEP 3: Wiki fallback (full name)
  try {
    const wikiUrl = getImageUrl(npcName, "npc");
    console.log(`🔍 Trying Wiki (full name): ${wikiUrl}`);
    const dataUrl = await resizeImageToDataUrlCached(wikiUrl, 40);
    console.log(`✅ Wiki hit (full name): "${npcName}"`);
    return { success: true, dataUrl, source: "wiki", variant: "wiki" };
  } catch (err) {
    console.warn(
      `⚠️ Wiki miss (full name): "${npcName}"`,
      err instanceof Error ? err.message : err
    );
  }

  // STEP 4: Wiki fallback (base name without parenthetical)
  if (baseName !== npcName) {
    try {
      const wikiUrl = getImageUrl(baseName, "npc");
      console.log(`🔍 Trying Wiki (base name): ${wikiUrl}`);
      const dataUrl = await resizeImageToDataUrlCached(wikiUrl, 40);
      console.log(`✅ Wiki hit (base name): "${baseName}"`);
      return { success: true, dataUrl, source: "wiki", variant: "wiki" };
    } catch (err) {
      console.warn(
        `⚠️ Wiki miss (base name): "${baseName}"`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.error(`❌ All sources exhausted for: "${npcName}" (npcId: ${npcId})`);
  return { success: false, reason: "All sources failed" };
}

const SelectionHighlightLayerComponent: React.FC<
  SelectionHighlightLayerProps
> = ({
  geometry,
  pane,
  selectedIndex = -1,
  isActiveType = false,
}) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const hoverLayerRef = useRef<L.LayerGroup | null>(null);
  const [zoom, setZoom] = useState<number>(map.getZoom());

  const chatheadVariant = useEditorSelector((s) => s.selection.chatheadVariant);
  // Get hover state from store
  const storeHoveredTargetType = useEditorSelector(
    (s) => s.selection.hoveredTargetType
  );
  const storeHoveredTargetIndex = useEditorSelector(
    (s) => s.selection.hoveredTargetIndex
  );
  const storeHoveredLocationIndex = useEditorSelector(
    (s) => s.selection.hoveredLocationIndex
  );

  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map]);

  // Separate effect for hover highlights - doesn't clear main layer
  useEffect(() => {
    ensurePane(map, "selectionPane");

    if (!hoverLayerRef.current) {
      hoverLayerRef.current = new L.LayerGroup().addTo(map);
    }
    const hoverLayer = hoverLayerRef.current;
    hoverLayer.clearLayers();

    // Only show hover if the geometry type matches the hovered type
    const shouldShowHover =
      isActiveType &&
      storeHoveredTargetIndex !== null &&
      ((geometry.type === "npc" && storeHoveredTargetType === "npc") ||
        (geometry.type === "object" && storeHoveredTargetType === "object"));

    if (!shouldShowHover) return;

    if (geometry.type === "npc" && storeHoveredTargetType === "npc") {
      const npc = geometry.npcArray[storeHoveredTargetIndex!];
      if (npc) {
        const point = npc.npcLocation;
        // Guard against invalid coordinates
        if (point && typeof point.lat === "number" && typeof point.lng === "number" && !isNaN(point.lat) && !isNaN(point.lng)) {
          // Use white if this is the selected NPC (already has green highlight), otherwise green
          const isAlreadySelected = storeHoveredTargetIndex === selectedIndex;
          const hoverColor = isAlreadySelected ? "#FFFFFF" : "#00FF00";
          const tileBounds = L.latLngBounds(
            [point.lat, point.lng],
            [point.lat + 1, point.lng + 1]
          );
          L.rectangle(tileBounds, {
            color: hoverColor,
            weight: 3,
            fillOpacity: 0,
            pane: "selectionPane",
            interactive: false,
          }).addTo(hoverLayer);
        }
      }
    } else if (
      geometry.type === "object" &&
      storeHoveredTargetType === "object"
    ) {
      const obj = geometry.objectArray[storeHoveredTargetIndex!];
      if (obj && storeHoveredLocationIndex !== null) {
        const loc = obj.objectLocation[storeHoveredLocationIndex];
        // Guard against invalid coordinates
        if (loc && typeof loc.lat === "number" && typeof loc.lng === "number" && !isNaN(loc.lat) && !isNaN(loc.lng)) {
          // Use white if this is the selected object (already has green highlight), otherwise green
          const isAlreadySelected = storeHoveredTargetIndex === selectedIndex;
          const hoverColor = isAlreadySelected ? "#FFFFFF" : "#00FF00";
          const tileBounds = L.latLngBounds(
            [loc.lat, loc.lng],
            [loc.lat + 1, loc.lng + 1]
          );
          L.rectangle(tileBounds, {
            color: hoverColor,
            weight: 3,
            fillOpacity: 0,
            pane: "selectionPane",
            interactive: false,
          }).addTo(hoverLayer);
        }
      }
    }

    return () => {
      if (hoverLayerRef.current) {
        hoverLayerRef.current.clearLayers();
      }
    };
  }, [
    map,
    geometry,
    isActiveType,
    storeHoveredTargetType,
    storeHoveredTargetIndex,
    storeHoveredLocationIndex,
    selectedIndex,
  ]);

  useEffect(() => {
    let isActive = true;

    ensurePane(map, pane);
    ensurePane(map, "selectionPane");
    ensurePane(map, "selectionRadiusPane");
    ensurePane(map, "selectionLabelPane");
    ensurePane(map, "highlightPane");

    if (!layerRef.current) {
      layerRef.current = new L.LayerGroup().addTo(map);
    }
    const currentLayer = layerRef.current;
    currentLayer.clearLayers();

    if (geometry.type === "none") return;

    switch (geometry.type) {
      case "npc": {
        console.log(
          `📊 Rendering ${geometry.npcArray.length} NPCs with variant: "${
            chatheadVariant || "default"
          }"`
        );

        geometry.npcArray.forEach((npc, index) => {
          const point = npc.npcLocation;
          const isSelected = isActiveType && index === selectedIndex;

          if (point.lat === -16.5 && point.lng === 16.5) {
            console.warn(`⏭️ Skipping invalid NPC location: ${npc.npcName}`);
            return;
          }

          const wikiSearchUrl = `https://runescape.wiki/w/Special:Search?search=${encodeURIComponent(
            npc.npcName
          )}`;
          const popupContent = `<b>${npc.npcName}</b>${
            npc.id ? `<br>ID: ${npc.id}` : ""
          }<br><a href="${wikiSearchUrl}" target="_blank" rel="noopener noreferrer">Search on Wiki</a>`;

          const npcKey = `${npc.id ?? npc.npcName}@${point.lat},${point.lng}:${
            chatheadVariant || "default"
          }`;

          (SelectionHighlightLayer as any)._npcTok ??= new Map<
            string,
            number
          >();
          const nextToken =
            ((SelectionHighlightLayer as any)._npcTok.get(npcKey) ?? 0) + 1;
          (SelectionHighlightLayer as any)._npcTok.set(npcKey, nextToken);
          const thisToken = nextToken;

          console.debug(
            `🎬 Starting load for NPC: ${npc.npcName} (token: ${thisToken})`
          );

          (async () => {
            if (!isActive) return;
            const result = await loadChatheadWithFallback(
              npc.npcName,
              chatheadVariant || "default",
              npc.id
            );
            if (!isActive) return;
            const currentToken = (SelectionHighlightLayer as any)._npcTok.get(
              npcKey
            );
            if (currentToken !== thisToken) {
              console.warn(`⏭️ Stale result ignored`);
              return;
            }

            if (result.success) {
              const icon = createChatheadIcon(result.dataUrl);
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
                npcId: npc.id,
                name: npc.npcName,
                variant: result.variant,
                sourceUrl:
                  result.source === "database"
                    ? "database"
                    : getImageUrl(npc.npcName, "npc"),
              });
            } else {
              console.error(
                `💥 Rendering fallback square for: ${npc.npcName}`,
                {
                  reason: result.reason,
                  npcId: npc.id,
                }
              );

              const tileBounds: LatLngBounds = L.latLngBounds(
                [point.lat, point.lng],
                [point.lat + 1, point.lng + 1]
              );
              L.rectangle(tileBounds, {
                color: isSelected ? "#00FF00" : "#00FFFF",
                weight: isSelected ? 3 : 1,
                fillOpacity: 0.7,
                pane,
              }).addTo(currentLayer);
            }
          })();

          const r = npc.wanderRadius;
          if (
            r &&
            (r.bottomLeft.lat !== 0 ||
              r.topRight.lat !== 0 ||
              r.bottomLeft.lng !== 0 ||
              r.topRight.lng !== 0)
          ) {
            const bounds = L.latLngBounds(
              [r.topRight.lat + 0.5, r.bottomLeft.lng + 0.5],
              [r.bottomLeft.lat - 0.5, r.topRight.lng + 1.5]
            );
            if (isActive)
              L.rectangle(bounds, {
                ...radiusStyle,
                pane: "selectionRadiusPane",
              }).addTo(currentLayer);
          }
        });
        break;
      }

      case "object": {
        console.log(`📊 Rendering ${geometry.objectArray.length} objects`);

        const fallbackPoints = new Map<
          string,
          ObjectLocationRender & { objIndex: number; locIndex: number; objectName: string }
        >();
        const promises: Promise<void>[] = [];

        geometry.objectArray.forEach((obj, objIndex) => {
          const isObjSelected = isActiveType && objIndex === selectedIndex;
          console.log(
            `🔧 Processing object: ${obj.name} with ${obj.objectLocation.length} locations (selected: ${isObjSelected})`
          );

          obj.objectLocation.forEach((loc, locIndex) => {
            // Skip invalid coordinates (NaN, null, undefined, or sentinel values)
            if (
              typeof loc.lat !== "number" ||
              typeof loc.lng !== "number" ||
              isNaN(loc.lat) ||
              isNaN(loc.lng) ||
              (loc.lat === -16.5 && loc.lng === 16.5)
            ) {
              console.warn(`⏭️ Skipping invalid object location: ${obj.name} at index ${locIndex}`);
              return;
            }

            const imageUrl = getImageUrl(obj.name, "object");
            const wikiSearchUrl = `https://runescape.wiki/w/Special:Search?search=${encodeURIComponent(
              obj.name
            )}`;
            const popupContent = `<b>${obj.name}</b><br><a href="${wikiSearchUrl}" target="_blank" rel="noopener noreferrer">Search on Wiki</a>`;

            console.log(
              `🖼️ Loading object image: ${obj.name} from ${imageUrl}`
            );

            const p = resizeImageToDataUrlCached(imageUrl, 48)
              .then((resizedDataUrl) => {
                if (!isActive) return;
                console.log(`✅ Object image loaded: ${obj.name}`);
                const icon = createObstacleIcon(resizedDataUrl);
                L.marker([loc.lat + 0.5, loc.lng + 0.5], {
                  icon,
                  pane,
                  zIndexOffset: isObjSelected ? 1000 : 0,
                })
                  .bindPopup(popupContent)
                  .addTo(currentLayer);

                // Add selection highlight circle for selected object
                if (isObjSelected) {
                  L.circle([loc.lat + 0.5, loc.lng + 0.5], {
                    radius: 0.7,
                    color: "#00FF00",
                    weight: 3,
                    fillOpacity: 0,
                    pane: "selectionPane",
                    interactive: false,
                  }).addTo(currentLayer);
                }
              })
              .catch((err) => {
                console.warn(
                  `⚠️ Object image failed: ${obj.name}`,
                  err instanceof Error ? err.message : err
                );
                // Only add to fallback if coordinates are valid
                if (typeof loc.lat === "number" && typeof loc.lng === "number" && !isNaN(loc.lat) && !isNaN(loc.lng)) {
                  fallbackPoints.set(`${loc.lng},${loc.lat}`, {
                    ...loc,
                    objIndex,
                    locIndex,
                    objectName: obj.name,
                  });
                }
              });

            promises.push(p);
          });

          const r = obj.objectRadius;
          if (
            r &&
            typeof r.bottomLeft?.lat === "number" &&
            typeof r.bottomLeft?.lng === "number" &&
            typeof r.topRight?.lat === "number" &&
            typeof r.topRight?.lng === "number" &&
            !isNaN(r.bottomLeft.lat) &&
            !isNaN(r.bottomLeft.lng) &&
            !isNaN(r.topRight.lat) &&
            !isNaN(r.topRight.lng) &&
            (r.bottomLeft.lat !== 0 ||
              r.topRight.lat !== 0 ||
              r.bottomLeft.lng !== 0 ||
              r.topRight.lng !== 0)
          ) {
            const bounds = L.latLngBounds(
              [r.topRight.lat + 0.5, r.bottomLeft.lng + 0.5],
              [r.bottomLeft.lat - 0.5, r.topRight.lng + 1.5]
            );
            if (isActive)
              L.rectangle(bounds, {
                ...radiusStyle,
                pane: "selectionRadiusPane",
              }).addTo(currentLayer);
          }
        });

        Promise.allSettled(promises).then(() => {
          if (!isActive || fallbackPoints.size === 0) return;

          const fallbackLayer = L.layerGroup().addTo(currentLayer);

          // Build a coord set of ALL fallback points for border detection
          const allCoordsSet = new Set(
            Array.from(fallbackPoints.values()).map((loc) => `${loc.lng},${loc.lat}`)
          );

          // Track which labels we've already added
          const addedLabels = new Set<string>();

          // Render each tile individually
          Array.from(fallbackPoints.values()).forEach((point) => {
            // Skip points with invalid coordinates
            if (typeof point.lat !== "number" || typeof point.lng !== "number" || isNaN(point.lat) || isNaN(point.lng)) {
              return;
            }

            const displayLabel = point.numberLabel || "";
            const baseColor =
              point.color || (displayLabel ? "#A855F7" : "#C77C48");

            // Check if this point belongs to a selected object
            const isPointSelected =
              isActiveType && point.objIndex === selectedIndex;

            const fillStyle: PathOptions & { pane: string } = {
              stroke: false,
              fill: true,
              fillColor: baseColor,
              fillOpacity: 0.85,
              pane,
            };
            const borderInlineStyle: PathOptions & { pane: string } = {
              color: isPointSelected ? "#00FF00" : baseColor,
              weight: isPointSelected ? 3 : 2,
              opacity: 1.0,
              pane,
            };
            const borderCasingStyle: PathOptions & { pane: string } = {
              color: "#000000",
              weight: isPointSelected ? 5 : 4,
              opacity: 0.6,
              pane,
            };

            // Draw tile fill
            const tileBounds = L.latLngBounds(
              [point.lat, point.lng],
              [point.lat + 1, point.lng + 1]
            );
            L.rectangle(tileBounds, fillStyle).addTo(fallbackLayer);

            // Draw borders only on edges (where there's no adjacent tile)
            const { lat, lng } = point;
            const tl = L.latLng(lat, lng);
            const tr = L.latLng(lat, lng + 1);
            const bl = L.latLng(lat + 1, lng);
            const br = L.latLng(lat + 1, lng + 1);

            if (!allCoordsSet.has(`${lng},${lat - 1}`)) {
              L.polyline([tl, tr], borderCasingStyle).addTo(fallbackLayer);
              L.polyline([tl, tr], borderInlineStyle).addTo(fallbackLayer);
            }
            if (!allCoordsSet.has(`${lng},${lat + 1}`)) {
              L.polyline([bl, br], borderCasingStyle).addTo(fallbackLayer);
              L.polyline([bl, br], borderInlineStyle).addTo(fallbackLayer);
            }
            if (!allCoordsSet.has(`${lng - 1},${lat}`)) {
              L.polyline([tl, bl], borderCasingStyle).addTo(fallbackLayer);
              L.polyline([tl, bl], borderInlineStyle).addTo(fallbackLayer);
            }
            if (!allCoordsSet.has(`${lng + 1},${lat}`)) {
              L.polyline([tr, br], borderCasingStyle).addTo(fallbackLayer);
              L.polyline([tr, br], borderInlineStyle).addTo(fallbackLayer);
            }
          });

          // Add labels - one per unique object, positioned at center of ALL tiles for that object
          // If any tile in the object has a numberLabel, use that as the label text
          Array.from(fallbackPoints.values()).forEach((point) => {
            const objectName = point.objectName;
            // Skip if we've already processed this object
            if (addedLabels.has(objectName)) return;

            addedLabels.add(objectName);

            // Find ALL tiles for this object (with valid coordinates)
            const allTilesForObject = Array.from(fallbackPoints.values()).filter(
              (p) => p.objectName === objectName &&
                typeof p.lat === "number" && typeof p.lng === "number" &&
                !isNaN(p.lat) && !isNaN(p.lng)
            );

            // Skip if no valid tiles found
            if (allTilesForObject.length === 0) return;

            // Find the first numberLabel from any tile in this object
            const labelText = allTilesForObject.find((p) => p.numberLabel)?.numberLabel || "";

            // Only show label if at least one tile has a numberLabel
            if (!labelText) return;

            // Calculate bounding box of ALL tiles for this object
            const minLat = Math.min(...allTilesForObject.map((l) => l.lat));
            const maxLat = Math.max(...allTilesForObject.map((l) => l.lat));
            const minLng = Math.min(...allTilesForObject.map((l) => l.lng));
            const maxLng = Math.max(...allTilesForObject.map((l) => l.lng));

            // Center of bounding box (tiles span from coord to coord+1)
            const centerLat = (minLat + maxLat + 1) / 2;
            const centerLng = (minLng + maxLng + 1) / 2;

            const tileSizeAtZoom0 =
              map.project([1, 1], 0).x - map.project([0, 0], 0).x;
            const currentTileSize = tileSizeAtZoom0 * Math.pow(2, zoom);

            const dynamicFontSize = Math.max(
              8,
              Math.min(16, currentTileSize / 4.5)
            );

            // Simple centered label at the bounding box center of ALL tiles with this label
            const labelIcon = L.divIcon({
              className: "object-label-icon",
              iconSize: [0, 0],
              iconAnchor: [0, 0],
              html: `<div style="position: absolute; transform: translate(-50%, -50%); white-space: nowrap;"><span style="font-size: ${dynamicFontSize}px; color: #000000; font-weight: bold; text-shadow: -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff, 0 0 4px rgba(255,255,255,0.8);">${labelText}</span></div>`,
            });
            L.marker([centerLat, centerLng], {
              icon: labelIcon,
              interactive: false,
              pane: "selectionLabelPane",
            }).addTo(fallbackLayer);
          });
        });
        break;
      }
    }

    return () => {
      isActive = false;
      observedKeys.clear();
      if (layerRef.current) {
        layerRef.current.clearLayers();
      }
    };
  }, [
    geometry,
    map,
    pane,
    zoom,
    isActiveType,
    selectedIndex,
    chatheadVariant,
  ]);

  return null;
};

export const SelectionHighlightLayer = React.memo(
  SelectionHighlightLayerComponent,
  (prevProps, nextProps) => {
    return (
      isEqual(prevProps.geometry, nextProps.geometry) &&
      prevProps.pane === nextProps.pane &&
      prevProps.selectedIndex === nextProps.selectedIndex &&
      prevProps.isActiveType === nextProps.isActiveType
    );
  }
);
