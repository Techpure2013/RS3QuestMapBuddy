// src/map/layers/CollisionEditorLayer.tsx
// Interactive collision editor - select tiles to make them walkable/blocked

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  makeAreaWalkable,
  makeAreaBlocked,
  loadCollisionForDebug,
  getFilesForArea,
  collisionEditorState,
  getTileDataSync,
  makeWall,
  getWallSegmentsSimple,
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

  // The collision overlay is displayed with a -0.5 offset (see getTileBounds)
  // So we need to add 0.5 to map coords to get collision coords (subtract -0.5)
  const DISPLAY_OFFSET = -0.5;

  // Convert lat/lng to tile coordinates (accounting for display offset)
  const toTileCoords = useCallback((latlng: L.LatLng) => {
    // Subtract offset to convert from display coords to collision tile coords
    return {
      x: Math.floor(latlng.lng - DISPLAY_OFFSET),
      y: Math.floor(latlng.lat - DISPLAY_OFFSET),
    };
  }, []);

  // Convert lat/lng to edge coordinates (for wall mode - snaps to nearest tile edge)
  const toEdgeCoords = useCallback((latlng: L.LatLng) => {
    // Subtract offset, round to nearest edge, gives us collision edge coordinate
    return {
      x: Math.round(latlng.lng - DISPLAY_OFFSET),
      y: Math.round(latlng.lat - DISPLAY_OFFSET),
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

    // Convert to visual bounds - add DISPLAY_OFFSET to align with collision overlay
    // Tile at collision (x,y) is displayed from (x+0.5, y+0.5) to (x+1.5, y+1.5)
    const sw = L.latLng(minY + DISPLAY_OFFSET, minX + DISPLAY_OFFSET);
    const ne = L.latLng(maxY + 1 + DISPLAY_OFFSET, maxX + 1 + DISPLAY_OFFSET);

    return L.latLngBounds(sw, ne);
  }, [toTileCoords]);

  // Ensure collision data is loaded for the area
  const ensureDataLoaded = useCallback(async (minX: number, minY: number, maxX: number, maxY: number) => {
    const files = getFilesForArea(minX, minY, maxX, maxY);
    await Promise.all(files.map(f => loadCollisionForDebug(f.x, f.y, floor)));
  }, [floor]);

  // Apply edits to selected area or line
  const applyEdits = useCallback(async (start: L.LatLng, end: L.LatLng) => {
    const currentShape = collisionEditorState.drawShape;

    // For line mode, use edge coordinates (wall behavior); otherwise use tile coordinates
    const startCoord = currentShape === "line" ? toEdgeCoords(start) : toTileCoords(start);
    const endCoord = currentShape === "line" ? toEdgeCoords(end) : toTileCoords(end);

    const minX = Math.min(startCoord.x, endCoord.x);
    const maxX = Math.max(startCoord.x, endCoord.x);
    const minY = Math.min(startCoord.y, endCoord.y);
    const maxY = Math.max(startCoord.y, endCoord.y);

    // Ensure collision data is loaded (with some buffer for line/wall mode)
    const bufferX = currentShape === "line" ? 1 : 0;
    const bufferY = currentShape === "line" ? 1 : 0;
    await ensureDataLoaded(minX - bufferX, minY - bufferY, maxX + bufferX, maxY + bufferY);

    // Apply the edit based on current mode and shape
    const currentMode = collisionEditorState.mode;

    // Save original tile data BEFORE applying edit (for nudge feature)
    const originalData = new Map<string, number>();
    if (currentShape === "line") {
      // Line affects tiles on both sides of the boundary (wall behavior)
      const wallSegments = getWallSegmentsSimple(startCoord.x, startCoord.y, endCoord.x, endCoord.y);
      for (const seg of wallSegments) {
        originalData.set(`${seg.tile1.x},${seg.tile1.y}`, getTileDataSync(seg.tile1.x, seg.tile1.y, floor));
        originalData.set(`${seg.tile2.x},${seg.tile2.y}`, getTileDataSync(seg.tile2.x, seg.tile2.y, floor));
      }
    } else {
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          originalData.set(`${x},${y}`, getTileDataSync(x, y, floor));
        }
      }
    }

    // Save edit info for nudge
    collisionEditorState.saveLastEdit(
      {
        shape: currentShape,
        mode: currentMode,
        floor,
        minX,
        minY,
        maxX,
        maxY,
        startX: startCoord.x,
        startY: startCoord.y,
        endX: endCoord.x,
        endY: endCoord.y,
      },
      originalData
    );

    if (currentShape === "line") {
      // Line mode - create inter-tile boundaries (blocks movement perpendicular to line)
      console.log(`%c🧱 Applying line/wall edit: mode=${currentMode}, edge (${startCoord.x},${startCoord.y})->(${endCoord.x},${endCoord.y})`, 'color: orange');
      // Line mode uses walkable/blocked to determine if we're adding or removing the wall
      const removeWall = currentMode === "walkable";
      makeWall(startCoord.x, startCoord.y, endCoord.x, endCoord.y, floor, removeWall);
    } else {
      // Rectangle mode - fill the entire area
      console.log(`%c🎯 Applying rect edit: mode=${currentMode}, area=(${minX},${minY})-(${maxX},${maxY})`, 'color: cyan');
      if (currentMode === "walkable") {
        makeAreaWalkable(minX, minY, maxX, maxY, floor);
      } else if (currentMode === "blocked") {
        makeAreaBlocked(minX, minY, maxX, maxY, floor);
      }
    }
  }, [floor, toTileCoords, toEdgeCoords, ensureDataLoaded]);

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

    // Color: green for walkable, red for blocked
    const color = mode === "walkable" ? "#00ff00" : "#ff0000";

    if (selectionStart && selectionEnd) {
      if (drawShape === "line") {
        // Line mode - show a line along tile edges (wall behavior)
        if (selectionRectRef.current) {
          map.removeLayer(selectionRectRef.current);
          selectionRectRef.current = null;
        }

        // Use edge coordinates (rounded to nearest integer)
        const startEdge = toEdgeCoords(selectionStart);
        const endEdge = toEdgeCoords(selectionEnd);

        const dx = endEdge.x - startEdge.x;
        const dy = endEdge.y - startEdge.y;
        const isHorizontal = Math.abs(dx) >= Math.abs(dy);

        // Draw a simple line on the edge
        // For horizontal walls: line runs at constant Y from minX to maxX
        // For vertical walls: line runs at constant X from minY to maxY
        // Add DISPLAY_OFFSET back to convert from collision coords to display coords
        const latLngs: L.LatLngExpression[] = [];
        if (isHorizontal) {
          // Horizontal wall - draw along Y edge
          const edgeY = startEdge.y + DISPLAY_OFFSET;
          const minX = Math.min(startEdge.x, endEdge.x) + DISPLAY_OFFSET;
          const maxX = Math.max(startEdge.x, endEdge.x) + DISPLAY_OFFSET;
          latLngs.push([edgeY, minX]);
          latLngs.push([edgeY, maxX]);
        } else {
          // Vertical wall - draw along X edge
          const edgeX = startEdge.x + DISPLAY_OFFSET;
          const minY = Math.min(startEdge.y, endEdge.y) + DISPLAY_OFFSET;
          const maxY = Math.max(startEdge.y, endEdge.y) + DISPLAY_OFFSET;
          latLngs.push([minY, edgeX]);
          latLngs.push([maxY, edgeX]);
        }

        if (selectionLineRef.current) {
          selectionLineRef.current.setLatLngs(latLngs);
          selectionLineRef.current.setStyle({ color, weight: 6, dashArray: "4, 4" });
        } else {
          selectionLineRef.current = L.polyline(latLngs, {
            color,
            weight: 6,
            opacity: 0.9,
            dashArray: "4, 4", // Dashed line to indicate wall/boundary
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
  }, [map, enabled, selectionStart, selectionEnd, mode, drawShape, tileToVisualBounds, toTileCoords, toEdgeCoords]);

  // Update cursor marker on mouse move
  useEffect(() => {
    if (!enabled) {
      if (cursorMarkerRef.current) {
        map.removeLayer(cursorMarkerRef.current);
        cursorMarkerRef.current = null;
      }
      return;
    }

    // Color: green for walkable, red for blocked
    const color = mode === "walkable" ? "#00ff00" : "#ff0000";

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      const tile = toTileCoords(e.latlng);
      // Center of the tile at (x, y) is at (y + 0.5 + offset, x + 0.5 + offset)
      const center = L.latLng(tile.y + 0.5 + DISPLAY_OFFSET, tile.x + 0.5 + DISPLAY_OFFSET);

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

  useEffect(() => {
    const unsubscribe = collisionEditorState.subscribe(() => {
      setEnabled(collisionEditorState.enabled);
      setMode(collisionEditorState.mode);
      setDrawShape(collisionEditorState.drawShape);
    });
    return unsubscribe;
  }, []);

  return { enabled, mode, drawShape };
}
