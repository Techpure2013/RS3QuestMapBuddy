// src/map/layers/PathVisualizationLayer.tsx
// Renders quest paths on the map

import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { QuestPath } from "../../state/types";

interface PathVisualizationLayerProps {
  paths: QuestPath[];
  currentStepIndex: number;
  currentFloor: number;
  showAllPaths?: boolean;
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
}) => {
  const map = useMap();
  const layerRef = useRef<L.LayerGroup | null>(null);

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

  return null;
};

export const PathVisualizationLayer = React.memo(PathVisualizationLayerComponent);
