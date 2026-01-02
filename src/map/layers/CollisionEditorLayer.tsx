// src/map/layers/CollisionEditorLayer.tsx
// Interactive collision editor - select tiles to make them walkable/blocked

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  makeTileWalkable,
  makeTileBlocked,
  makeAreaWalkable,
  makeAreaBlocked,
  addAreaDirections,
  removeAreaDirections,
  loadCollisionForDebug,
  getFilesForArea,
  collisionEditorState,
} from "../utils/pathfinding";

interface CollisionEditorLayerProps {
  floor: number;
  refreshKey?: number; // Increment to force refresh of collision visualization
}

const CollisionEditorLayerComponent: React.FC<CollisionEditorLayerProps> = ({
  floor,
  refreshKey,
}) => {
  const map = useMap();
  const [enabled, setEnabled] = useState(collisionEditorState.enabled);
  const [mode, setMode] = useState(collisionEditorState.mode);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<L.LatLng | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<L.LatLng | null>(null);
  const selectionRectRef = useRef<L.Rectangle | null>(null);
  const cursorMarkerRef = useRef<L.CircleMarker | null>(null);

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = collisionEditorState.subscribe(() => {
      setEnabled(collisionEditorState.enabled);
      setMode(collisionEditorState.mode);
    });
    return unsubscribe;
  }, []);

  // Convert lat/lng to tile coordinates (matching the map's offset system)
  const toTileCoords = useCallback((latlng: L.LatLng) => {
    // Match the offset logic from snapToTileCoordinate in InternalMapLayers
    // storedLng = Math.floor(latlng.lng - 0.5)
    // storedLat = Math.floor(latlng.lat + 0.5)
    return {
      x: Math.floor(latlng.lng - 0.5),
      y: Math.floor(latlng.lat + 0.5),
    };
  }, []);

  // Convert tile coordinates to visual latlng for display (tile corners)
  const tileToVisualBounds = useCallback((startLatlng: L.LatLng, endLatlng: L.LatLng) => {
    const startTile = toTileCoords(startLatlng);
    const endTile = toTileCoords(endLatlng);

    const minX = Math.min(startTile.x, endTile.x);
    const maxX = Math.max(startTile.x, endTile.x);
    const minY = Math.min(startTile.y, endTile.y);
    const maxY = Math.max(startTile.y, endTile.y);

    // Convert back to visual coordinates (add offsets for tile display)
    // Southwest corner of min tile, Northeast corner of max tile
    const sw = L.latLng(minY - 0.5, minX + 0.5);
    const ne = L.latLng(maxY + 0.5, maxX + 1.5);

    return L.latLngBounds(sw, ne);
  }, [toTileCoords]);

  // Ensure collision data is loaded for the area
  const ensureDataLoaded = useCallback(async (minX: number, minY: number, maxX: number, maxY: number) => {
    const files = getFilesForArea(minX, minY, maxX, maxY);
    await Promise.all(files.map(f => loadCollisionForDebug(f.x, f.y, floor)));
  }, [floor]);

  // Apply edits to selected area
  const applyEdits = useCallback(async (start: L.LatLng, end: L.LatLng) => {
    const startTile = toTileCoords(start);
    const endTile = toTileCoords(end);

    const minX = Math.min(startTile.x, endTile.x);
    const maxX = Math.max(startTile.x, endTile.x);
    const minY = Math.min(startTile.y, endTile.y);
    const maxY = Math.max(startTile.y, endTile.y);

    // Ensure collision data is loaded
    await ensureDataLoaded(minX, minY, maxX, maxY);

    // Apply the edit based on current mode
    const currentMode = collisionEditorState.mode;
    console.log(`%c🎯 Applying edit: mode=${currentMode}, area=(${minX},${minY})-(${maxX},${maxY})`, 'color: cyan');
    if (currentMode === "walkable") {
      makeAreaWalkable(minX, minY, maxX, maxY, floor);
    } else if (currentMode === "blocked") {
      makeAreaBlocked(minX, minY, maxX, maxY, floor);
    } else if (currentMode === "directional") {
      const dirBits = collisionEditorState.selectedDirections;
      const action = collisionEditorState.directionalAction;
      console.log(`%c🎯 Directional: action=${action}, bits=${dirBits} (${dirBits.toString(2).padStart(8, '0')})`, 'color: cyan');
      if (action === "block") {
        removeAreaDirections(minX, minY, maxX, maxY, floor, dirBits);
      } else {
        addAreaDirections(minX, minY, maxX, maxY, floor, dirBits);
      }
    }
  }, [floor, toTileCoords, ensureDataLoaded]);

  // Update selection rectangle
  useEffect(() => {
    if (!enabled) {
      if (selectionRectRef.current) {
        map.removeLayer(selectionRectRef.current);
        selectionRectRef.current = null;
      }
      return;
    }

    if (selectionStart && selectionEnd) {
      // Use tile-snapped bounds so visual matches actual edit area
      const bounds = tileToVisualBounds(selectionStart, selectionEnd);
      // Color: green for walkable, red for blocked, cyan for directional
      const color = mode === "walkable" ? "#00ff00" : mode === "blocked" ? "#ff0000" : "#00ffff";

      if (selectionRectRef.current) {
        selectionRectRef.current.setBounds(bounds);
        selectionRectRef.current.setStyle({
          color,
          fillColor: color,
        });
      } else {
        selectionRectRef.current = L.rectangle(bounds, {
          color,
          weight: 2,
          fillOpacity: 0.3,
          fillColor: color,
        }).addTo(map);
      }
    } else if (selectionRectRef.current) {
      map.removeLayer(selectionRectRef.current);
      selectionRectRef.current = null;
    }
  }, [map, enabled, selectionStart, selectionEnd, mode, tileToVisualBounds]);

  // Update cursor marker on mouse move
  useEffect(() => {
    if (!enabled) {
      if (cursorMarkerRef.current) {
        map.removeLayer(cursorMarkerRef.current);
        cursorMarkerRef.current = null;
      }
      return;
    }

    // Color: green for walkable, red for blocked, cyan for directional
    const color = mode === "walkable" ? "#00ff00" : mode === "blocked" ? "#ff0000" : "#00ffff";

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      const tile = toTileCoords(e.latlng);
      // Visual center adjusted: y, x + 1.0
      const center = L.latLng(tile.y, tile.x + 1.0);

      if (cursorMarkerRef.current) {
        cursorMarkerRef.current.setLatLng(center);
        cursorMarkerRef.current.setStyle({ color, fillColor: color });
      } else {
        cursorMarkerRef.current = L.circleMarker(center, {
          radius: 5,
          color,
          fillColor: color,
          fillOpacity: 0.5,
          weight: 2,
        }).addTo(map);
      }

      // Update selection end if dragging
      if (isSelecting) {
        setSelectionEnd(e.latlng);
      }
    };

    map.on("mousemove", onMouseMove);

    return () => {
      map.off("mousemove", onMouseMove);
    };
  }, [map, enabled, mode, isSelecting, toTileCoords]);

  // Handle mouse events for selection
  useEffect(() => {
    if (!enabled) {
      map.dragging.enable();
      return;
    }

    const onMouseDown = (e: L.LeafletMouseEvent) => {
      // Only respond to left click
      if (e.originalEvent.button !== 0) return;

      setIsSelecting(true);
      setSelectionStart(e.latlng);
      setSelectionEnd(e.latlng);

      // Prevent map drag
      map.dragging.disable();
    };

    const onMouseUp = async (e: L.LeafletMouseEvent) => {
      if (!isSelecting) return;

      const finalEnd = e.latlng;
      const finalStart = selectionStart;

      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);

      // Re-enable map drag
      map.dragging.enable();

      // Apply edits
      if (finalStart) {
        await applyEdits(finalStart, finalEnd);
      }
    };

    map.on("mousedown", onMouseDown);
    map.on("mouseup", onMouseUp);

    return () => {
      map.off("mousedown", onMouseDown);
      map.off("mouseup", onMouseUp);
      map.dragging.enable();
    };
  }, [map, enabled, isSelecting, selectionStart, applyEdits]);

  // Cleanup on unmount or disable
  useEffect(() => {
    return () => {
      if (selectionRectRef.current) {
        map.removeLayer(selectionRectRef.current);
        selectionRectRef.current = null;
      }
      if (cursorMarkerRef.current) {
        map.removeLayer(cursorMarkerRef.current);
        cursorMarkerRef.current = null;
      }
      map.dragging.enable();
    };
  }, [map]);

  // Cleanup cursor when disabled
  useEffect(() => {
    if (!enabled && cursorMarkerRef.current) {
      map.removeLayer(cursorMarkerRef.current);
      cursorMarkerRef.current = null;
    }
  }, [map, enabled]);

  return null;
};

export const CollisionEditorLayer = React.memo(CollisionEditorLayerComponent);

// Hook to use collision editor state in React components
export function useCollisionEditorState() {
  const [enabled, setEnabled] = useState(collisionEditorState.enabled);
  const [mode, setMode] = useState(collisionEditorState.mode);
  const [selectedDirections, setSelectedDirections] = useState(collisionEditorState.selectedDirections);
  const [directionalAction, setDirectionalAction] = useState(collisionEditorState.directionalAction);

  useEffect(() => {
    const unsubscribe = collisionEditorState.subscribe(() => {
      setEnabled(collisionEditorState.enabled);
      setMode(collisionEditorState.mode);
      setSelectedDirections(collisionEditorState.selectedDirections);
      setDirectionalAction(collisionEditorState.directionalAction);
    });
    return unsubscribe;
  }, []);

  return { enabled, mode, selectedDirections, directionalAction };
}
