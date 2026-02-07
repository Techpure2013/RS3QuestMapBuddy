// src/app/map/InternalMapLayers.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { produce } from "immer";
import { useEditorSelector } from "../../state/useEditorSelector";
import { EditorStore } from "../../state/editorStore";
import {
  convertManualCoordToVisual,
  convertSearchedObjectCoordToVisual,
  convertSearchedNPCCoordToVisual,
} from "../../map/utils/coordinates";
import { HandleFloorIncreaseDecrease } from "../../map/utils/MapFunctions";
import { SelectionHighlightLayer } from "../../map/layers/SelectionHighlightLayer";
import TargetFlyToHandler from "./../../map/handlers/TargetFlyToHandler";
import { MapUIOverlay } from "../../map/overlay/MapUIOverlay";
import type { SelectionGeometry } from "../../map/layers/SelectionHighlightLayer";
import type {
  NpcHighlight,
  ObjectHighlight,
  ObjectLocationPoint,
} from "../../state/types";
import type { MapObject } from "./../sections/ObjectSearch";
import AreaFlyToHandler from "map/handlers/AreaFlyToHandler";
import NavReturnCaptureHandler from "map/handlers/NavReturnCaptureHandler";
import RestoreViewHandler from "map/handlers/RestoreViewHandler";
import SearchHighlightFlyToHandler from "map/handlers/SearchHighlightFlyToHandler";
import { PlotSubmissionRow } from "api/plotSubmissionsAdmin";
import { PathVisualizationLayer } from "../../map/layers/PathVisualizationLayer";
import { CollisionDebugLayer } from "../../map/layers/CollisionDebugLayer";
import { CollisionEditorLayer, useCollisionEditorState } from "../../map/layers/CollisionEditorLayer";
import { TransportEditorLayer, useTransportEditorState } from "../../map/layers/TransportEditorLayer";
import { TransportVisualizationLayer } from "../../map/layers/TransportVisualizationLayer";
import type { QuestPath } from "../../state/types";

const snapToTileCoordinate = (
  latlng: L.LatLng
): { lat: number; lng: number } => {
  const visualCenterX = Math.floor(latlng.lng - 0.5) + 0.5;
  const visualCenterY = Math.floor(latlng.lat + 0.5) - 0.5;
  const storedLng = visualCenterX - 0.5;
  const storedLat = visualCenterY + 0.5;
  return { lat: storedLat, lng: storedLng };
};
function submissionToGeometry(
  highlights: PlotSubmissionRow["basehighlights"]
): SelectionGeometry {
  const hasNpc = Array.isArray(highlights.npc) && highlights.npc.length > 0;
  const hasObj =
    Array.isArray(highlights.object) && highlights.object.length > 0;

  if (hasNpc) {
    return {
      type: "npc",
      npcArray: (highlights.npc ?? [])
        .filter(
          (n) =>
            n.npcLocation &&
            Number.isFinite(n.npcLocation.lat) &&
            Number.isFinite(n.npcLocation.lng)
        )
        .map((n) => ({
          npcName: n.npcName,
          npcLocation: {
            lat: n.npcLocation!.lat - 0.5,
            lng: n.npcLocation!.lng + 0.5,
          },
          wanderRadius: n.wanderRadius ?? {
            bottomLeft: { lat: 0, lng: 0 },
            topRight: { lat: 0, lng: 0 },
          },
        })),
    };
  }

  if (hasObj) {
    return {
      type: "object",
      objectArray: (highlights.object ?? []).map((o) => ({
        name: o.name,
        objectLocation: (o.objectLocation ?? []).map((p) => ({
          lat: p.lat - 0.5,
          lng: p.lng + 0.5,
          color: p.color,
          numberLabel: p.numberLabel,
        })),
        objectRadius: o.objectRadius ?? {
          bottomLeft: { lat: 0, lng: 0 },
          topRight: { lat: 0, lng: 0 },
        },
      })),
    };
  }

  return { type: "none" as const };
}

const SubmissionPreviewHandler: React.FC = () => {
  const map = useMap();
  const previewSub = useEditorSelector((s) => s.ui.previewSubmission);
  const lastIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!previewSub) {
      lastIdRef.current = null;
      return;
    }

    // Only fly if we swapped to a new ID
    if (previewSub.id === lastIdRef.current) return;
    lastIdRef.current = previewSub.id;

    const points: L.LatLngTuple[] = [];
    const push = (lat: number, lng: number) => {
      // visual center = stored + 0.5
      points.push([lat + 0.5, lng + 0.5]);
    };

    // Proposed
    previewSub.proposedhighlights.npc.forEach((n) => {
      if (n.npcLocation) push(n.npcLocation.lat, n.npcLocation.lng);
    });
    previewSub.proposedhighlights.object.forEach((o) => {
      o.objectLocation?.forEach((p) => push(p.lat, p.lng));
    });

    // Fallback to base
    if (points.length === 0) {
      previewSub.basehighlights.npc.forEach((n) => {
        if (n.npcLocation) push(n.npcLocation.lat, n.npcLocation.lng);
      });
      previewSub.basehighlights.object.forEach((o) => {
        o.objectLocation?.forEach((p) => push(p.lat, p.lng));
      });
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.flyToBounds(bounds, {
        padding: [100, 100],
        maxZoom: 5,
        duration: 0.8,
        animate: true,
      });
    }
  }, [previewSub, map]);

  if (!previewSub) return null;

  const baseGeom = submissionToGeometry(previewSub.basehighlights);
  const propGeom = submissionToGeometry(previewSub.proposedhighlights);

  return (
    <>
      {/* Render Proposed on Top (Selection Pane) */}
      <SelectionHighlightLayer
        pane="selectionPane"
        geometry={propGeom}
        isActiveType
        selectedIndex={-1}
      />
      {/* Render Base below (Highlight Pane) */}
      <SelectionHighlightLayer
        pane="highlightPane"
        geometry={baseGeom}
        isActiveType={false}
        selectedIndex={-1}
      />
    </>
  );
};
// FIXED: Better object search with multiple path attempts
async function searchObjectsNearCoord(
  coord: { lat: number; lng: number },
  floor: number,
  searchRadius: number = 10
): Promise<MapObject[]> {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const allObjects: MapObject[] = [];

  // Try multiple possible paths for each letter
  const basePaths = [
    "/Objects_By_Letter",
    "/public/Objects_By_Letter",
    "./Objects_By_Letter",
  ];

  for (const letter of letters) {
    let loaded = false;

    for (const basePath of basePaths) {
      if (loaded) break;

      try {
        const response = await fetch(`${basePath}/${letter}.json`);
        if (response.ok) {
          const data: MapObject[] = await response.json();
          allObjects.push(...data);
          loaded = true;
          break;
        }
      } catch (err) {
        continue;
      }
    }
  }

  // Filter objects within radius and on same floor
  const results = allObjects.filter((obj) => {
    if (obj.floor !== floor) return false;
    const distance = Math.sqrt(
      Math.pow(obj.lat - coord.lat, 2) + Math.pow(obj.lng - coord.lng, 2)
    );
    return distance <= searchRadius;
  });

  console.log(
    `✅ Found ${results.length} objects near {${coord.lat}, ${coord.lng}} on floor ${floor}`
  );
  return results;
}

const InternalMapLayers: React.FC = () => {
  const map = useMap();
  const quest = useEditorSelector((s) => s.quest);
  const selection = useEditorSelector((s) => s.selection);
  const ui = useEditorSelector((s) => s.ui);
  const highlights = useEditorSelector((s) => s.highlights);
  const isPreviewing = !!ui.previewSubmission;
  const selectedStep = selection.selectedStep;
  const targetType = selection.targetType;
  const targetIndex = selection.targetIndex;
  const floor = selection.floor;

  // Transport refresh counter - increment to trigger visualization refresh after creating/editing transports
  const [transportRefreshKey, setTransportRefreshKey] = useState(0);
  const handleTransportCreated = useCallback(() => {
    setTransportRefreshKey((k) => k + 1);
  }, []);

  const handleFloorChange = useCallback(
    (newFloor: number) => {
      if (!HandleFloorIncreaseDecrease(newFloor)) return;
      EditorStore.setSelection({ floor: newFloor });
      EditorStore.patchQuest((draft) => {
        const step = draft.questSteps[selectedStep];
        if (!step) return;

        // Set floor on the selected NPC or object
        if (targetType === "npc" && step.highlights.npc[targetIndex]) {
          step.highlights.npc[targetIndex].floor = newFloor;
        } else if (targetType === "object" && step.highlights.object[targetIndex]) {
          step.highlights.object[targetIndex].floor = newFloor;
        }
      });
    },
    [selectedStep, targetType, targetIndex]
  );

  const MapClickHandler: React.FC<{ disabled: boolean }> = ({ disabled }) => {
    const captureMode = useEditorSelector((s) => s.ui.captureMode);
    const currentTargetIndex = useEditorSelector((s) => s.selection.targetIndex);
    const currentTargetType = useEditorSelector((s) => s.selection.targetType);
    const transportEditMode = useEditorSelector((s) => s.ui.transportEditMode);
    const { enabled: collisionEditorEnabled } = useCollisionEditorState();
    const { enabled: transportEditorEnabled } = useTransportEditorState();

    // Reset first corner only when exiting radius mode or changing targets
    const prevCaptureModeRef = useRef(captureMode);
    const prevTargetIndexRef = useRef(currentTargetIndex);
    const prevTargetTypeRef = useRef(currentTargetType);

    useEffect(() => {
      const prevMode = prevCaptureModeRef.current;
      const prevIndex = prevTargetIndexRef.current;
      const prevType = prevTargetTypeRef.current;

      // Only reset if target changed OR if we left radius mode
      const targetChanged = prevIndex !== currentTargetIndex || prevType !== currentTargetType;
      const leftRadiusMode = prevMode === "radius" && captureMode !== "radius";

      if (targetChanged || leftRadiusMode) {
        EditorStore.setUi({ radiusFirstCorner: null });
      }

      prevCaptureModeRef.current = captureMode;
      prevTargetIndexRef.current = currentTargetIndex;
      prevTargetTypeRef.current = currentTargetType;
    }, [captureMode, currentTargetIndex, currentTargetType]);

    useMapEvents({
      click: async (e) => {
        if (disabled) return;

        // Skip normal click handling when collision editor, transport editor, or transport edit mode is active
        if (collisionEditorEnabled || transportEditorEnabled || transportEditMode) return;

        const snappedCoord = snapToTileCoordinate(e.latlng);
        const currentUi = EditorStore.getState().ui;

        // AREA SEARCH MODE
        if (currentUi.areaSearchMode === "object") {
          console.log("🔍 Area search clicked at:", snappedCoord);

          try {
            const results = await searchObjectsNearCoord(
              snappedCoord,
              floor,
              10
            );
            console.log(`📍 Found ${results.length} objects`);

            window.dispatchEvent(
              new CustomEvent("areaSearchResults", {
                detail: { results },
              })
            );

            EditorStore.setUi({ areaSearchMode: null });
          } catch (error) {
            console.error("❌ Area search failed:", error);
            alert("Failed to search for objects in this area");
          }

          return;
        }

        // MAP LOCATION RECORDING MODE - 3-click flow: center, corner1, corner2
        if (currentUi.mapLocationRecordMode) {
          const recordMode = currentUi.mapLocationRecordMode;

          if (recordMode === "center") {
            console.log("📍 Map Location: Center set at", snappedCoord);
            EditorStore.setUi({
              mapLocationCenter: snappedCoord,
              mapLocationRecordMode: "corner1",
            });
            window.dispatchEvent(new CustomEvent("mapLocationRecordProgress", {
              detail: { step: "center", coord: snappedCoord }
            }));
            return;
          }

          if (recordMode === "corner1") {
            console.log("📍 Map Location: Corner 1 set at", snappedCoord);
            EditorStore.setUi({
              mapLocationCorner1: snappedCoord,
              mapLocationRecordMode: "corner2",
            });
            window.dispatchEvent(new CustomEvent("mapLocationRecordProgress", {
              detail: { step: "corner1", coord: snappedCoord }
            }));
            return;
          }

          if (recordMode === "corner2") {
            const center = currentUi.mapLocationCenter;
            const corner1 = currentUi.mapLocationCorner1;

            if (!center || !corner1) {
              console.error("❌ Map Location: Missing center or corner1");
              EditorStore.setUi({ mapLocationRecordMode: null });
              return;
            }

            // Calculate bounds from corner1 and corner2
            const minLat = Math.min(corner1.lat, snappedCoord.lat);
            const maxLat = Math.max(corner1.lat, snappedCoord.lat);
            const minLng = Math.min(corner1.lng, snappedCoord.lng);
            const maxLng = Math.max(corner1.lng, snappedCoord.lng);

            console.log("📍 Map Location: Complete!", { center, bounds: [[minLat, minLng], [maxLat, maxLng]] });

            // Dispatch completion event with all data
            // Format: [lng, lat] to match AreaFlyToHandler expectations
            window.dispatchEvent(new CustomEvent("mapLocationRecordComplete", {
              detail: {
                center: [center.lng, center.lat],
                bounds: [[minLng, minLat], [maxLng, maxLat]],
              }
            }));

            // Reset recording mode
            EditorStore.setUi({
              mapLocationRecordMode: null,
              mapLocationCenter: null,
              mapLocationCorner1: null,
            });
            return;
          }
        }

        // NORMAL CAPTURE MODE LOGIC
        const mode = currentUi.captureMode;
        const sel = EditorStore.getState().selection;
        const rm = EditorStore.getState().ui.restrictedMode;

        if (rm?.enabled) {
          // Radius mode bypasses step restriction - user explicitly enabled it for current target
          const isRadiusMode = currentUi.captureMode === "radius" && rm.allowRadius;

          if (!isRadiusMode) {
            // Normal capture modes require step to match
            const allow =
              (sel.targetType === "npc" && rm.allowNpc) ||
              (sel.targetType === "object" && rm.allowObject);
            if (sel.selectedStep !== rm.stepIndex || !allow) {
              return;
            }
          }
        }

        // Handle radius first click BEFORE patchQuest
        if (mode === "radius") {
          const firstCorner = currentUi.radiusFirstCorner;
          if (!firstCorner) {
            // First click - store in UI state and return early
            EditorStore.setUi({ radiusFirstCorner: snappedCoord });
            return;
          }
        }

        EditorStore.patchQuest((draft) => {
          const sel = EditorStore.getState().selection;
          const step = draft.questSteps[sel.selectedStep];
          if (!step) return;
          step.floor = sel.floor;

          const highlightTarget =
            step.highlights[sel.targetType][sel.targetIndex];
          if (!highlightTarget) return;

          if (mode === "single") {
            if (sel.targetType === "npc") {
              (highlightTarget as NpcHighlight).npcLocation = snappedCoord;
            }
          } else if (mode === "multi-point") {
            if (sel.targetType === "object") {
              const t = highlightTarget as ObjectHighlight;
              const current = t.objectLocation || [];
              const isDuplicate = current.some(
                (loc) =>
                  loc.lat === snappedCoord.lat && loc.lng === snappedCoord.lng
              );
              if (isDuplicate) return;

              // READ STYLE FROM UI OUTSIDE THE Quest draft
              const uiState = EditorStore.getState().ui;
              const color = uiState.selectedObjectColor || "#FFFFFF";
              const numberLabel = uiState.objectNumberLabel || "";

              current.push({
                lat: snappedCoord.lat,
                lng: snappedCoord.lng,
                color,
                numberLabel,
              });
              t.objectLocation = current;
            }
          } else if (mode === "radius") {
            // Second click - first click was handled before patchQuest
            const firstCorner = EditorStore.getState().ui.radiusFirstCorner;
            if (!firstCorner) return; // Safety check

            const finalMinLat = Math.min(firstCorner.lat, snappedCoord.lat);
            const finalMaxLat = Math.max(firstCorner.lat, snappedCoord.lat);
            const finalMinLng = Math.min(firstCorner.lng, snappedCoord.lng);
            const finalMaxLng = Math.max(firstCorner.lng, snappedCoord.lng);
            const payload = {
              bottomLeft: { lat: finalMinLat, lng: finalMinLng },
              topRight: { lat: finalMaxLat, lng: finalMaxLng },
            };
            const radiusKey =
              sel.targetType === "npc" ? "wanderRadius" : "objectRadius";
            (highlightTarget as unknown as Record<string, unknown>)[radiusKey] =
              payload;
          } else if (mode === "wanderRadius") {
            if (sel.targetType === "npc") {
              const radius = EditorStore.getState().ui.wanderRadiusInput;
              const t = highlightTarget as NpcHighlight;
              t.npcLocation = snappedCoord;
              (
                t as unknown as {
                  wanderRadius: {
                    bottomLeft: { lat: number; lng: number };
                    topRight: { lat: number; lng: number };
                  };
                }
              ).wanderRadius = {
                bottomLeft: {
                  lat: snappedCoord.lat - radius,
                  lng: snappedCoord.lng - radius,
                },
                topRight: {
                  lat: snappedCoord.lat + radius,
                  lng: snappedCoord.lng + radius,
                },
              };
            }
            EditorStore.setUi({ captureMode: "single" });
          }
        });

        // Clear first corner and turn off radius mode after second click completes
        if (mode === "radius" && currentUi.radiusFirstCorner) {
          const sel = EditorStore.getState().selection;
          EditorStore.setUi({
            radiusFirstCorner: null,
            captureMode: sel.targetType === "npc" ? "single" : "multi-point",
          });
        }
      },
    });

    return null;
  };

  // Selection geometry remains unchanged...
  const npcGeometry = useMemo<SelectionGeometry>(() => {
    if (!quest) return { type: "none" };
    const step = quest.questSteps[selection.selectedStep];
    if (!step) return { type: "none" };

    const npcs = (step.highlights.npc ?? [])
      .map((npc, idx) => {
        // Only show NPC if its floor matches the current floor (default to 0 if not set)
        const npcFloor = npc.floor ?? 0;
        if (npcFloor !== floor) return null;

        const loc = convertManualCoordToVisual(npc.npcLocation);
        if (!loc || (loc.lat === 0 && loc.lng === 0)) return null;

        return {
          npcName: npc.npcName || `NPC ${idx + 1}`,
          npcLocation: { lat: loc.lat, lng: loc.lng },
          id: npc.id,
          wanderRadius: npc.wanderRadius || {
            bottomLeft: { lat: 0, lng: 0 },
            topRight: { lat: 0, lng: 0 },
          },
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return npcs.length > 0 ? { type: "npc", npcArray: npcs } : { type: "none" };
  }, [quest, selection.selectedStep, floor]);

  const objectGeometry = useMemo<SelectionGeometry>(() => {
    if (!quest) return { type: "none" };
    const step = quest.questSteps[selection.selectedStep];
    if (!step) return { type: "none" };

    const objects = (step.highlights.object ?? [])
      .map((obj, idx) => {
        // Only show object if its floor matches the current floor (default to 0 if not set)
        const objFloor = obj.floor ?? 0;
        if (objFloor !== floor) return null;

        const locations: ObjectLocationPoint[] = (obj.objectLocation ?? [])
          .map((p): ObjectLocationPoint | null => {
            const v = convertManualCoordToVisual({ lat: p.lat, lng: p.lng });
            if (!v) return null;
            return { ...p, lat: v.lat, lng: v.lng };
          })
          .filter(
            (p): p is ObjectLocationPoint =>
              p !== null && (p.lat !== 0 || p.lng !== 0)
          );

        if (locations.length === 0) return null;

        return {
          name: obj.name || `Object ${idx + 1}`,
          objectLocation: locations,
          objectRadius: obj.objectRadius ?? {
            bottomLeft: { lat: 0, lng: 0 },
            topRight: { lat: 0, lng: 0 },
          },
        };
      })
      .filter((o): o is NonNullable<typeof o> => o !== null);

    return objects.length > 0
      ? { type: "object", objectArray: objects }
      : { type: "none" };
  }, [quest, selection.selectedStep, floor]);

  // Extract paths from quest steps for visualization
  const questPaths = useMemo<QuestPath[]>(() => {
    if (!quest) return [];
    const paths: QuestPath[] = [];
    quest.questSteps.forEach((step, index) => {
      if (step.pathToStep && step.pathToStep.waypoints.length >= 2) {
        paths.push({
          ...step.pathToStep,
          toStepIndex: index,
        });
      }
    });
    return paths;
  }, [quest]);

  const highlightGeometry = useMemo<SelectionGeometry>(() => {
    const selObj = highlights.selectedObjectFromSearch;
    const hiNpc = highlights.highlightedNpc;
    const hiObj = highlights.highlightedObject;

    // Only show selected object from search if on the same floor
    if (selObj && selObj.floor === floor) {
      const visual = convertSearchedObjectCoordToVisual(selObj);
      return {
        type: "object",
        objectArray: [
          {
            name: selObj.name,
            objectLocation: visual ? [visual] : [],
            objectRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          },
        ],
      };
    }

    // Only show highlighted NPC if on the same floor
    if (hiNpc && hiNpc.floor === floor) {
      const visual = convertSearchedNPCCoordToVisual(hiNpc);
      return {
        type: "npc",
        npcArray: [
          {
            npcName: hiNpc.name,
            npcLocation: visual ?? { lat: 0, lng: 0 },
            wanderRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          },
        ],
      };
    }

    // Only show highlighted object if on the same floor
    if (hiObj && hiObj.floor === floor) {
      const visual = convertSearchedObjectCoordToVisual(hiObj);
      return {
        type: "object",
        objectArray: [
          {
            name: hiObj.name,
            objectLocation: visual ? [{ ...visual, color: "#00FFFF" }] : [],
            objectRadius: {
              bottomLeft: { lat: 0, lng: 0 },
              topRight: { lat: 0, lng: 0 },
            },
          },
        ],
      };
    }

    return { type: "none" };
  }, [highlights, floor]);

  return (
    <>
      <MapClickHandler disabled={false} />
      <SearchHighlightFlyToHandler />
      <NavReturnCaptureHandler />
      <RestoreViewHandler />
      <TargetFlyToHandler />
      <AreaFlyToHandler />
      <SelectionHighlightLayer
        geometry={npcGeometry}
        pane="selectionPane"
        selectedIndex={
          selection.targetType === "npc" ? selection.targetIndex : -1
        }
        isActiveType={selection.targetType === "npc"}
      />
      <SubmissionPreviewHandler />
      <SelectionHighlightLayer
        geometry={objectGeometry}
        pane="selectionPane"
        selectedIndex={
          selection.targetType === "object" ? selection.targetIndex : -1
        }
        isActiveType={selection.targetType === "object"}
      />
      <SelectionHighlightLayer
        geometry={highlightGeometry}
        pane="highlightPane"
      />
      {/* Path visualization for step-to-step navigation */}
      <PathVisualizationLayer
        paths={questPaths}
        currentStepIndex={selectedStep}
        currentFloor={floor}
        showAllPaths={ui.showAllPaths ?? false}
        editMode={ui.pathEditMode ?? false}
        selectedWaypointIndex={ui.selectedWaypointIndex}
        onWaypointSelect={(index) => EditorStore.setUi({ selectedWaypointIndex: index })}
        onWaypointDragEnd={(index, newPos) => {
          // Update the waypoint position when drag ends
          EditorStore.patchQuest((draft) => {
            const step = draft.questSteps[selectedStep];
            if (step?.pathToStep?.waypoints?.[index]) {
              step.pathToStep.waypoints[index] = newPos;
            }
          });
        }}
      />
      {/* Collision debug overlay - only shows tiles loaded for path generation */}
      <CollisionDebugLayer
        floor={floor}
        enabled={ui.showCollisionDebug ?? false}
        refreshKey={questPaths.length}
      />
      {/* Collision editor - interactive tile editing mode */}
      <CollisionEditorLayer
        floor={floor}
        refreshKey={questPaths.length}
      />
      {/* Transport editor - interactive transport placement mode */}
      <TransportEditorLayer
        floor={floor}
        onTransportCreated={handleTransportCreated}
      />
      {/* Transport visualization - shows all transport links on map */}
      <TransportVisualizationLayer
        floor={floor}
        enabled={ui.showTransportDebug ?? false}
        showGlobal={true}
        showPositionBased={true}
        displayMode={ui.transportDisplayMode ?? "nodes"}
        category={ui.transportCategory ?? "all"}
        editMode={ui.transportEditMode ?? false}
        refreshKey={transportRefreshKey}
        onTransportUpdated={handleTransportCreated}
      />
      <MapUIOverlay />
    </>
  );
};

export default InternalMapLayers;
