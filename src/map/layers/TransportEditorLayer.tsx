// src/map/layers/TransportEditorLayer.tsx
// Interactive transport editor - click to place from/to positions for transports

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  transportEditorState,
  createTransport,
  reloadTransports,
  type TransportType,
  type TransportDirection,
  type TransportEditorPosition,
  type StairsAction,
} from "../utils/pathfinding";

interface TransportEditorLayerProps {
  floor: number;
  onTransportCreated?: () => void;
}

const TransportEditorLayerComponent: React.FC<TransportEditorLayerProps> = ({
  floor,
  onTransportCreated,
}) => {
  const map = useMap();
  const [enabled, setEnabled] = useState(transportEditorState.enabled);
  const [step, setStep] = useState(transportEditorState.step);
  const [fromPosition, setFromPosition] = useState(transportEditorState.fromPosition);
  const [fromPosition2, setFromPosition2] = useState(transportEditorState.fromPosition2);
  const [toPosition, setToPosition] = useState(transportEditorState.toPosition);
  const [transportType, setTransportType] = useState(transportEditorState.transportType);

  const fromMarkerRef = useRef<L.CircleMarker | null>(null);
  const fromBoundsRef = useRef<L.Rectangle | null>(null); // For multi-tile bounds visualization
  const toMarkerRef = useRef<L.CircleMarker | null>(null);
  const lineRef = useRef<L.Polyline | null>(null);
  const cursorMarkerRef = useRef<L.CircleMarker | null>(null);

  // Subscribe to global state changes
  useEffect(() => {
    const unsubscribe = transportEditorState.subscribe(() => {
      setEnabled(transportEditorState.enabled);
      setStep(transportEditorState.step);
      setFromPosition(transportEditorState.fromPosition);
      setFromPosition2(transportEditorState.fromPosition2);
      setToPosition(transportEditorState.toPosition);
      setTransportType(transportEditorState.transportType);
    });
    return unsubscribe;
  }, []);

  // Convert lat/lng to tile coordinates
  const toTileCoords = useCallback((latlng: L.LatLng): TransportEditorPosition => {
    return {
      x: Math.floor(latlng.lng - 0.5),
      y: Math.floor(latlng.lat + 0.5),
      floor,
    };
  }, [floor]);

  // Convert tile coords to visual latlng
  const tileToVisualLatLng = useCallback((pos: TransportEditorPosition): L.LatLng => {
    return L.latLng(pos.y, pos.x + 1.0);
  }, []);

  // Get color based on transport type
  const getTypeColor = useCallback((type: TransportType): string => {
    switch (type) {
      case "stairs":
      case "ladder":
      case "trapdoor":
      case "rope":
        return "#8b5cf6"; // Purple for vertical
      case "teleport":
      case "lodestone":
      case "fairy_ring":
      case "spirit_tree":
      case "portal":
      case "jewelry_teleport":
      case "archaeology_journal":
        return "#06b6d4"; // Cyan for teleports
      case "boat":
      case "canoe":
      case "charter_ship":
        return "#0ea5e9"; // Blue for water
      case "gnome_glider":
      case "balloon":
      case "eagle":
      case "magic_carpet":
        return "#f59e0b"; // Amber for aerial
      case "minecart":
      case "gnome_cart":
        return "#a3522f"; // Brown for rail
      case "agility":
        return "#10b981"; // Emerald for agility
      default:
        return "#6b7280"; // Gray for other
    }
  }, []);

  // Create transport when both positions are set
  useEffect(() => {
    const createTransportFromState = async () => {
      const from = transportEditorState.fromPosition;
      const from2 = transportEditorState.fromPosition2;
      const to = transportEditorState.toPosition;

      if (!from || !to) return;

      // Determine direction based on stairs action or floor change
      let direction: TransportDirection = "same";
      const stairsAction = transportEditorState.stairsAction;
      if (stairsAction !== "auto") {
        // Use explicit stairs action
        if (stairsAction === "up" || stairsAction === "climb_to_top") direction = "up";
        else if (stairsAction === "down" || stairsAction === "climb_to_bottom") direction = "down";
      } else {
        // Auto-determine from floor change
        if (to.floor > from.floor) direction = "up";
        else if (to.floor < from.floor) direction = "down";
      }

      // Generate name
      const name = transportEditorState.generateName();

      console.log(`%c🚂 Creating transport: ${name}`, 'color: lime; font-weight: bold');
      if (from2) {
        console.log(`%c📐 Multi-tile bounds: (${from.x}, ${from.y}) to (${from2.x}, ${from2.y})`, 'color: cyan');
      }

      try {
        const transportData: Parameters<typeof createTransport>[0] = {
          name,
          transport_type: transportEditorState.transportType,
          from_x: from.x,
          from_y: from.y,
          from_floor: from.floor,
          to_x: to.x,
          to_y: to.y,
          to_floor: to.floor,
          direction,
          bidirectional: transportEditorState.bidirectional,
        };

        // Add multi-tile bounds if set
        if (from2) {
          transportData.from_x2 = from2.x;
          transportData.from_y2 = from2.y;
        }

        const created = await createTransport(transportData);

        if (created) {
          console.log(`%c✅ Transport created: ${created.name} (ID: ${created.id})`, 'color: lime');
          // Reload transports so pathfinder picks up the new one
          await reloadTransports();
          // Notify callback
          onTransportCreated?.();
          // Reset for next placement
          transportEditorState.startPlacement();
        } else {
          console.error('Failed to create transport');
        }
      } catch (err) {
        console.error('Error creating transport:', err);
      }
    };

    if (fromPosition && toPosition && step === "idle") {
      createTransportFromState();
    }
  }, [fromPosition, toPosition, step, onTransportCreated]);

  // Update markers when positions change
  useEffect(() => {
    const color = getTypeColor(transportType);

    // From marker
    if (fromPosition) {
      const center = tileToVisualLatLng(fromPosition);
      if (fromMarkerRef.current) {
        fromMarkerRef.current.setLatLng(center);
      } else {
        fromMarkerRef.current = L.circleMarker(center, {
          radius: 8,
          color: "#00ff00",
          fillColor: "#00ff00",
          fillOpacity: 0.6,
          weight: 3,
        }).addTo(map);
        fromMarkerRef.current.bindTooltip("FROM", { permanent: true, direction: "top", offset: [0, -10] });
      }
    } else if (fromMarkerRef.current) {
      map.removeLayer(fromMarkerRef.current);
      fromMarkerRef.current = null;
    }

    // Bounds rectangle for multi-tile (fromPosition to fromPosition2)
    if (fromPosition && fromPosition2) {
      const minX = Math.min(fromPosition.x, fromPosition2.x);
      const maxX = Math.max(fromPosition.x, fromPosition2.x);
      const minY = Math.min(fromPosition.y, fromPosition2.y);
      const maxY = Math.max(fromPosition.y, fromPosition2.y);
      // Bounds: [minY - 0.5, minX + 0.5] to [maxY + 0.5, maxX + 1.5]
      const bounds: L.LatLngBoundsExpression = [
        [minY - 0.5, minX + 0.5],
        [maxY + 0.5, maxX + 1.5],
      ];
      if (fromBoundsRef.current) {
        fromBoundsRef.current.setBounds(bounds);
      } else {
        fromBoundsRef.current = L.rectangle(bounds, {
          color: "#00ff00",
          fillColor: "#00ff00",
          fillOpacity: 0.2,
          weight: 2,
          dashArray: "4, 4",
        }).addTo(map);
        fromBoundsRef.current.bindTooltip(`Bounds: (${minX}, ${minY}) to (${maxX}, ${maxY})`, { permanent: false, direction: "center" });
      }
    } else if (fromBoundsRef.current) {
      map.removeLayer(fromBoundsRef.current);
      fromBoundsRef.current = null;
    }

    // To marker
    if (toPosition) {
      const center = tileToVisualLatLng(toPosition);
      if (toMarkerRef.current) {
        toMarkerRef.current.setLatLng(center);
      } else {
        toMarkerRef.current = L.circleMarker(center, {
          radius: 8,
          color: "#ff6600",
          fillColor: "#ff6600",
          fillOpacity: 0.6,
          weight: 3,
        }).addTo(map);
        toMarkerRef.current.bindTooltip("TO", { permanent: true, direction: "top", offset: [0, -10] });
      }
    } else if (toMarkerRef.current) {
      map.removeLayer(toMarkerRef.current);
      toMarkerRef.current = null;
    }

    // Line between from and to
    if (fromPosition && toPosition) {
      const fromLatLng = tileToVisualLatLng(fromPosition);
      const toLatLng = tileToVisualLatLng(toPosition);
      if (lineRef.current) {
        lineRef.current.setLatLngs([fromLatLng, toLatLng]);
      } else {
        lineRef.current = L.polyline([fromLatLng, toLatLng], {
          color,
          weight: 3,
          dashArray: "5, 10",
        }).addTo(map);
      }
    } else if (lineRef.current) {
      map.removeLayer(lineRef.current);
      lineRef.current = null;
    }
  }, [map, fromPosition, fromPosition2, toPosition, transportType, getTypeColor, tileToVisualLatLng]);

  // Cursor marker on mouse move
  useEffect(() => {
    if (!enabled || step === "idle") {
      if (cursorMarkerRef.current) {
        map.removeLayer(cursorMarkerRef.current);
        cursorMarkerRef.current = null;
      }
      return;
    }

    // Color based on step: from=green, from_corner=cyan, to=orange
    const getColor = () => {
      if (step === "from") return "#00ff00";
      if (step === "from_corner") return "#00ffff"; // Cyan for second corner
      return "#ff6600"; // TO position
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      const tile = toTileCoords(e.latlng);
      const center = tileToVisualLatLng(tile);
      const color = getColor();

      if (cursorMarkerRef.current) {
        cursorMarkerRef.current.setLatLng(center);
        cursorMarkerRef.current.setStyle({ color, fillColor: color });
      } else {
        cursorMarkerRef.current = L.circleMarker(center, {
          radius: 6,
          color,
          fillColor: color,
          fillOpacity: 0.4,
          weight: 2,
        }).addTo(map);
      }

      // If we have a from position and are placing "to", draw preview line
      if (step === "to" && fromPosition && lineRef.current) {
        const fromLatLng = tileToVisualLatLng(fromPosition);
        lineRef.current.setLatLngs([fromLatLng, center]);
      }
    };

    map.on("mousemove", onMouseMove);
    return () => {
      map.off("mousemove", onMouseMove);
    };
  }, [map, enabled, step, fromPosition, toTileCoords, tileToVisualLatLng]);

  // Handle clicks
  useEffect(() => {
    if (!enabled) {
      map.dragging.enable();
      return;
    }

    const onClick = (e: L.LeafletMouseEvent) => {
      // Only respond to left click
      if (e.originalEvent.button !== 0) return;

      const tile = toTileCoords(e.latlng);
      const isShiftHeld = e.originalEvent.shiftKey;

      if (step === "from") {
        // Only capture clicks when explicitly in "from" placement mode
        // (not "idle" - user must call startPlacement() first)
        // Ignore Shift+Click - reserved for TransportVisualizationLayer's multi-tile resize
        if (isShiftHeld) return;

        transportEditorState.setFromPosition(tile);
        // Create preview line
        if (!lineRef.current) {
          const center = tileToVisualLatLng(tile);
          lineRef.current = L.polyline([center, center], {
            color: getTypeColor(transportType),
            weight: 3,
            dashArray: "5, 10",
          }).addTo(map);
        }
      } else if (step === "from_corner") {
        // In from_corner step:
        // - Shift+Click sets the second corner (for multi-tile bounds)
        // - Regular click skips to setting the TO position
        if (isShiftHeld) {
          // Set second corner for multi-tile bounds
          transportEditorState.setFromPosition2(tile);
          console.log(`%c📐 Second corner set at (${tile.x}, ${tile.y})`, 'color: cyan');
        } else {
          // Skip multi-tile bounds, set TO position directly
          transportEditorState.skipFromCorner();
          transportEditorState.setToPosition(tile);
        }
      } else if (step === "to") {
        transportEditorState.setToPosition(tile);
      }
    };

    map.on("click", onClick);
    return () => {
      map.off("click", onClick);
    };
  }, [map, enabled, step, floor, toTileCoords, tileToVisualLatLng, transportType, getTypeColor]);

  // Cleanup on unmount or disable
  useEffect(() => {
    if (!enabled) {
      if (fromMarkerRef.current) {
        map.removeLayer(fromMarkerRef.current);
        fromMarkerRef.current = null;
      }
      if (fromBoundsRef.current) {
        map.removeLayer(fromBoundsRef.current);
        fromBoundsRef.current = null;
      }
      if (toMarkerRef.current) {
        map.removeLayer(toMarkerRef.current);
        toMarkerRef.current = null;
      }
      if (lineRef.current) {
        map.removeLayer(lineRef.current);
        lineRef.current = null;
      }
      if (cursorMarkerRef.current) {
        map.removeLayer(cursorMarkerRef.current);
        cursorMarkerRef.current = null;
      }
    }
  }, [map, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fromMarkerRef.current) {
        map.removeLayer(fromMarkerRef.current);
        fromMarkerRef.current = null;
      }
      if (fromBoundsRef.current) {
        map.removeLayer(fromBoundsRef.current);
        fromBoundsRef.current = null;
      }
      if (toMarkerRef.current) {
        map.removeLayer(toMarkerRef.current);
        toMarkerRef.current = null;
      }
      if (lineRef.current) {
        map.removeLayer(lineRef.current);
        lineRef.current = null;
      }
      if (cursorMarkerRef.current) {
        map.removeLayer(cursorMarkerRef.current);
        cursorMarkerRef.current = null;
      }
    };
  }, [map]);

  return null;
};

export const TransportEditorLayer = React.memo(TransportEditorLayerComponent);

// Hook to use transport editor state in React components
export function useTransportEditorState() {
  const [enabled, setEnabled] = useState(transportEditorState.enabled);
  const [step, setStep] = useState(transportEditorState.step);
  const [transportType, setTransportType] = useState(transportEditorState.transportType);
  const [fromPosition, setFromPosition] = useState(transportEditorState.fromPosition);
  const [fromPosition2, setFromPosition2] = useState(transportEditorState.fromPosition2);
  const [toPosition, setToPosition] = useState(transportEditorState.toPosition);
  const [bidirectional, setBidirectional] = useState(transportEditorState.bidirectional);
  const [stairsAction, setStairsAction] = useState(transportEditorState.stairsAction);
  const [name, setName] = useState(transportEditorState.name);

  useEffect(() => {
    const unsubscribe = transportEditorState.subscribe(() => {
      setEnabled(transportEditorState.enabled);
      setStep(transportEditorState.step);
      setTransportType(transportEditorState.transportType);
      setFromPosition(transportEditorState.fromPosition);
      setFromPosition2(transportEditorState.fromPosition2);
      setToPosition(transportEditorState.toPosition);
      setBidirectional(transportEditorState.bidirectional);
      setStairsAction(transportEditorState.stairsAction);
      setName(transportEditorState.name);
    });
    return unsubscribe;
  }, []);

  return { enabled, step, transportType, fromPosition, fromPosition2, toPosition, bidirectional, stairsAction, name };
}
