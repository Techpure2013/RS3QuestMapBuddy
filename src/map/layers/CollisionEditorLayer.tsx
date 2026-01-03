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
  makeLineWalkable,
  makeLineBlocked,
  addLineDirections,
  removeLineDirections,
  getLineTiles,
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
  const [drawShape, setDrawShape] = useState(collisionEditorState.drawShape);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<L.LatLng | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<L.LatLng | null>(null);
  const selectionRectRef = useRef<L.Rectangle | null>(null);
  const selectionLineRef = useRef<L.Polyline | null>(null);
  const cursorMarkerRef = useRef<L.CircleMarker | null>(null);

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = collisionEditorState.subscribe(() => {
      setEnabled(collisionEditorState.enabled);
      setMode(collisionEditorState.mode);
      setDrawShape(collisionEditorState.drawShape);
    });
    return unsubscribe;
  }, []);

  // Convert lat/lng to tile coordinates (raw world coordinates for collision data)
  const toTileCoords = useCallback((latlng: L.LatLng) => {
    // Collision data uses raw world coordinates - no offset needed
    return {
      x: Math.floor(latlng.lng),
      y: Math.floor(latlng.lat),
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

    // Convert to visual bounds - tile at (x,y) occupies space from (y,x) to (y+1,x+1)
    const sw = L.latLng(minY, minX);
    const ne = L.latLng(maxY + 1, maxX + 1);

    return L.latLngBounds(sw, ne);
  }, [toTileCoords]);

  // Ensure collision data is loaded for the area
  const ensureDataLoaded = useCallback(async (minX: number, minY: number, maxX: number, maxY: number) => {
    const files = getFilesForArea(minX, minY, maxX, maxY);
    await Promise.all(files.map(f => loadCollisionForDebug(f.x, f.y, floor)));
  }, [floor]);

  // Apply edits to selected area or line
  const applyEdits = useCallback(async (start: L.LatLng, end: L.LatLng) => {
    const startTile = toTileCoords(start);
    const endTile = toTileCoords(end);

    const minX = Math.min(startTile.x, endTile.x);
    const maxX = Math.max(startTile.x, endTile.x);
    const minY = Math.min(startTile.y, endTile.y);
    const maxY = Math.max(startTile.y, endTile.y);

    // Ensure collision data is loaded
    await ensureDataLoaded(minX, minY, maxX, maxY);

    // Apply the edit based on current mode and shape
    const currentMode = collisionEditorState.mode;
    const currentShape = collisionEditorState.drawShape;

    if (currentShape === "line") {
      // Line mode - draw a 1-tile-wide line from start to end
      console.log(`%c🎯 Applying line edit: mode=${currentMode}, (${startTile.x},${startTile.y})->(${endTile.x},${endTile.y})`, 'color: cyan');
      if (currentMode === "walkable") {
        makeLineWalkable(startTile.x, startTile.y, endTile.x, endTile.y, floor);
      } else if (currentMode === "blocked") {
        makeLineBlocked(startTile.x, startTile.y, endTile.x, endTile.y, floor);
      } else if (currentMode === "directional") {
        const dirBits = collisionEditorState.selectedDirections;
        const action = collisionEditorState.directionalAction;
        console.log(`%c🎯 Directional: action=${action}, bits=${dirBits} (${dirBits.toString(2).padStart(8, '0')})`, 'color: cyan');
        if (action === "block") {
          removeLineDirections(startTile.x, startTile.y, endTile.x, endTile.y, floor, dirBits);
        } else {
          addLineDirections(startTile.x, startTile.y, endTile.x, endTile.y, floor, dirBits);
        }
      }
    } else {
      // Rectangle mode - fill the entire area
      console.log(`%c🎯 Applying rect edit: mode=${currentMode}, area=(${minX},${minY})-(${maxX},${maxY})`, 'color: cyan');
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
    }
  }, [floor, toTileCoords, ensureDataLoaded]);

  // Update selection rectangle or line
  useEffect(() => {
    if (!enabled) {
      if (selectionRectRef.current) {
        map.removeLayer(selectionRectRef.current);
        selectionRectRef.current = null;
      }
      if (selectionLineRef.current) {
        map.removeLayer(selectionLineRef.current);
        selectionLineRef.current = null;
      }
      return;
    }

    // Color: green for walkable, red for blocked, cyan for directional
    const color = mode === "walkable" ? "#00ff00" : mode === "blocked" ? "#ff0000" : "#00ffff";

    if (selectionStart && selectionEnd) {
      if (drawShape === "line") {
        // Line mode - show a polyline through tile centers
        if (selectionRectRef.current) {
          map.removeLayer(selectionRectRef.current);
          selectionRectRef.current = null;
        }

        const startTile = toTileCoords(selectionStart);
        const endTile = toTileCoords(selectionEnd);
        const lineTiles = getLineTiles(startTile.x, startTile.y, endTile.x, endTile.y);

        // Convert to lat/lng points (tile centers)
        const latLngs: L.LatLngExpression[] = lineTiles.map(t => [t.y + 0.5, t.x + 0.5]);

        if (selectionLineRef.current) {
          selectionLineRef.current.setLatLngs(latLngs);
          selectionLineRef.current.setStyle({ color });
        } else {
          selectionLineRef.current = L.polyline(latLngs, {
            color,
            weight: 4,
            opacity: 0.8,
          }).addTo(map);
        }
      } else {
        // Rectangle mode - show a filled rectangle
        if (selectionLineRef.current) {
          map.removeLayer(selectionLineRef.current);
          selectionLineRef.current = null;
        }

        const bounds = tileToVisualBounds(selectionStart, selectionEnd);

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
      }
    } else {
      if (selectionRectRef.current) {
        map.removeLayer(selectionRectRef.current);
        selectionRectRef.current = null;
      }
      if (selectionLineRef.current) {
        map.removeLayer(selectionLineRef.current);
        selectionLineRef.current = null;
      }
    }
  }, [map, enabled, selectionStart, selectionEnd, mode, drawShape, tileToVisualBounds, toTileCoords]);

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
      // Center of the tile at (x, y) is at (y + 0.5, x + 0.5)
      const center = L.latLng(tile.y + 0.5, tile.x + 0.5);

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
      if (selectionLineRef.current) {
        map.removeLayer(selectionLineRef.current);
        selectionLineRef.current = null;
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
  const [drawShape, setDrawShape] = useState(collisionEditorState.drawShape);
  const [selectedDirections, setSelectedDirections] = useState(collisionEditorState.selectedDirections);
  const [directionalAction, setDirectionalAction] = useState(collisionEditorState.directionalAction);

  useEffect(() => {
    const unsubscribe = collisionEditorState.subscribe(() => {
      setEnabled(collisionEditorState.enabled);
      setMode(collisionEditorState.mode);
      setDrawShape(collisionEditorState.drawShape);
      setSelectedDirections(collisionEditorState.selectedDirections);
      setDirectionalAction(collisionEditorState.directionalAction);
    });
    return unsubscribe;
  }, []);

  return { enabled, mode, drawShape, selectedDirections, directionalAction };
}
