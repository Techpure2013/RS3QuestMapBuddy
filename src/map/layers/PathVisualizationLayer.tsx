// src/map/layers/PathVisualizationLayer.tsx
// Renders quest paths on the map with optional editing capabilities

import React, { useEffect, useRef, useCallback } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { QuestPath, PathWaypoint } from "../../state/types";

interface PathVisualizationLayerProps {
  paths: QuestPath[];
  currentStepIndex: number;
  currentFloor: number;
  showAllPaths?: boolean;
  // Edit mode props
  editMode?: boolean;
  selectedWaypointIndex?: number | null;
  onWaypointSelect?: (index: number | null) => void;
  onWaypointDrag?: (index: number, newPos: PathWaypoint) => void;
  onWaypointDragEnd?: (index: number, newPos: PathWaypoint) => void;
}

// Path styling
const PATH_STYLES = {
  current: {
    color: "#FFD700", // Gold for current step's path
    weight: 4,
    opacity: 0.9,
    dashArray: "10, 5",
  },
  other: {
    color: "#4A90D9", // Blue for other paths
    weight: 3,
    opacity: 0.5,
    dashArray: "5, 5",
  },
  arrow: {
    color: "#FFFFFF",
    weight: 2,
    opacity: 0.8,
  },
};

// Create arrow markers along the path
function createArrowMarkers(
  waypoints: Array<{ lat: number; lng: number }>,
  color: string,
  map: L.Map
): L.Marker[] {
  const markers: L.Marker[] = [];

  if (waypoints.length < 2) return markers;

  // Add arrow every N waypoints
  const arrowInterval = Math.max(5, Math.floor(waypoints.length / 10));

  for (let i = arrowInterval; i < waypoints.length - 1; i += arrowInterval) {
    const curr = waypoints[i];
    const next = waypoints[i + 1];

    // Calculate angle
    const dx = next.lng - curr.lng;
    const dy = next.lat - curr.lat;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Create arrow icon
    const arrowIcon = L.divIcon({
      className: "path-arrow-icon",
      html: `<div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 10px solid ${color};
        transform: rotate(${90 - angle}deg);
        transform-origin: center;
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    const marker = L.marker([curr.lat + 0.5, curr.lng + 0.5], {
      icon: arrowIcon,
      interactive: false,
      pane: "pathArrowPane",
    });

    markers.push(marker);
  }

  return markers;
}

// Ensure pane exists
function ensurePane(map: L.Map, paneName: string, zIndex: string): void {
  if (!map.getPane(paneName)) {
    map.createPane(paneName);
    const pane = map.getPane(paneName);
    if (pane) {
      pane.style.zIndex = zIndex;
      pane.style.pointerEvents = "none";
    }
  }
}

const PathVisualizationLayerComponent: React.FC<PathVisualizationLayerProps> = ({
  paths,
  currentStepIndex,
  currentFloor,
  showAllPaths = false,
  editMode = false,
  selectedWaypointIndex,
  onWaypointSelect,
  onWaypointDrag,
  onWaypointDragEnd,
}) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);
  const editLayerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    // Ensure panes exist
    ensurePane(map, "pathPane", "580");
    ensurePane(map, "pathArrowPane", "585");

    // Create layer group if needed
    if (!layerRef.current) {
      layerRef.current = new L.LayerGroup().addTo(map);
    }

    const layer = layerRef.current;
    layer.clearLayers();

    // Filter and render paths
    paths.forEach((path, index) => {
      // Skip if wrong floor (unless showing all)
      if (!showAllPaths && path.floor !== currentFloor) return;

      // Skip if path has no waypoints
      if (!path.waypoints || path.waypoints.length < 2) return;

      // Determine if this is the current step's path
      const isCurrentPath = path.toStepIndex === currentStepIndex;

      // Get style
      const style = isCurrentPath ? PATH_STYLES.current : PATH_STYLES.other;

      // Only show current path or all paths if enabled
      if (!showAllPaths && !isCurrentPath) return;

      // Convert waypoints to LatLng array (add 0.5 to center in tiles)
      const latLngs: L.LatLngExpression[] = path.waypoints.map((wp) => [
        wp.lat + 0.5,
        wp.lng + 0.5,
      ]);

      // Create main path line
      const polyline = L.polyline(latLngs, {
        ...style,
        pane: "pathPane",
        interactive: false,
      });

      layer.addLayer(polyline);

      // Add glow effect for current path
      if (isCurrentPath) {
        const glowLine = L.polyline(latLngs, {
          color: style.color,
          weight: style.weight + 4,
          opacity: 0.3,
          pane: "pathPane",
          interactive: false,
        });
        layer.addLayer(glowLine);
      }

      // Add arrow markers
      const arrows = createArrowMarkers(path.waypoints, style.color, map);
      arrows.forEach((arrow) => layer.addLayer(arrow));

      // Add start/end markers
      if (path.waypoints.length >= 2) {
        const startWp = path.waypoints[0];
        const endWp = path.waypoints[path.waypoints.length - 1];

        // Start marker (circle)
        const startMarker = L.circleMarker([startWp.lat + 0.5, startWp.lng + 0.5], {
          radius: 6,
          color: "#FFFFFF",
          fillColor: isCurrentPath ? "#00FF00" : "#4A90D9",
          fillOpacity: 1,
          weight: 2,
          pane: "pathArrowPane",
          interactive: false,
        });
        layer.addLayer(startMarker);

        // End marker (filled circle)
        const endMarker = L.circleMarker([endWp.lat + 0.5, endWp.lng + 0.5], {
          radius: 8,
          color: "#FFFFFF",
          fillColor: isCurrentPath ? "#FFD700" : "#FF6B6B",
          fillOpacity: 1,
          weight: 2,
          pane: "pathArrowPane",
          interactive: false,
        });
        layer.addLayer(endMarker);
      }
    });

    return () => {
      if (layerRef.current) {
        layerRef.current.clearLayers();
      }
    };
  }, [map, paths, currentStepIndex, currentFloor, showAllPaths]);

  // Edit mode: render draggable waypoint markers
  useEffect(() => {
    // Ensure edit pane exists with higher z-index
    ensurePane(map, "pathEditPane", "590");
    const editPane = map.getPane("pathEditPane");
    if (editPane) {
      editPane.style.pointerEvents = "auto"; // Allow interaction
    }

    // Create edit layer group if needed
    if (!editLayerRef.current) {
      editLayerRef.current = new L.LayerGroup().addTo(map);
    }

    const editLayer = editLayerRef.current;
    editLayer.clearLayers();

    if (!editMode) return;

    // Find current path
    const currentPath = paths.find((p) => p.toStepIndex === currentStepIndex);
    if (!currentPath || !currentPath.waypoints || currentPath.waypoints.length < 2) return;

    const waypoints = currentPath.waypoints;

    // Determine which waypoints to show markers for
    // Show every Nth waypoint to avoid clutter, plus always show start/end
    const waypointInterval = Math.max(1, Math.floor(waypoints.length / 20));
    const indicesToShow = new Set<number>();
    indicesToShow.add(0); // Start
    indicesToShow.add(waypoints.length - 1); // End
    for (let i = waypointInterval; i < waypoints.length - 1; i += waypointInterval) {
      indicesToShow.add(i);
    }
    // Always include selected waypoint
    if (selectedWaypointIndex !== null && selectedWaypointIndex !== undefined) {
      indicesToShow.add(selectedWaypointIndex);
    }

    // Create draggable markers
    indicesToShow.forEach((wpIndex) => {
      const wp = waypoints[wpIndex];
      const isSelected = wpIndex === selectedWaypointIndex;
      const isEndpoint = wpIndex === 0 || wpIndex === waypoints.length - 1;

      // Create draggable marker
      const marker = L.circleMarker([wp.lat + 0.5, wp.lng + 0.5], {
        radius: isSelected ? 10 : isEndpoint ? 8 : 6,
        color: isSelected ? "#FF00FF" : isEndpoint ? "#FFFFFF" : "#00FFFF",
        fillColor: isSelected ? "#FF00FF" : isEndpoint ? (wpIndex === 0 ? "#00FF00" : "#FFD700") : "#00FFFF",
        fillOpacity: isSelected ? 0.9 : 0.7,
        weight: isSelected ? 3 : 2,
        pane: "pathEditPane",
        interactive: true,
      });

      // Add index label
      const label = L.marker([wp.lat + 0.5, wp.lng + 0.5], {
        icon: L.divIcon({
          className: "waypoint-label",
          html: `<div style="
            background: ${isSelected ? '#FF00FF' : 'rgba(0,0,0,0.7)'};
            color: white;
            padding: 1px 4px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: bold;
            white-space: nowrap;
            transform: translate(-50%, -150%);
          ">${wpIndex}</div>`,
          iconSize: [0, 0],
        }),
        pane: "pathEditPane",
        interactive: false,
      });

      // Immediately disable map dragging when mouse enters a waypoint marker
      marker.on("mouseover", () => {
        map.dragging.disable();
      });

      marker.on("mouseout", () => {
        // Only re-enable if we're not currently dragging
        if (!(marker.options as any).isDragging) {
          map.dragging.enable();
        }
      });

      // Click to select
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);
        onWaypointSelect?.(isSelected ? null : wpIndex);
      });

      // Make marker draggable by handling mousedown + map mousemove
      marker.on("mousedown", (e) => {
        L.DomEvent.stopPropagation(e.originalEvent);
        L.DomEvent.preventDefault(e.originalEvent);

        // If not selected, select it first - user can drag on next interaction
        if (!isSelected) {
          onWaypointSelect?.(wpIndex);
          return;
        }

        // Start dragging
        (marker.options as any).isDragging = true;
        map.dragging.disable();

        const onMouseMove = (moveEvent: L.LeafletMouseEvent) => {
          if (!(marker.options as any).isDragging) return;
          const newLat = Math.floor(moveEvent.latlng.lat + 0.5) - 0.5;
          const newLng = Math.floor(moveEvent.latlng.lng + 0.5) - 0.5;
          marker.setLatLng([newLat + 0.5, newLng + 0.5]);
          label.setLatLng([newLat + 0.5, newLng + 0.5]);
          onWaypointDrag?.(wpIndex, { lat: newLat + 0.5, lng: newLng + 0.5 });
        };

        const onMouseUp = (upEvent: L.LeafletMouseEvent) => {
          if (!(marker.options as any).isDragging) return;
          (marker.options as any).isDragging = false;
          map.dragging.enable();
          map.off("mousemove", onMouseMove);
          map.off("mouseup", onMouseUp);
          document.removeEventListener("mouseup", onDocumentMouseUp);
          const finalLat = Math.floor(upEvent.latlng.lat + 0.5);
          const finalLng = Math.floor(upEvent.latlng.lng + 0.5);
          onWaypointDragEnd?.(wpIndex, { lat: finalLat, lng: finalLng });
        };

        // Also listen on document in case mouse leaves the map
        const onDocumentMouseUp = () => {
          if (!(marker.options as any).isDragging) return;
          (marker.options as any).isDragging = false;
          map.dragging.enable();
          map.off("mousemove", onMouseMove);
          map.off("mouseup", onMouseUp);
          document.removeEventListener("mouseup", onDocumentMouseUp);
        };

        map.on("mousemove", onMouseMove);
        map.on("mouseup", onMouseUp);
        document.addEventListener("mouseup", onDocumentMouseUp);
      });

      editLayer.addLayer(marker);
      editLayer.addLayer(label);
    });

    return () => {
      if (editLayerRef.current) {
        editLayerRef.current.clearLayers();
      }
    };
  }, [map, paths, currentStepIndex, editMode, selectedWaypointIndex, onWaypointSelect, onWaypointDrag, onWaypointDragEnd]);

  return null;
};

export const PathVisualizationLayer = React.memo(PathVisualizationLayerComponent);
